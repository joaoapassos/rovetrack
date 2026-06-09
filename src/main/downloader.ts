import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ytDlp from 'yt-dlp-exec'

export async function downloadAudioBruto(url: string, outputDir: string): Promise<void> {
  // Garantia de segurança para o TypeScript
  if (!ffmpegPath) {
    throw new Error('Binário do FFmpeg não encontrado no sistema.')
  }

  console.log('--------------------------------------------------')
  console.log(`[RoveTrack] Iniciando extração: ${url}`)
  console.log(`[RoveTrack] Destino: ${outputDir}`)
  console.log('--------------------------------------------------')

  try {
    await ytDlp(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0, // '0' é a melhor qualidade possível (VBR)
      ffmpegLocation: ffmpegPath,
      output: join(outputDir, '%(title)s.%(ext)s'),
      noCheckCertificate: true, // Evita problemas com redes corporativas/públicas
      noWarnings: true
    })

    console.log('[RoveTrack] Sucesso! Arquivo MP3 gerado na qualidade máxima.')
  } catch (error) {
    console.error('[RoveTrack] Falha crítica durante o download:', error)
  }
}