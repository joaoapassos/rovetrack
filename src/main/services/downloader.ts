import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ytDlp from 'yt-dlp-exec'

export async function downloadRawFiles(config: TrackPayload): Promise<void> {
  if (!ffmpegPath) throw new Error('Binário do FFmpeg não encontrado.')

  const test = await ytDlp(config.url, {
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

  console.log(test)
  /**
    [youtube] Extracting URL: https://youtu.be/MehGiWKPwnk?si=r8Tb3JwLrbJhwz3v
    [youtube] MehGiWKPwnk: Downloading webpage
    [youtube] MehGiWKPwnk: Downloading android vr player API JSON
    [info] MehGiWKPwnk: Downloading 1 format(s): 251
    [info] Downloading video thumbnail 46 ...
    [info] Writing video thumbnail 46 to: C:\Users\joaoa\Downloads\RoveTrackTest\rovetrack_temp_MehGiWKPwnk.webp
    [info] Writing video metadata as JSON to: C:\Users\joaoa\Downloads\RoveTrackTest\rovetrack_temp_MehGiWKPwnk.info.json
    [download] Destination: C:\Users\joaoa\Downloads\RoveTrackTest\rovetrack_temp_MehGiWKPwnk.webm
    [download] 100% of    2.82MiB in 00:00:00 at 22.99MiB/s  
    [ExtractAudio] Destination: C:\Users\joaoa\Downloads\RoveTrackTest\rovetrack_temp_MehGiWKPwnk.mp3
    Deleting original file C:\Users\joaoa\Downloads\RoveTrackTest\rovetrack_temp_MehGiWKPwnk.webm (pass -k to keep)
   */
}