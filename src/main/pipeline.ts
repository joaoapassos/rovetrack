import { join } from 'node:path'
import { injectId3Tags } from '@main/services/audio/'
import { downloadRawFiles } from '@main/services/downloader'
import { formatCoverImage } from '@main/services/image/'
import { extractMetadataFromJson } from '@main/services/metadata/'
import {
  cleanUpTempFiles,
  findCoverImage,
  findFileByPrefixAndSuffix,
  moveOrRenameFile
} from '@main/utils'

export async function processAudioPipeline(url: string, outputDir: string): Promise<void> {
  console.log('\n--------------------------------------------------')
  console.log(`[RoveTrack] Iniciando expedição: ${url}`)
  console.log('--------------------------------------------------')

  try {
    // 1. Download Bruto
    console.log('[RoveTrack] Etapa 1/4: A extrair áudio e metadados brutos...')
    await downloadRawFiles({ url, outputDir })

    // 2. Identificação de Ficheiros
    const jsonFile = await findFileByPrefixAndSuffix(outputDir, 'rovetrack_temp_', '.info.json')
    if (!jsonFile) throw new Error('Metadados JSON não encontrados na pasta de destino.')

    const baseName = jsonFile.replace('.info.json', '')
    const infoPath = join(outputDir, jsonFile)
    const mp3Path = join(outputDir, `${baseName}.mp3`)

    const originalImage = await findCoverImage(outputDir, baseName, jsonFile)
    if (!originalImage) throw new Error('Imagem de miniatura não encontrada.')
    const imagePath = join(outputDir, originalImage)

    // 3. Processamento da Capa
    console.log('[RoveTrack] Etapa 2/4: A forjar a capa (recorte 1:1)...')
    const coverPath = join(outputDir, `${baseName}_cover.jpg`)
    await formatCoverImage(imagePath, coverPath)

    // 4. Injeção de Metadados
    console.log('[RoveTrack] Etapa 3/4: A injetar metadados ID3...')
    const metadata = await extractMetadataFromJson(infoPath, coverPath)
    injectId3Tags(mp3Path, metadata)

    // 5. Organização do Acampamento (Limpeza)
    console.log('[RoveTrack] Etapa 4/4: A finalizar montagem e a limpar ficheiros temporários...')
    const safeTitle = metadata.title.replace(/[\\/:*?"<>|]/g, '')
    const finalMp3Path = join(outputDir, `${safeTitle}.mp3`)

    await moveOrRenameFile(mp3Path, finalMp3Path)
    await cleanUpTempFiles([infoPath, imagePath, coverPath])

    console.log(`[RoveTrack] Sucesso absoluto! Faixa guardada como: ${safeTitle}.mp3`)
    console.log('--------------------------------------------------\n')
  } catch (error) {
    console.error('[RoveTrack] Falha crítica no pipeline:', error)
  }
}