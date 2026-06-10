import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ytDlp from 'yt-dlp-exec'

export async function downloadRawFiles(config: PipelineConfig): Promise<void> {
  if (!ffmpegPath) throw new Error('Binário do FFmpeg não encontrado.')

  await ytDlp(config.url, {
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: 0,
    writeThumbnail: true,
    writeInfoJson: true,
    ffmpegLocation: ffmpegPath,
    output: join(config.outputDir, 'rovetrack_temp_%(id)s.%(ext)s'),
    noCheckCertificate: true,
    noWarnings: true,
    noPlaylist: true, // Trava de segurança para não processar a playlist inteira
  })
}