import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { injectId3Tags } from '@main/services/audio/'
import { downloadRawFiles } from '@main/services/downloader'
import { formatCoverImage } from '@main/services/image/'
import { extractMetadataFromJson } from '@main/services/metadata/'
import { cleanWorkspace, findCoverImage, moveOrRenameFile, prepareWorkspace } from '@main/utils'

const emptyReport = (): PipelineReport => ({
  total: 0,
  succeeded: 0,
  failed: 0,
  errors: [],
  tracks: []
})

export async function processAudioPipeline(
  payload: TrackPayload,
  onTelemetry: (state: PipelineState) => void
): Promise<PipelineReport> {
  const { url, outputDir } = payload

  const state: PipelineState = {
    status: 'preparing',
    message: 'Iniciando expedição...',
    progress: 0,
    step: { current: 1, total: 4 },
    batch: { current: 1, total: 1 },
    report: emptyReport()
  }

  const updateState = (update: Partial<PipelineState>) => {
    Object.assign(state, update)
    // Copiar também as estruturas aninhadas evita enviar referências mutáveis pelo IPC.
    onTelemetry({
      ...state,
      report: {
        ...state.report,
        errors: [...state.report.errors],
        tracks: [...state.report.tracks],
        ...(state.report.source && { source: { ...state.report.source } })
      }
    })
  }

  updateState({ message: `[Expedição] Iniciada: ${url}` })

  try {
    updateState({
      step: { current: 1, total: 4 },
      message: '[Etapa 1] A preparar o acampamento base...'
    })
    const workspaceDir = await prepareWorkspace()

    updateState({
      status: 'downloading',
      step: { current: 2, total: 4 },
      message: '[Etapa 2] A descarregar áudio e metadados...'
    })
    const downloadReport = await downloadRawFiles({ url, outputDir: workspaceDir }, updateState)

    const report: PipelineReport = {
      total: downloadReport.total,
      succeeded: 0,
      failed: downloadReport.errors.length,
      errors: [...downloadReport.errors],
      tracks: downloadReport.errors.map((error) => ({
        trackId: error.trackId,
        title: error.title,
        status: 'error'
      }))
    }

    updateState({
      status: 'forging',
      step: { current: 3, total: 4 },
      progress: 0,
      report,
      message: 'Download concluído. A analisar ficheiros...'
    })

    const files = await readdir(workspaceDir)
    const jsonFiles = files.filter((file) => {
      if (!file.startsWith('rovetrack_temp_') || !file.endsWith('.info.json')) return false
      const baseName = file.replace('.info.json', '')
      return files.includes(`${baseName}.mp3`)
    })

    // Se o yt-dlp não informou o tamanho da playlist, os artefactos são a melhor fonte.
    report.total = Math.max(report.total, jsonFiles.length + report.failed)

    for (let index = 0; index < jsonFiles.length; index++) {
      const jsonFile = jsonFiles[index]
      const baseName = jsonFile.replace('.info.json', '')
      const trackId = baseName.replace(/^rovetrack_temp_/, '')
      const infoPath = join(workspaceDir, jsonFile)
      const mp3Path = join(workspaceDir, `${baseName}.mp3`)
      let title: string | undefined

      updateState({
        batch: { current: index + 1, total: report.total },
        report,
        message: `A forjar faixa ${index + 1} de ${jsonFiles.length}...`
      })

      // Uma faixa inválida não impede que as restantes sejam processadas.
      try {
        const coverPath = join(workspaceDir, `${baseName}_cover.jpg`)
        const metadata = await extractMetadataFromJson(infoPath, coverPath)
        title = metadata.title
        report.source = {
          ...report.source,
          ...(report.total === 1 && { title: metadata.title }),
          ...(metadata.playlistTitle && { playlistTitle: metadata.playlistTitle })
        }

        const originalImage = await findCoverImage(workspaceDir, baseName, jsonFile)
        if (!originalImage) throw new Error('Imagem de capa não encontrada.')

        const imagePath = join(workspaceDir, originalImage)

        updateState({ message: '  └─ A recortar a capa (1:1)...' })
        await formatCoverImage(imagePath, coverPath)

        updateState({ message: '  └─ A injetar metadados ID3...' })
        injectId3Tags(mp3Path, metadata)

        updateState({ message: '  └─ A transferir ficheiro final...' })
        const safeTitle = metadata.title.replace(/[\\/:*?"<>|]/g, '')
        await moveOrRenameFile(mp3Path, join(outputDir, `${safeTitle}.mp3`))

        report.succeeded += 1
        report.tracks.push({ trackId, title: metadata.title, status: 'success' })
        updateState({ metadata: { title: safeTitle }, report })
      } catch (error) {
        const technicalDetails = error instanceof Error ? error.message : String(error)
        report.failed += 1
        report.errors.push({
          trackId,
          title,
          reason: 'A faixa foi descarregada, mas não foi possível preparar o ficheiro MP3 final.',
          category: 'postprocessing',
          suggestion:
            'Verifique se a pasta de destino permite escrita e se o ficheiro não está aberto noutro programa.',
          technicalDetails,
          retryable: true
        })
        report.tracks.push({ trackId, title, status: 'error' })
        updateState({
          report,
          message: `[FALHA ISOLADA ${trackId}] Não foi possível finalizar o MP3; continuando...`
        })
      }
    }

    // Reconcilia itens saltados mesmo que uma versão do yt-dlp não imprima uma linha ERROR analisável.
    const unaccounted = report.total - report.succeeded - report.failed
    for (let index = 0; index < unaccounted; index++) {
      report.errors.push({
        trackId: `item-desconhecido-${index + 1}`,
        reason: 'O yt-dlp ignorou esta faixa sem devolver detalhes suficientes.',
        category: 'unknown',
        suggestion:
          'A faixa pode estar privada, removida ou temporariamente bloqueada. Confirme o link no navegador.',
        retryable: true
      })
      report.tracks.push({
        trackId: `item-desconhecido-${index + 1}`,
        status: 'error'
      })
      report.failed += 1
    }

    updateState({
      step: { current: 4, total: 4 },
      report,
      message: '[Etapa 4] A desmobilizar o acampamento...'
    })
    await cleanWorkspace()

    const hasFailures = report.failed > 0
    updateState({
      status: hasFailures ? 'error' : 'success',
      progress: 100,
      report,
      message: hasFailures
        ? `Expedição concluída com ${report.failed} faixa(s) falhada(s).`
        : 'Expedição concluída com sucesso.'
    })
    return report
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    const report = {
      ...state.report,
      errors: [...state.report.errors],
      tracks: [...state.report.tracks]
    }

    if (report.errors.length === 0) {
      report.total = Math.max(report.total, 1)
      report.failed = Math.max(report.failed, 1)
      report.errors.push({
        trackId: state.metadata?.title ?? 'pipeline',
        reason: 'O processamento foi interrompido por uma falha global.',
        category: 'configuration',
        suggestion:
          'Verifique os detalhes técnicos, a conexão, a pasta de destino e a instalação do yt-dlp/FFmpeg.',
        technicalDetails: reason,
        retryable: true
      })
      report.tracks.push({
        trackId: state.metadata?.title ?? 'pipeline',
        title: state.metadata?.title,
        status: 'error'
      })
    }

    updateState({
      status: 'error',
      report,
      message: `[FALHA CRÍTICA] ${reason}`
    })
    throw error
  }
}
