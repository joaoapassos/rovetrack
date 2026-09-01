import type { ProcessedAsset } from '@main/processors/contracts'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import { resolveOutputPath } from './filename'
import { moveFileSafely } from './moveFile'

export class OutputStorage {
  async store(asset: ProcessedAsset, request: MediaDownloadRequest): Promise<string> {
    const destination = await resolveOutputPath(
      request.destinationDirectory,
      asset.title,
      asset.extension
    )
    await moveFileSafely(asset.filePath, destination)
    for (const related of asset.relatedFiles ?? []) {
      const relatedDestination = await resolveOutputPath(
        request.destinationDirectory,
        related.title,
        related.extension
      )
      await moveFileSafely(related.filePath, relatedDestination)
    }
    return destination
  }
}
