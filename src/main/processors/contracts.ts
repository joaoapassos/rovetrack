import type { DownloadedAsset } from '@main/providers/contracts'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'

export interface ProcessedAsset {
  sourceId: string
  title: string
  filePath: string
  extension: string
}

export interface ProcessingContext {
  workspaceDirectory: string
  updateTelemetry: (update: Partial<PipelineState>) => void
}

export interface MediaProcessor {
  supports(asset: DownloadedAsset, request: MediaDownloadRequest): boolean
  process(asset: DownloadedAsset, context: ProcessingContext): Promise<ProcessedAsset>
}
