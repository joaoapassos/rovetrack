import { join } from 'node:path'
import { injectId3Tags } from '@main/services/audio/'
import { downloadRawFiles } from '@main/services/downloader'
import { formatCoverImage } from '@main/services/image/'
import { extractMetadataFromJson } from '@main/services/metadata/'
import {
  cleanWorkspace,
  findCoverImage,
  findFileByPrefixAndSuffix,
  moveOrRenameFile,
  prepareWorkspace
} from '@main/utils'

export async function processAudioPipeline(url: string, outputDir: string): Promise<void> {
  console.log('\n--------------------------------------------------')
  console.log(`[RoveTrack] Iniciando expedição: ${url}`)
  console.log('--------------------------------------------------')

  try {
    // 0. Preparar o Acampamento Base
    console.log('[RoveTrack] Etapa 0/4: A preparar o acampamento base (Workspace temporário)...')
    const workspaceDir = await prepareWorkspace()

    // 1. Download Bruto (A apontar para o Workspace)
    console.log('[RoveTrack] Etapa 1/4: A extrair áudio e metadados brutos...')
    await downloadRawFiles({ url, outputDir: workspaceDir })

    // 2. Identificação de Ficheiros
    const jsonFile = await findFileByPrefixAndSuffix(workspaceDir, 'rovetrack_temp_', '.info.json')
    if (!jsonFile) throw new Error('Metadados JSON não encontrados no acampamento.')

    const baseName = jsonFile.replace('.info.json', '')
    const infoPath = join(workspaceDir, jsonFile)
    const mp3Path = join(workspaceDir, `${baseName}.mp3`)

    const originalImage = await findCoverImage(workspaceDir, baseName, jsonFile)
    if (!originalImage) throw new Error('Imagem de miniatura não encontrada.')
    const imagePath = join(workspaceDir, originalImage)

    // 3. Processamento da Capa
    console.log('[RoveTrack] Etapa 2/4: A forjar a capa (recorte 1:1)...')
    const coverPath = join(workspaceDir, `${baseName}_cover.jpg`)
    await formatCoverImage(imagePath, coverPath)

    // 4. Injeção de Metadados
    console.log('[RoveTrack] Etapa 3/4: A injetar metadados ID3...')
    const metadata = await extractMetadataFromJson(infoPath, coverPath)
    injectId3Tags(mp3Path, metadata)

    // 5. Organização do Acampamento (Entrega Final e Limpeza)
    console.log('[RoveTrack] Etapa 4/4: A entregar a carga e a desmobilizar o acampamento...')
    const safeTitle = metadata.title.replace(/[\\/:*?"<>|]/g, '')
    const finalMp3Path = join(outputDir, `${safeTitle}.mp3`)

    // Transporta APENAS a música polida do workspace para a pasta do utilizador
    await moveOrRenameFile(mp3Path, finalMp3Path)
    
    // Apaga a pasta temporária inteira de uma só vez
    await cleanWorkspace()

    console.log(`[RoveTrack] Sucesso absoluto! Faixa guardada em: ${finalMp3Path}`)
    console.log('--------------------------------------------------\n')
  } catch (error) {
    console.error('[RoveTrack] Falha crítica no pipeline:', error)
    // O lixo temporário continuará escondido no sistema e será apagado no próximo start (prepareWorkspace)
  }
}