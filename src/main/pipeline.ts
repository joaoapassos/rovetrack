import type { MediaDownloadRequest } from '@shared/contracts/media'
import type {
  PipelineReport,
  PipelineReportError,
  PipelineState,
  PipelineStatus
} from '@shared/contracts/pipeline'
import type { RunControl } from './control/contracts'
import { isRunInterruptedError } from './control/RunController'
import type { MediaProcessor } from './processors/contracts'
import type { ProviderResolver } from './providers/ProviderResolver'
import type { OutputStorage } from './services/storage/OutputStorage'

export interface PipelineDependencies {
  providerResolver: ProviderResolver
  mediaProcessor: MediaProcessor
  outputStorage: OutputStorage
  prepareWorkspace: (runId: string) => Promise<string>
  cleanWorkspace: (workspaceDirectory: string) => Promise<void>
}

export type MediaPipeline = (
  request: MediaDownloadRequest,
  runId: string,
  control: RunControl,
  onTelemetry: (state: PipelineState) => void
) => Promise<PipelineReport>

const emptyReport = (runId: string): PipelineReport => ({
  runId,
  total: 0,
  succeeded: 0,
  failed: 0,
  errors: [],
  tracks: []
})

function finalStatus(report: PipelineReport): PipelineStatus {
  if (report.succeeded > 0 && report.failed > 0) return 'partial'
  if (report.succeeded > 0) return 'success'
  return 'error'
}

export function createMediaPipeline(dependencies: PipelineDependencies): MediaPipeline {
  return async (request, runId, control, onTelemetry) => {
    const state: PipelineState = {
      runId,
      status: 'preparing',
      message: 'Iniciando expedição...',
      progress: 0,
      step: { current: 1, total: 4 },
      batch: { current: 1, total: 1 },
      report: emptyReport(runId)
    }
    let workspaceDirectory: string | undefined
    let failure: unknown
    let interrupted = false
    let cleanupSucceeded = true

    const updateState = (update: Partial<PipelineState>) => {
      Object.assign(state, update)
      onTelemetry({
        ...state,
        step: { ...state.step },
        batch: { ...state.batch },
        report: {
          ...state.report,
          errors: [...state.report.errors],
          tracks: [...state.report.tracks],
          ...(state.report.source && { source: { ...state.report.source } })
        }
      })
    }

    const unsubscribeControl = control.onStateChange((controlState) => {
      if (controlState === 'interrupted') {
        updateState({ message: 'A interromper a operação e limpar o workspace...' })
      }
    })

    updateState({ message: `[Expedição ${runId}] Iniciada: ${request.sourceUrl}` })

    try {
      updateState({ message: '[Etapa 1] A preparar workspace isolado...' })
      workspaceDirectory = await dependencies.prepareWorkspace(runId)
      await control.checkpoint()

      const provider = await dependencies.providerResolver.resolve(request)
      updateState({
        status: 'downloading',
        step: { current: 2, total: 4 },
        message: `[Etapa 2] A adquirir mídia com ${provider.id}...`
      })
      const download = await provider.download(request, {
        workspaceDirectory,
        updateTelemetry: updateState,
        control
      })
      const report: PipelineReport = {
        runId,
        total: download.total,
        succeeded: 0,
        failed: download.errors.length,
        errors: [...download.errors],
        tracks: download.errors.map((error) => ({
          trackId: error.trackId,
          title: error.title,
          status: 'error'
        }))
      }
      const firstAsset = download.assets[0]
      if (firstAsset) {
        report.source = {
          ...(download.total === 1 && { title: firstAsset.title }),
          ...(firstAsset.collection && { collectionTitle: firstAsset.collection })
        }
      }

      updateState({
        status: 'forging',
        step: { current: 3, total: 4 },
        progress: 0,
        report,
        message: 'Aquisição concluída. A processar mídia...'
      })

      for (let index = 0; index < download.assets.length; index += 1) {
        await control.checkpoint()
        const asset = download.assets[index]
        updateState({
          batch: { current: index + 1, total: Math.max(report.total, 1) },
          report,
          message: `A processar item ${index + 1} de ${download.assets.length}...`
        })

        try {
          if (!dependencies.mediaProcessor.supports(asset, request)) {
            throw new Error('Nenhum processador disponível suporta a mídia adquirida.')
          }
          const processed = await dependencies.mediaProcessor.process(asset, {
            workspaceDirectory,
            updateTelemetry: updateState,
            control
          })
          await control.checkpoint()
          updateState({ message: '  └─ A armazenar ficheiro final...' })
          await dependencies.outputStorage.store(processed, request)
          report.succeeded += 1
          report.tracks.push({ trackId: asset.sourceId, title: asset.title, status: 'success' })
          updateState({ metadata: { title: asset.title }, report })
        } catch (error) {
          if (isRunInterruptedError(error)) throw error
          const technicalDetails = error instanceof Error ? error.message : String(error)
          const reportError: PipelineReportError = {
            trackId: asset.sourceId,
            title: asset.title,
            reason: 'A mídia foi adquirida, mas não foi possível preparar o arquivo final.',
            category: 'postprocessing',
            suggestion:
              'Verifique a pasta de destino, as permissões e se o arquivo não está aberto noutro programa.',
            technicalDetails,
            retryable: true
          }
          report.failed += 1
          report.errors.push(reportError)
          report.tracks.push({ trackId: asset.sourceId, title: asset.title, status: 'error' })
          updateState({
            report,
            message: `[FALHA ISOLADA ${asset.sourceId}] Não foi possível finalizar o arquivo.`
          })
        }
      }

      const unaccounted = report.total - report.succeeded - report.failed
      for (let index = 0; index < unaccounted; index += 1) {
        const trackId = `item-desconhecido-${index + 1}`
        report.errors.push({
          trackId,
          reason: 'O provider ignorou este item sem devolver detalhes suficientes.',
          category: 'unknown',
          suggestion: 'Confirme se o conteúdo continua disponível na origem.',
          retryable: true
        })
        report.tracks.push({ trackId, status: 'error' })
        report.failed += 1
      }

      state.report = report
      updateState({
        step: { current: 4, total: 4 },
        report,
        message: '[Etapa 4] A limpar o workspace...'
      })
    } catch (error) {
      if (isRunInterruptedError(error)) interrupted = true
      else {
        failure = error
        const reason = error instanceof Error ? error.message : String(error)
        const report = state.report
        report.total = Math.max(report.total, 1)
        report.failed = Math.max(report.failed, 1)
        if (!report.errors.some((item) => item.trackId === 'pipeline')) {
          report.errors.push({
            trackId: 'pipeline',
            reason: 'O processamento foi interrompido por uma falha global.',
            category: 'configuration',
            suggestion: 'Verifique os detalhes técnicos, a conexão e a pasta de destino.',
            technicalDetails: reason,
            retryable: true
          })
          report.tracks.push({ trackId: 'pipeline', status: 'error' })
        }
      }
    } finally {
      if (workspaceDirectory) {
        try {
          await dependencies.cleanWorkspace(workspaceDirectory)
        } catch (cleanupError) {
          cleanupSucceeded = false
          console.warn('[pipeline] Não foi possível limpar o workspace:', cleanupError)
        }
      }
      unsubscribeControl()
    }

    if (interrupted) {
      updateState({
        status: 'interrupted',
        report: state.report,
        message: cleanupSucceeded
          ? 'Operação interrompida. O workspace temporário foi limpo.'
          : 'Operação interrompida, mas a limpeza do workspace temporário falhou.'
      })
      return state.report
    }

    if (failure) {
      const reason = failure instanceof Error ? failure.message : String(failure)
      updateState({
        status: 'error',
        report: state.report,
        message: `[FALHA CRÍTICA] ${reason}`
      })
      throw failure
    }

    const status = finalStatus(state.report)
    updateState({
      status,
      progress: status === 'error' ? state.progress : 100,
      report: state.report,
      message:
        status === 'success'
          ? 'Expedição concluída com sucesso.'
          : status === 'partial'
            ? `Expedição concluída com ${state.report.failed} falha(s) parcial(is).`
            : 'A expedição terminou sem itens concluídos.'
    })
    return state.report
  }
}
