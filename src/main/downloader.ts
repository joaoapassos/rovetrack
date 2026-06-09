import { 
  readdirSync, 
  readFileSync, 
  renameSync, 
  rmSync,
} from 'node:fs'
import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ytDlp from 'yt-dlp-exec'
import { tagMp3 } from './audio-tagger'
import { createSquareCover } from './image-processor'

export async function processAudioPipeline(url: string, outputDir: string): Promise<void> {
  if (!ffmpegPath) throw new Error('Binário do FFmpeg não encontrado.')

  console.log('--------------------------------------------------')
  console.log(`[RoveTrack] Iniciando forja completa: ${url}`)
  console.log('--------------------------------------------------')

  try {
    // Passo 1: Download Bruto (Arquivos Temporários)
    await ytDlp(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      writeThumbnail: true,
      writeInfoJson: true,
      ffmpegLocation: ffmpegPath,
      output: join(outputDir, 'rovetrack_temp_%(id)s.%(ext)s'),
      noCheckCertificate: true,
      noWarnings: true,
      noPlaylist: true, // Trava de segurança para nao baixar playlist de uma vez por enquanto
    })

    // Passo 2: Rastrear os arquivos gerados na pasta
    const files = readdirSync(outputDir)
    const jsonFile = files.find(f => f.startsWith('rovetrack_temp_') && f.endsWith('.info.json'))

    if (!jsonFile) throw new Error('Metadados JSON não encontrados.')

    const baseName = jsonFile.replace('.info.json', '')
    const infoPath = join(outputDir, jsonFile)
    const mp3Path = join(outputDir, `${baseName}.mp3`)

    // O yt-dlp pode salvar a imagem em .webp ou .jpg. Pegamos a extensão que vier.
    const originalImage = files.find(f => f.startsWith(baseName) && f !== jsonFile && !f.endsWith('.mp3'))
    if (!originalImage) throw new Error('Imagem de miniatura não encontrada.')
    
    const imagePath = join(outputDir, originalImage)

    // Extrair os dados do JSON
    const infoData = JSON.parse(readFileSync(infoPath, 'utf-8'))
    const title = infoData.title || 'Título Desconhecido'
    const artist = infoData.uploader || 'Artista Desconhecido'

    // Passo 3: Processamento da Capa
    console.log('[RoveTrack] Recortando e formatando a capa (1:1)...')
    const coverPath = join(outputDir, `${baseName}_cover.jpg`)
    await createSquareCover(imagePath, coverPath)

    // Passo 4: Estampar Metadados no MP3
    console.log('[RoveTrack] Injetando metadados ID3...')
    tagMp3(mp3Path, { title, artist, coverImagePath: coverPath })

    // Passo 5: Renomear para o formato limpo e organizar o acampamento
    console.log('[RoveTrack] Finalizando e limpando arquivos temporários...')
    
    // Remove caracteres inválidos para salvar o arquivo em qualquer OS
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '') 
    const finalMp3Path = join(outputDir, `${safeTitle}.mp3`)

    renameSync(mp3Path, finalMp3Path)

    // Configuração de insistência para evitar erro EBUSY no Windows
    const cleanOptions = { force: true, maxRetries: 5, retryDelay: 200 }

    // Destruir rastros temporários com retry
    rmSync(infoPath, cleanOptions)
    rmSync(imagePath, cleanOptions)
    rmSync(coverPath, cleanOptions)

    console.log(`[RoveTrack] Sucesso absoluto! Faixa salva como: ${safeTitle}.mp3`)
    console.log('--------------------------------------------------')

  } catch (error) {
    console.error('[RoveTrack] Falha crítica no pipeline:', error)
  }
}