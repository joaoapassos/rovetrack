import type { DownloadedAsset } from '@main/providers/contracts'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { MediaProcessor } from './contracts'

export class UnsupportedProcessorError extends Error {
  constructor() {
    super('Nenhum processador disponível suporta a mídia adquirida.')
    this.name = 'UnsupportedProcessorError'
  }
}

export class ProcessorResolver {
  constructor(private readonly processors: readonly MediaProcessor[]) {}

  resolve(asset: DownloadedAsset, request: MediaDownloadRequest): MediaProcessor {
    const processor = this.processors.find((candidate) => candidate.supports(asset, request))
    if (!processor) throw new UnsupportedProcessorError()
    return processor
  }
}
