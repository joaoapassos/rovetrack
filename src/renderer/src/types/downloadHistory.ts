import type { PipelineReport, PipelineReportTrack } from '@shared/contracts/pipeline'

export type DownloadHistoryStatus = 'success' | 'partial' | 'interrupted' | 'error'

export interface DownloadHistoryEntry {
  schemaVersion: 2
  id: string
  createdAt: string
  url: string
  outputDir: string
  status: DownloadHistoryStatus
  name: string
  kind: 'track' | 'playlist'
  tracks: PipelineReportTrack[]
  report: PipelineReport
}
