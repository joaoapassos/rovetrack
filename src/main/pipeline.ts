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

export async function processAudioPipeline(payload: TrackPayload, onLog: (msg: string) => void): Promise<void> {
  const { url, outputDir } = payload;
  
  onLog('--------------------------------------------------')
  onLog(`[Expedição] Iniciada: ${url}`)
  onLog('--------------------------------------------------')

  try {
    onLog('[Etapa 0] Preparando acampamento base (Workspace)...')
    const workspaceDir = await prepareWorkspace()

    onLog('[Etapa 1] Baixando áudio(s) e metadados brutos...')
    await downloadRawFiles({ url, outputDir: workspaceDir }, onLog)

    onLog('\n[Etapa 2] Download concluído. Analisando arquivos no acampamento...')
    const files = await readdir(workspaceDir)
    
    // Filtramos os JSONs e aplicamos a VALIDAÇÃO CRUZADA: 
    // Só entra na fila se existir um arquivo .mp3 com o exato mesmo nome base.
    // Isso ignora automaticamente o JSON da própria Playlist ou downloads abortados.
    const jsonFiles = files.filter(f => {
      if (!f.startsWith('rovetrack_temp_') || !f.endsWith('.info.json')) return false;
      const baseName = f.replace('.info.json', '')
      return files.includes(`${baseName}.mp3`) // Só passa se o MP3 existir na pasta
    })
    
    if (jsonFiles.length === 0) throw new Error('Nenhum dado válido encontrado após o download.')

    onLog(`[Etapa 3] ${jsonFiles.length} faixa(s) detectada(s). Iniciando forja em lote...`)

    // LOOP DE PLAYLIST: Processa cada música individualmente
    for (let i = 0; i < jsonFiles.length; i++) {
      const jsonFile = jsonFiles[i]
      const baseName = jsonFile.replace('.info.json', '')
      const infoPath = join(workspaceDir, jsonFile)
      const mp3Path = join(workspaceDir, `${baseName}.mp3`)

      onLog(`\n--- [Faixa ${i + 1}/${jsonFiles.length}] ---`)
      
      const originalImage = await findCoverImage(workspaceDir, baseName, jsonFile)
      if (!originalImage) throw new Error(`Imagem não encontrada para a faixa ${i+1}.`)
      const imagePath = join(workspaceDir, originalImage)

      onLog(`  └─ Forjando a capa (recorte 1:1)...`)
      const coverPath = join(workspaceDir, `${baseName}_cover.jpg`)
      await formatCoverImage(imagePath, coverPath)

      onLog(`  └─ Injetando metadados (ID3 Tags)...`)
      const metadata = await extractMetadataFromJson(infoPath, coverPath)
      injectId3Tags(mp3Path, metadata)

      onLog(`  └─ Limpando e transferindo para destino final...`)
      const safeTitle = metadata.title.replace(/[\\/:*?"<>|]/g, '')
      const finalMp3Path = join(outputDir, `${safeTitle}.mp3`)

      await moveOrRenameFile(mp3Path, finalMp3Path)
      onLog(`  └─ Sucesso: ${safeTitle}.mp3`)
    }

    onLog('\n[Etapa 4] Desmobilizando o acampamento...')
    await cleanWorkspace()

    onLog('--------------------------------------------------')
    onLog(`[Expedição] Concluída com SUCESSO ABSOLUTO!`)
    onLog('--------------------------------------------------')

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    onLog(`\n[FALHA CRÍTICA] ${errorMsg}`)
    throw error
  }
}