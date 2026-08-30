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

interface InterpretedError {
  reason: string
  category: NonNullable<PipelineReportError['category']>
  suggestion: string
  retryable: boolean
}

/** Converte as mensagens mais frequentes do yt-dlp em diagnósticos acionáveis. */
function interpretYtDlpError(rawReason: string): InterpretedError {
  const reason = rawReason.toLowerCase()

  if (/http error 403|forbidden|po token/.test(reason)) {
    return {
      reason: 'O YouTube recusou o acesso ao ficheiro de áudio desta faixa (HTTP 403).',
      category: 'access',
      suggestion:
        'A playlist continuará. Se a tentativa individual também falhar, atualize o yt-dlp e tente novamente; restrições mais fortes do YouTube podem exigir um provedor automático de PO Token.',
      retryable: true
    }
  }

  if (/sign in|login required|confirm your age|age.restrict|cookies/.test(reason)) {
    return {
      reason: 'Esta faixa exige autenticação ou confirmação de idade no YouTube.',
      category: 'authentication',
      suggestion:
        'Abra o vídeo no navegador para confirmar a restrição. O RoveTrack ainda não importa cookies da sua conta; as outras faixas continuarão normalmente.',
      retryable: false
    }
  }

  if (/private video|members.only|premium|not available|unavailable|removed/.test(reason)) {
    return {
      reason: 'Esta faixa está privada, removida ou indisponível para a sua região/conta.',
      category: 'availability',
      suggestion:
        'Confirme se o vídeo abre normalmente no navegador. Esta faixa será ignorada e o restante da playlist continuará.',
      retryable: false
    }
  }

  if (/http error 429|too many requests|rate.?limit/.test(reason)) {
    return {
      reason: 'O YouTube limitou temporariamente a quantidade de pedidos desta conexão (HTTP 429).',
      category: 'network',
      suggestion:
        'Aguarde alguns minutos antes de repetir. Evite iniciar várias playlists ao mesmo tempo.',
      retryable: true
    }
  }

  if (/timed? out|timeout|connection|network|temporary failure|remote end closed/.test(reason)) {
    return {
      reason: 'A ligação foi interrompida durante o download desta faixa.',
      category: 'network',
      suggestion:
        'Verifique a conexão e tente novamente. As faixas já descarregadas serão processadas normalmente.',
      retryable: true
    }
  }

  if (/requested format|no video formats|only images/.test(reason)) {
    return {
      reason: 'O YouTube não disponibilizou um formato de áudio compatível para esta faixa.',
      category: 'availability',
      suggestion:
        'Atualize o yt-dlp e tente novamente. Se apenas esta faixa falhar, ela pode ter restrições específicas.',
      retryable: true
    }
  }

  return {
    reason: 'O yt-dlp não conseguiu descarregar esta faixa.',
    category: 'unknown',
    suggestion:
      'Consulte os detalhes técnicos abaixo. A falha foi isolada e não interromperá as outras faixas.',
    retryable: true
  }
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

  // O wrapper ainda publica tipos antigos, embora encaminhe qualquer opção válida para o yt-dlp atual.
  type CurrentYtDlpFlags = NonNullable<Parameters<typeof customYtDlp.exec>[1]> & {
    extractorArgs: string
    fileAccessRetries: number
    fragmentRetries: number
  }

  const ytDlpFlags: CurrentYtDlpFlags = {
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: 0,
    writeThumbnail: true,
    writeInfoJson: true,
    ffmpegLocation: ffmpegPath,
    output: join(config.outputDir, 'rovetrack_temp_%(id)s.%(ext)s'),
    newline: true,
    noColor: true,
    ignoreErrors: true,
    abortOnError: false,
    skipUnavailableFragments: true,
    retries: 10,
    fragmentRetries: 10,
    fileAccessRetries: 5,
    socketTimeout: 30,
    extractorArgs: 'youtube:player_client=default,-android_vr'
  }

  return new Promise((resolve, reject) => {
    updateTelemetry({ message: '[RoveTrack] Iniciando motor yt-dlp em segundo plano...' })

    const subprocess = customYtDlp.exec(config.url, ytDlpFlags)

    let timeout: NodeJS.Timeout
    let currentItem = 1
    let currentVideoId: string | undefined
    let total = 1
    let stderrBuffer = ''
    const errorsByTrack = new Map<string, PipelineReportError>()
    const warningsByTrack = new Map<string, string[]>()

    const currentTrackKey = () => currentVideoId ?? `item-${currentItem}`

    const addWarning = (line: string) => {
      if (!/^WARNING:/i.test(line.trim())) return

      const warning = line.replace(/^WARNING:\s*/i, '').trim()
      const parsedId = extractVideoId(warning)
      const trackId = parsedId ?? currentTrackKey()
      const warnings = warningsByTrack.get(trackId) ?? []
      if (!warnings.includes(warning)) warnings.push(warning)
      warningsByTrack.set(trackId, warnings)

      if (/po token/i.test(warning)) {
        updateTelemetry({
          message:
            `[AVISO NA FAIXA ${currentItem}] O YouTube limitou alguns formatos por falta de ` +
            'PO Token; o motor tentará alternativas e continuará a playlist.'
        })
      } else if (/sign in|age.restrict|cookies|not available|unavailable/i.test(warning)) {
        updateTelemetry({
          message: `[AVISO NA FAIXA ${currentItem}] ${warning}`
        })
      }
    }

    const storeError = (trackId: string, technicalReason: string) => {
      const interpreted = interpretYtDlpError(technicalReason)
      const relatedWarnings = warningsByTrack.get(trackId) ?? warningsByTrack.get(currentTrackKey())
      const technicalDetails = [...(relatedWarnings ?? []), technicalReason]
        .filter((detail, index, details) => details.indexOf(detail) === index)
        .join('\n')
      const previous = errorsByTrack.get(trackId)

      errorsByTrack.set(trackId, {
        trackId,
        reason: previous && previous.category !== 'unknown' ? previous.reason : interpreted.reason,
        category:
          previous && previous.category !== 'unknown' ? previous.category : interpreted.category,
        suggestion: previous?.suggestion ?? interpreted.suggestion,
        retryable: previous?.retryable ?? interpreted.retryable,
        technicalDetails: [previous?.technicalDetails, technicalDetails]
          .filter(Boolean)
          .filter((detail, index, details) => details.indexOf(detail) === index)
          .join('\n')
      })

      updateTelemetry({
        message:
          `[FALHA ISOLADA ${currentItem}/${total}] ${interpreted.reason} ` +
          'Continuando com as próximas faixas...'
      })
    }

    const resetTimeout = () => {
      clearTimeout(timeout)
      timeout = setTimeout(
        () => {
          storeError(
            currentTrackKey(),
            'Timeout: o yt-dlp não recebeu dados durante três minutos e a faixa foi interrompida.'
          )
          subprocess.kill('SIGKILL')
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
      storeError(trackId, reason)
    }

    const flushStderr = () => {
      if (stderrBuffer.trim()) {
        addWarning(stderrBuffer)
        captureErrorLine(stderrBuffer)
      }
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
        addWarning(line)
        captureErrorLine(line)
      }
    })

    subprocess.on('close', (code) => {
      clearTimeout(timeout)
      flushStderr()

      // Falhas conhecidas por faixa são não fatais: os artefactos válidos ainda serão processados.
      if (code === 0 || code === 1 || errorsByTrack.size > 0) {
        if (code !== 0 && errorsByTrack.size === 0) {
          storeError('pipeline', `O yt-dlp encerrou com o código ${code ?? 'desconhecido'}.`)
        }
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
