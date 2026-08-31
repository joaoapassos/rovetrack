import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { DownloadProvider } from './contracts'

export class UnsupportedMediaRequestError extends Error {
  constructor() {
    super('Nenhum provider disponível suporta esta origem e formato de mídia.')
    this.name = 'UnsupportedMediaRequestError'
  }
}

export class ProviderResolver {
  constructor(private readonly providers: readonly DownloadProvider[]) {}

  async resolve(request: MediaDownloadRequest): Promise<DownloadProvider> {
    for (const provider of this.providers) {
      if (await provider.supports(request)) return provider
    }

    throw new UnsupportedMediaRequestError()
  }
}
