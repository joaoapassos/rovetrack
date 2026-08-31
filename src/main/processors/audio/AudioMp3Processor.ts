import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { DownloadedAsset } from '@main/providers/contracts'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { MediaProcessor, ProcessedAsset, ProcessingContext } from '../contracts'
import { formatCoverImage } from './formatCover'
import { injectId3Tags } from './id3'

export class AudioMp3Processor implements MediaProcessor {
  supports(asset: DownloadedAsset, request: MediaDownloadRequest): boolean {
    return (
      asset.mediaType === 'audio' &&
      asset.outputFormat === 'mp3' &&
      request.mediaType === 'audio' &&
      request.outputFormat === 'mp3'
    )
  }

  async process(asset: DownloadedAsset, context: ProcessingContext): Promise<ProcessedAsset> {
    if (!asset.thumbnailPath) throw new Error('Imagem de capa não encontrada.')

    const coverPath = join(context.workspaceDirectory, `cover-${randomUUID()}.jpg`)
    context.updateTelemetry({ message: '  └─ A recortar a capa (1:1)...' })
    await formatCoverImage(asset.thumbnailPath, coverPath)

    context.updateTelemetry({ message: '  └─ A injetar metadados ID3...' })
    injectId3Tags(asset.filePath, {
      title: asset.title,
      artist: asset.creator ?? 'Artista Desconhecido',
      album: asset.collection ?? asset.title,
      coverImagePath: coverPath
    })

    return {
      sourceId: asset.sourceId,
      title: asset.title,
      filePath: asset.filePath,
      extension: '.mp3'
    }
  }
}
