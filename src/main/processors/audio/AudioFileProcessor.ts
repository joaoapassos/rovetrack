import { extname } from 'node:path'
import type { DownloadedAsset } from '@main/providers/contracts'
import { AUDIO_OUTPUT_FORMATS, type MediaDownloadRequest } from '@shared/contracts/media'
import type { MediaProcessor, ProcessedAsset, ProcessingContext } from '../contracts'

export class AudioFileProcessor implements MediaProcessor {
  supports(asset: DownloadedAsset, request: MediaDownloadRequest): boolean {
    return (
      asset.mediaType === 'audio' &&
      request.mediaType === 'audio' &&
      request.outputFormat !== 'mp3' &&
      asset.outputFormat === request.outputFormat &&
      AUDIO_OUTPUT_FORMATS.includes(request.outputFormat as never)
    )
  }

  async process(
    asset: DownloadedAsset,
    _request: MediaDownloadRequest,
    context: ProcessingContext
  ): Promise<ProcessedAsset> {
    context.updateTelemetry({ message: '  └─ A finalizar áudio e metadados...' })
    return {
      sourceId: asset.sourceId,
      title: asset.title,
      filePath: asset.filePath,
      extension: extname(asset.filePath)
    }
  }
}
