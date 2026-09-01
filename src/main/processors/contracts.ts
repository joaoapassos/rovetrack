import type { DownloadedAsset } from '@main/providers/contracts'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'
import type { RunControl } from '../control/contracts'

export interface ProcessedAsset {
  sourceId: string
  title: string
  filePath: string
  extension: string
  relatedFiles?: Array<{
    title: string
    filePath: string
    extension: string
  }>
}

export interface ProcessingContext {
  workspaceDirectory: string
  updateTelemetry: (update: Partial<PipelineState>) => void
  control: RunControl
}

export interface MediaProcessor {
  supports(asset: DownloadedAsset, request: MediaDownloadRequest): boolean
  process(
    asset: DownloadedAsset,
    request: MediaDownloadRequest,
    context: ProcessingContext
  ): Promise<ProcessedAsset>
}
