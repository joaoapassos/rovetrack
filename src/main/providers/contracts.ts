import type { MediaDownloadRequest, MediaType, OutputFormat } from '@shared/contracts/media'
import type { PipelineReportError, PipelineState } from '@shared/contracts/pipeline'

export interface DownloadedAsset {
  sourceId: string
  sourceUrl: string
  title: string
  creator?: string
  collection?: string
  mediaType: MediaType
  outputFormat: OutputFormat
  filePath: string
  thumbnailPath?: string
}

export interface DownloadResult {
  total: number
  assets: DownloadedAsset[]
  errors: PipelineReportError[]
}

export interface DownloadContext {
  workspaceDirectory: string
  updateTelemetry: (update: Partial<PipelineState>) => void
  signal?: AbortSignal
}

export interface DownloadProvider {
  readonly id: string
  readonly capabilities: {
    mediaTypes: readonly MediaType[]
    outputFormats: readonly OutputFormat[]
  }

  supports(request: MediaDownloadRequest): boolean | Promise<boolean>
  download(request: MediaDownloadRequest, context: DownloadContext): Promise<DownloadResult>
}
