import { join } from 'node:path'
import { readdir } from 'node:fs/promises'
import { injectId3Tags } from '@main/services/audio/'
import { downloadRawFiles } from '@main/services/downloader'
import { formatCoverImage } from '@main/services/image/'
import { extractMetadataFromJson } from '@main/services/metadata/'
import {
  cleanWorkspace,
  findCoverImage,
  moveOrRenameFile,
  prepareWorkspace
} from '@main/utils'

export async function processAudioPipeline(
  payload: TrackPayload, 
  onTelemetry: (state: PipelineState) => void
): Promise<void> {
  const { url, outputDir } = payload;
  
  const state: PipelineState = {
    status: 'preparing',
    message: 'Iniciando expedição...',
    progress: 0,
    step: { current: 1, total: 4 },
    batch: { current: 1, total: 1 }
  }

  const updateState = (update: Partial<PipelineState>) => {
    Object.assign(state, update)
    onTelemetry({ ...state })
  }

  updateState({ message: `[Expedição] Iniciada: ${url}` })

  try {
    updateState({ step: { current: 1, total: 4 }, message: '[Etapa 1] A preparar o acampamento base...' })
    const workspaceDir = await prepareWorkspace()

    updateState({ status: 'downloading', step: { current: 2, total: 4 }, message: '[Etapa 2] A descarregar áudio e metadados...' })
    await downloadRawFiles({ url, outputDir: workspaceDir }, updateState)

    updateState({ status: 'forging', step: { current: 3, total: 4 }, progress: 0, message: 'Download concluído. A analisar ficheiros...' })
    const files = await readdir(workspaceDir)
    
    const jsonFiles = files.filter(f => {
      if (!f.startsWith('rovetrack_temp_') || !f.endsWith('.info.json')) return false;
      const baseName = f.replace('.info.json', '')
      return files.includes(`${baseName}.mp3`)
    })
    
    if (jsonFiles.length === 0) throw new Error('Nenhum dado válido encontrado após o download.')

    for (let i = 0; i < jsonFiles.length; i++) {
      updateState({ batch: { current: i + 1, total: jsonFiles.length }, message: `A forjar faixa ${i + 1} de ${jsonFiles.length}...` })
      
      const jsonFile = jsonFiles[i]
      const baseName = jsonFile.replace('.info.json', '')
      const infoPath = join(workspaceDir, jsonFile)
      const mp3Path = join(workspaceDir, `${baseName}.mp3`)
      
      const originalImage = await findCoverImage(workspaceDir, baseName, jsonFile)
      if (!originalImage) throw new Error(`Imagem não encontrada para a faixa ${i+1}.`)
      const imagePath = join(workspaceDir, originalImage)

      updateState({ message: `  └─ A recortar a capa (1:1)...` })
      const coverPath = join(workspaceDir, `${baseName}_cover.jpg`)
      await formatCoverImage(imagePath, coverPath)

      updateState({ message: `  └─ A injetar metadados ID3...` })
      const metadata = await extractMetadataFromJson(infoPath, coverPath)
      injectId3Tags(mp3Path, metadata)

      updateState({ message: `  └─ A transferir ficheiro final...` })
      const safeTitle = metadata.title.replace(/[\\/:*?"<>|]/g, '')
      const finalMp3Path = join(outputDir, `${safeTitle}.mp3`)

      await moveOrRenameFile(mp3Path, finalMp3Path)
      updateState({ metadata: { title: safeTitle } })
    }

    updateState({ step: { current: 4, total: 4 }, message: '[Etapa 4] A desmobilizar o acampamento...' })
    await cleanWorkspace()

    updateState({ status: 'success', progress: 100, message: 'Expedição concluída com SUCESSO ABSOLUTO!' })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    updateState({ status: 'error', message: `[FALHA CRÍTICA] ${errorMsg}` })
    throw error
  }
}