import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import {exec} from 'yt-dlp-exec'

/**
 * Orquestra o download bruto do YouTube utilizando um subprocesso isolado.
 * Implementa telemetria em tempo real via stdout e um sistema de timeout crítico
 * para evitar congelamentos (hangs) em caso de falha severa de rede.
 *
 * @param config Objeto contendo a URL de origem e o diretório (Workspace temporário) de destino.
 * @returns Uma Promise que é resolvida apenas quando o subprocesso finaliza com código 0 (sucesso).
 * @throws {Error} Se o binário do FFmpeg não for encontrado, se houver timeout ou se o processo falhar.
 */
export async function downloadRawFiles(config: TrackPayload): Promise<void> {
  if (!ffmpegPath) throw new Error('Binário do FFmpeg não encontrado no sistema.')

  return new Promise((resolve, reject) => {
    console.log('[RoveTrack] Iniciando extração do subprocesso yt-dlp...')

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
      noPlaylist: true // Trava de segurança mantida
    })

    // --- SISTEMA DE SEGURANÇA (TIMEOUT) ---
    let timeout: NodeJS.Timeout

    const resetTimeout = () => {
      clearTimeout(timeout)
      // Se passar 3 minutos sem NENHUMA comunicação de rede, matamos o processo
      timeout = setTimeout(() => {
        subprocess.kill('SIGKILL')
        reject(new Error('[downloader.downloadRawFiles] Timeout Crítico: O download bloqueou ou a rede falhou.'))
      }, 3 * 60 * 1000)
    }

    resetTimeout()

    // --- TELEMETRIA EM TEMPO REAL ---
    
    // Ouvindo a saída padrão de dados
    subprocess.stdout?.on('data', (data: Buffer) => {
      resetTimeout() // A rede está viva, reseta o tempo
      const message = data.toString().trim()
      
      // Filtramos apenas as mensagens vitais de progresso para não inundar o terminal
      if (message.includes('[download]') && message.includes('%')) {
        // Exemplo: [download]  15.3% of 5.00MiB at 1.50MiB/s
        console.log(`  └─ Progress: ${message.replace('[download]', '').trim()}`)
      } else if (message.includes('[ExtractAudio]')) {
        console.log('  └─ Extraindo áudio (FFmpeg em ação)...')
      }
    })

    // Ouvindo os erros do YouTube (ex: Vídeo privado, Restrição de idade)
    subprocess.stderr?.on('data', (data: Buffer) => {
      resetTimeout()
      const errorMsg = data.toString().trim()
      console.warn(`[downloader.downloadRawFiles] [yt-dlp AVISO]: ${errorMsg}`)
    })

    // --- CONTROLE DE CICLO DE VIDA ---
    subprocess.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve() // Sucesso absoluto
      } else {
        reject(new Error(`[downloader.downloadRawFiles] O motor yt-dlp abortou com código de saída: ${code}`))
      }
    })

    subprocess.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}