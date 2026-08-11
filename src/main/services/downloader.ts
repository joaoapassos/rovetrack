import { join } from 'node:path'
import { app } from 'electron'
import ffmpegStatic from 'ffmpeg-static'
import { create } from 'yt-dlp-exec'

export interface DownloadReport {
  total: number
  errors: PipelineReportError[]
}

/** Remove o prefixo técnico sem apagar a mensagem útil devolvida pelo yt-dlp. */
function normaliseYtDlpError(line: string): string {
  return line.replace(/^ERROR:\s*/i, '').trim()
}

/** Tenta obter o ID a partir de mensagens como "[youtube] dQw4w9WgXcQ: ...". */
function extractVideoId(line: string): string | undefined {
  return line.match(/\[(?:youtube|youtu\.be)\]\s+([\w-]{6,}):/i)?.[1]
}

/**
 * Descarrega os ficheiros brutos e devolve as falhas não fatais que o
 * `--ignore-errors` permite ao yt-dlp ultrapassar.
 */
export async function downloadRawFiles(
  config: TrackPayload,
  updateTelemetry: (update: Partial<PipelineState>) => void
): Promise<DownloadReport> {
  let ffmpegPath = ffmpegStatic
  const ytDlpBinaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  let ytDlpPath = join(app.getAppPath(), 'node_modules', 'yt-dlp-exec', 'bin', ytDlpBinaryName)

  if (app.isPackaged) {
    if (ffmpegPath) ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
    ytDlpPath = ytDlpPath.replace('app.asar', 'app.asar.unpacked')
  }

  if (!ffmpegPath) throw new Error('Binário do FFmpeg não encontrado no sistema.')

  const customYtDlp = create(ytDlpPath)

  return new Promise((resolve, reject) => {
    updateTelemetry({ message: '[RoveTrack] Iniciando motor yt-dlp em segundo plano...' })

    const subprocess = customYtDlp.exec(config.url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      writeThumbnail: true,
      writeInfoJson: true,
      ffmpegLocation: ffmpegPath,
      output: join(config.outputDir, 'rovetrack_temp_%(id)s.%(ext)s'),
      noCheckCertificate: true,
      noWarnings: true,
      newline: true,
      noColor: true,
      ignoreErrors: true
    })

    let timeout: NodeJS.Timeout
    let currentItem = 1
    let currentVideoId: string | undefined
    let total = 1
    let stderrBuffer = ''
    const errorsByTrack = new Map<string, PipelineReportError>()

    const resetTimeout = () => {
      clearTimeout(timeout)
      timeout = setTimeout(
        () => {
          subprocess.kill('SIGKILL')
          reject(new Error('[downloader] Timeout crítico: a rede deixou de responder.'))
        },
        3 * 60 * 1000
      )
    }

    /** Guarda apenas linhas ERROR; avisos do ffmpeg não contam como faixas falhadas. */
    const captureErrorLine = (line: string) => {
      if (!/^ERROR:/i.test(line.trim())) return

      const reason = normaliseYtDlpError(line.trim())
      const parsedId = extractVideoId(reason)
      const trackId = parsedId ?? currentVideoId ?? `item-${currentItem}`

      errorsByTrack.set(trackId, { trackId, reason })
      updateTelemetry({ message: `[FALHA NA FAIXA ${currentItem}] ${reason}` })
    }

    const flushStderr = () => {
      if (stderrBuffer.trim()) captureErrorLine(stderrBuffer)
      stderrBuffer = ''
    }

    resetTimeout()

    subprocess.stdout?.on('data', (data: Buffer) => {
      resetTimeout()
      const message = data.toString().trim()
      console.log(message)

      currentVideoId = extractVideoId(message) ?? currentVideoId
      const progressMatch = message.match(/\[download\]\s+([\d.]+)%/)
      const batchMatch = message.match(/Downloading item (\d+) of (\d+)/)

      if (batchMatch) {
        currentItem = Number.parseInt(batchMatch[1], 10)
        total = Number.parseInt(batchMatch[2], 10)
        currentVideoId = undefined
      }

      if (progressMatch || batchMatch) {
        updateTelemetry({
          message: `  └─ ${message.replace(/\[download\]|\[youtube:tab\]/, '').trim()}`,
          ...(progressMatch && { progress: Number.parseFloat(progressMatch[1]) }),
          ...(batchMatch && { batch: { current: currentItem, total } })
        })
      } else if (message.includes('[ExtractAudio]')) {
        updateTelemetry({ message: '  └─ Extraindo áudio (FFmpeg em ação)...' })
      }
    })

    subprocess.stderr?.on('data', (data: Buffer) => {
      resetTimeout()
      stderrBuffer += data.toString()
      const lines = stderrBuffer.split(/\r?\n/)
      stderrBuffer = lines.pop() ?? ''

      for (const line of lines) {
        console.warn(`[yt-dlp]: ${line}`)
        captureErrorLine(line)
      }
    })

    subprocess.on('close', (code) => {
      clearTimeout(timeout)
      flushStderr()

      // O código 1 é esperado quando --ignore-errors salta itens de uma playlist.
      if (code === 0 || code === 1) {
        resolve({ total, errors: [...errorsByTrack.values()] })
        return
      }

      reject(new Error(`O motor yt-dlp abortou com código de saída: ${code}`))
    })

    subprocess.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}
