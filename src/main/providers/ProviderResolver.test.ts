import type { MediaDownloadRequest } from '@shared/contracts/media'
import { describe, expect, it, vi } from 'vitest'
import type { DownloadProvider } from './contracts'
import { ProviderResolver, UnsupportedMediaRequestError } from './ProviderResolver'

const request: MediaDownloadRequest = {
  sourceUrl: 'https://www.youtube.com/watch?v=abc123',
  destinationDirectory: 'C:\\output',
  mediaType: 'audio',
  outputFormat: 'mp3'
}

function fakeProvider(id: string, supported: boolean): DownloadProvider {
  return {
    id,
    capabilities: { mediaTypes: ['audio'], outputFormats: ['mp3'] },
    supports: vi.fn().mockReturnValue(supported),
    download: vi.fn()
  }
}

describe('ProviderResolver', () => {
  it('escolhe o provider compatível', async () => {
    const compatible = fakeProvider('compatible', true)
    await expect(new ProviderResolver([compatible]).resolve(request)).resolves.toBe(compatible)
  })

  it('ignora providers incompatíveis', async () => {
    const incompatible = fakeProvider('incompatible', false)
    const compatible = fakeProvider('compatible', true)
    await expect(new ProviderResolver([incompatible, compatible]).resolve(request)).resolves.toBe(
      compatible
    )
  })

  it('permite registrar mais de um provider e preserva a ordem', async () => {
    const first = fakeProvider('first', true)
    const second = fakeProvider('second', true)
    await expect(new ProviderResolver([first, second]).resolve(request)).resolves.toBe(first)
    expect(second.supports).not.toHaveBeenCalled()
  })

  it('informa quando nenhum provider suporta a requisição', async () => {
    await expect(
      new ProviderResolver([fakeProvider('nope', false)]).resolve(request)
    ).rejects.toBeInstanceOf(UnsupportedMediaRequestError)
  })
})
