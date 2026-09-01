import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'
import { HISTORY_SCHEMA_VERSION } from '../schemas/downloadHistory'
import type { ActiveHistoryAttempt } from '../types/app'
import type { DownloadHistoryEntry, DownloadHistoryStatus } from '../types/downloadHistory'
import { saveDownloadHistory } from '../utils/downloadHistory'

type Listener = (telemetry: PipelineState | null) => void

const listeners = new Set<Listener>()
let telemetry: PipelineState | null = null
let activeAttempt: ActiveHistoryAttempt | null = null

const isTerminalStatus = (status: PipelineState['status']): status is DownloadHistoryStatus =>
  status === 'success' || status === 'partial' || status === 'interrupted' || status === 'error'

export function getDownloadTelemetry(): PipelineState | null {
  return telemetry
}

export function getActiveRunId(): string | null {
  return activeAttempt?.id ?? null
}

export function getActiveRequest(): MediaDownloadRequest | null {
  return activeAttempt?.request ?? null
}

export function subscribeDownloadActivity(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function beginDownloadActivity(runId: string, request: MediaDownloadRequest): void {
  activeAttempt = {
    id: runId,
    url: request.sourceUrl,
    outputDir: request.destinationDirectory,
    request,
    saved: false
  }
  publishDownloadTelemetry({
    runId,
    status: 'preparing',
    message: 'A iniciar os motores...',
    progress: 0,
    step: { current: 1, total: 4 },
    batch: { current: 1, total: 1 },
    report: { total: 0, succeeded: 0, failed: 0, errors: [], tracks: [] }
  })
}

export function publishDownloadTelemetry(next: PipelineState): void {
  if (activeAttempt && activeAttempt.id !== next.runId) return
  telemetry = next
  for (const listener of listeners) listener(next)
  if (!activeAttempt || !isTerminalStatus(next.status) || activeAttempt.saved) return

  activeAttempt.saved = true
  const attempt = activeAttempt
  const report = next.report
  const isPlaylist = Boolean(report.source?.collectionTitle) || report.total > 1
  const firstTrackTitle = report.tracks.find((track) => track.title)?.title
  const entry: DownloadHistoryEntry = {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    id: attempt.id,
    createdAt: new Date().toISOString(),
    url: attempt.url,
    outputDir: attempt.outputDir,
    status: next.status,
    name:
      report.source?.collectionTitle ??
      report.source?.title ??
      firstTrackTitle ??
      (next.status === 'interrupted'
        ? 'Download interrompido'
        : isPlaylist
          ? `Playlist com ${report.total} itens`
          : 'Mídia sem título'),
    kind: isPlaylist ? 'playlist' : 'track',
    tracks: [...report.tracks],
    report,
    request: attempt.request
  }
  void saveDownloadHistory(entry).catch(console.error)
}
