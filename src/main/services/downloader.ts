import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { exec } from 'yt-dlp-exec'


/**
 * Orquestra o download bruto do YouTube utilizando um subprocesso isolado.
 * Implementa telemetria em tempo real via stdout e um sistema de timeout crítico
 * para evitar congelamentos (hangs) em caso de falha severa de rede.
 *
 * @param config Objeto contendo a URL de origem e o diretório (Workspace temporário) de destino.
 * @returns Uma Promise que é resolvida apenas quando o subprocesso finaliza com código 0 (sucesso).
 * @throws {Error} Se o binário do FFmpeg não for encontrado, se houver timeout ou se o processo falhar.
 */
export async function downloadRawFiles(
  config: TrackPayload, 
  updateTelemetry: (update: Partial<PipelineState>) => void
): Promise<void> {
  if (!ffmpegPath) throw new Error('Binário do FFmpeg não encontrado no sistema.')

  return new Promise((resolve, reject) => {
    updateTelemetry({ message: '[RoveTrack] Iniciando motor yt-dlp em segundo plano...' })

    const subprocess = exec(config.url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      writeThumbnail: true,
      writeInfoJson: true,
      ffmpegLocation: ffmpegPath ?? "",
      output: join(config.outputDir, 'rovetrack_temp_%(id)s.%(ext)s'),
      noCheckCertificate: true,
      noWarnings: true,
      newline: true,
      noColor: true,
    })
    
    let timeout: NodeJS.Timeout

    const resetTimeout = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        subprocess.kill('SIGKILL')
        reject(new Error('[downloader] Timeout Crítico: A rede falhou.'))
      }, 3 * 60 * 1000)
    }

    resetTimeout()
    
    subprocess.stdout?.on('data', (data: Buffer) => {
      resetTimeout() 
      const message = data.toString().trim()
      console.log(message)
      
      let progress: number | undefined
      let batch: { current: number, total: number } | undefined

      // Capturar percentagem de download
      const progressMatch = message.match(/\[download\]\s+([\d\.]+)%/)
      if (progressMatch) {
        progress = parseFloat(progressMatch[1])
      }

      // Capturar índice da playlist
      const batchMatch = message.match(/Downloading item (\d+) of (\d+)/)
      if (batchMatch) {
        batch = { current: parseInt(batchMatch[1]), total: parseInt(batchMatch[2]) }
      }

      if (progressMatch || batchMatch) {
        updateTelemetry({
          message: `  └─ ${message.replace(/\[download\]|\[youtube:tab\]/, '').trim()}`,
          ...(progress !== undefined && { progress }),
          ...(batch !== undefined && { batch })
        })
      } else if (message.includes('[ExtractAudio]')) {
        updateTelemetry({ message: '  └─ Extraindo áudio (FFmpeg em ação)...' })
      }
    })

    subprocess.stderr?.on('data', (data: Buffer) => {
      resetTimeout()
      console.warn(`[yt-dlp AVISO]: ${data.toString().trim()}`)
    })

    subprocess.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve() 
      else reject(new Error(`O motor yt-dlp abortou com código de saída: ${code}`))
    })

    subprocess.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}