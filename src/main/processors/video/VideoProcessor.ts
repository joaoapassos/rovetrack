import { randomUUID } from 'node:crypto'
import { extname, join } from 'node:path'
import type { DownloadedAsset } from '@main/providers/contracts'
import { type MediaDownloadRequest, VIDEO_OUTPUT_FORMATS } from '@shared/contracts/media'
import type { MediaProcessor, ProcessedAsset, ProcessingContext } from '../contracts'
import { formatThumbnail } from '../thumbnail'

export class VideoProcessor implements MediaProcessor {
  supports(asset: DownloadedAsset, request: MediaDownloadRequest): boolean {
    return (
      asset.mediaType === 'video' &&
      request.mediaType === 'video' &&
      asset.outputFormat === request.outputFormat &&
      VIDEO_OUTPUT_FORMATS.includes(request.outputFormat as never)
    )
  }

  async process(
    asset: DownloadedAsset,
    request: MediaDownloadRequest,
    context: ProcessingContext
  ): Promise<ProcessedAsset> {
    const relatedFiles: NonNullable<ProcessedAsset['relatedFiles']> = []
    if (request.thumbnail.enabled && asset.thumbnailPath) {
      const extension = `.${request.thumbnail.outputFormat}`
      const thumbnailPath = join(
        context.workspaceDirectory,
        `thumbnail-${randomUUID()}${extension}`
      )
      context.updateTelemetry({ message: '  └─ A preparar thumbnail do vídeo...' })
      await formatThumbnail(asset.thumbnailPath, thumbnailPath, request.thumbnail)
      relatedFiles.push({ title: `${asset.title}.thumbnail`, filePath: thumbnailPath, extension })
    }

    return {
      sourceId: asset.sourceId,
      title: asset.title,
      filePath: asset.filePath,
      extension: extname(asset.filePath),
      relatedFiles
    }
  }
}
