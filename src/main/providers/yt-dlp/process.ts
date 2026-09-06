import { join } from 'node:path'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { PipelineReportError } from '@shared/contracts/pipeline'
import { app } from 'electron'
import ffmpegStatic from 'ffmpeg-static'
import { create } from 'yt-dlp-exec'
import { RunInterruptedError } from '../../control/RunController'
import type { DownloadContext } from '../contracts'
import {
  classifyYtDlpError,
  extractVideoId,
  LineBuffer,
  normaliseYtDlpError,
  parsePlaylistPosition,
  parseProgress,
  parseWarning
} from './parser'
import { terminateProcessTree } from './processTree'

export interface YtDlpRunResult {
  total: number
  errors: PipelineReportError[]
}

export type YtDlpRunner = (
  request: MediaDownloadRequest,
  context: DownloadContext
) => Promise<YtDlpRunResult>

const audioQuality = { best: 0, high: 2, medium: 5, low: 9 } as const
const videoHeight = { best: undefined, high: 1080, medium: 720, low: 480 } as const

export function buildYtDlpMediaFlags(request: MediaDownloadRequest): Record<string, unknown> {
  if (request.mediaType === 'audio') {
    return {
      extractAudio: true,
      audioFormat: request.outputFormat,
      audioQuality: audioQuality[request.quality],
      embedMetadata: true,
      writeThumbnail: request.thumbnail.enabled,
      embedThumbnail: request.thumbnail.enabled && request.outputFormat !== 'mp3'
    }
  }
  const height = videoHeight[request.quality]
  const heightFilter = height ? `[height<=${height}]` : ''
  return {
    format: `bestvideo${heightFilter}+bestaudio/best${heightFilter}/best`,
    mergeOutputFormat: request.outputFormat,
    recodeVideo: request.outputFormat,
    embedMetadata: true,
    writeThumbnail: request.thumbnail.enabled
  }
}

function resolveBinaries(): { ffmpegPath: string; ytDlpPath: string } {
  let ffmpegPath = ffmpegStatic
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  let ytDlpPath = join(app.getAppPath(), 'node_modules', 'yt-dlp-exec', 'bin', binaryName)

  if (app.isPackaged) {
    if (ffmpegPath) ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
    ytDlpPath = ytDlpPath.replace('app.asar', 'app.asar.unpacked')
  }

  if (!ffmpegPath) throw new Error('Binário do FFmpeg não encontrado no sistema.')
  return { ffmpegPath, ytDlpPath }
}

export const runYtDlp: YtDlpRunner = (request, context) => {
  const { ffmpegPath, ytDlpPath } = resolveBinaries()
  const customYtDlp = create(ytDlpPath)
  type CurrentFlags = NonNullable<Parameters<typeof customYtDlp.exec>[1]> & {
    extractorArgs: string
    fileAccessRetries: number
    fragmentRetries: number
  }
  const flags: CurrentFlags = {
    ...buildYtDlpMediaFlags(request),
    writeInfoJson: true,
    ffmpegLocation: ffmpegPath,
    output: join(context.workspaceDirectory, 'rovetrack_temp_%(id)s.%(ext)s'),
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
    context.updateTelemetry({ message: '[RoveTrack] Iniciando provider yt-dlp...' })
    const subprocess = customYtDlp.exec(request.sourceUrl, flags, {
      detached: process.platform !== 'win32'
    })
    const stdoutBuffer = new LineBuffer()
    const stderrBuffer = new LineBuffer()
    const errorsByTrack = new Map<string, PipelineReportError>()
    const warningsByTrack = new Map<string, string[]>()
    let timeout: NodeJS.Timeout | undefined
    let currentItem = 1
    let currentVideoId: string | undefined
    let total = 1
    let timedOut = false
    let interrupted = false
    let settled = false
    let unsubscribeControl = () => {}

    const currentTrackKey = () => currentVideoId ?? `item-${currentItem}`

    const storeError = (trackId: string, technicalReason: string) => {
      const interpreted = classifyYtDlpError(technicalReason)
      const warnings = warningsByTrack.get(trackId) ?? warningsByTrack.get(currentTrackKey()) ?? []
      const previous = errorsByTrack.get(trackId)
      const technicalDetails = [...warnings, previous?.technicalDetails, technicalReason]
        .filter((detail): detail is string => Boolean(detail))
        .filter((detail, index, details) => details.indexOf(detail) === index)
        .join('\n')

      errorsByTrack.set(trackId, {
        trackId,
        reason: previous && previous.category !== 'unknown' ? previous.reason : interpreted.reason,
        category:
          previous && previous.category !== 'unknown' ? previous.category : interpreted.category,
        suggestion: previous?.suggestion ?? interpreted.suggestion,
        retryable: previous?.retryable ?? interpreted.retryable,
        technicalDetails
      })
    }

    const handleStdoutLine = (line: string) => {
      const message = line.trim()
      if (!message) return
      console.log(message)
      currentVideoId = extractVideoId(message) ?? currentVideoId
      const progress = parseProgress(message)
      const position = parsePlaylistPosition(message)

      if (position) {
        currentItem = position.current
        total = position.total
        currentVideoId = undefined
      }

      if (progress !== undefined || position) {
        context.updateTelemetry({
          message: `  └─ ${message.replace(/\[download\]|\[youtube:tab\]/, '').trim()}`,
          ...(progress !== undefined && { progress }),
          ...(position && { batch: position })
        })
      } else if (message.includes('[ExtractAudio]')) {
        context.updateTelemetry({ message: '  └─ Extraindo áudio (FFmpeg em ação)...' })
      }
    }

    const handleStderrLine = (line: string) => {
      const message = line.trim()
      if (!message) return
      console.warn(`[yt-dlp]: ${message}`)
      const warning = parseWarning(message)
      if (warning) {
        const trackId = extractVideoId(warning) ?? currentTrackKey()
        const warnings = warningsByTrack.get(trackId) ?? []
        if (!warnings.includes(warning)) warnings.push(warning)
        warningsByTrack.set(trackId, warnings)
      }

      if (/^ERROR:/i.test(message)) {
        const reason = normaliseYtDlpError(message)
        storeError(extractVideoId(reason) ?? currentTrackKey(), reason)
      }
    }

    const clearResources = () => {
      if (timeout) clearTimeout(timeout)
      unsubscribeControl()
      subprocess.stdout?.removeListener('data', handleStdoutChunk)
      subprocess.stderr?.removeListener('data', handleStderrChunk)
      subprocess.removeListener('close', handleClose)
      subprocess.removeListener('error', handleProcessError)
    }

    const finishResolve = (result: YtDlpRunResult) => {
      if (settled) return
      settled = true
      clearResources()
      resolve(result)
    }

    const finishReject = (error: Error) => {
      if (settled) return
      settled = true
      clearResources()
      reject(error)
    }

    const resetTimeout = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(
        () => {
          timedOut = true
          void terminateProcessTree(subprocess).catch((error) =>
            console.warn('[yt-dlp] Falha ao encerrar árvore após timeout:', error)
          )
        },
        3 * 60 * 1000
      )
    }

    function handleStdoutChunk(data: Buffer): void {
      resetTimeout()
      for (const line of stdoutBuffer.push(data.toString())) handleStdoutLine(line)
    }

    function handleStderrChunk(data: Buffer): void {
      resetTimeout()
      for (const line of stderrBuffer.push(data.toString())) handleStderrLine(line)
    }

    function handleClose(code: number | null, signal: NodeJS.Signals | null): void {
      for (const line of stdoutBuffer.flush()) handleStdoutLine(line)
      for (const line of stderrBuffer.flush()) handleStderrLine(line)

      if (interrupted) {
        finishReject(new RunInterruptedError())
        return
      }
      if (timedOut) {
        finishReject(new Error('O yt-dlp ficou sem atividade durante três minutos.'))
        return
      }
      if (signal) {
        finishReject(new Error(`O yt-dlp foi encerrado pelo sinal ${signal}.`))
        return
      }
      if (code === 0 || (code === 1 && errorsByTrack.size > 0)) {
        finishResolve({ total, errors: [...errorsByTrack.values()] })
        return
      }
      finishReject(
        new Error(`O yt-dlp encerrou inesperadamente com código ${code ?? 'desconhecido'}.`)
      )
    }

    function handleProcessError(error: Error): void {
      finishReject(error)
    }

    const handleControlState = (state: typeof context.control.state) => {
      if (state === 'interrupted') {
        interrupted = true
        void terminateProcessTree(subprocess).catch((error) =>
          console.warn('[yt-dlp] Falha ao encerrar árvore interrompida:', error)
        )
      }
    }

    unsubscribeControl = context.control.onStateChange(handleControlState)
    handleControlState(context.control.state)

    subprocess.stdout?.on('data', handleStdoutChunk)
    subprocess.stderr?.on('data', handleStderrChunk)
    subprocess.on('close', handleClose)
    subprocess.on('error', handleProcessError)
    resetTimeout()
  })
}
