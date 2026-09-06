import { describe, expect, it } from 'vitest'
import { AudioFileProcessor } from './audio/AudioFileProcessor'
import { AudioMp3Processor } from './audio/AudioMp3Processor'
import { ProcessorResolver } from './ProcessorResolver'
import { VideoProcessor } from './video/VideoProcessor'

const request = {
  sourceUrl: 'https://youtube.com/watch?v=1',
  destinationDirectory: 'C:\\output',
  quality: 'best' as const,
  thumbnail: {
    enabled: false,
    aspectRatio: '1:1' as const,
    quality: 'best' as const,
    outputFormat: 'jpg' as const
  }
}

describe('ProcessorResolver', () => {
  const resolver = new ProcessorResolver([
    new AudioMp3Processor(),
    new AudioFileProcessor(),
    new VideoProcessor()
  ])

  it('resolve áudio e vídeo e rejeita combinações desconhecidas', () => {
    const baseAsset = {
      sourceId: '1',
      sourceUrl: request.sourceUrl,
      title: 'Mídia',
      filePath: 'file'
    }
    expect(
      resolver.resolve(
        { ...baseAsset, mediaType: 'audio', outputFormat: 'mp3' },
        { ...request, mediaType: 'audio', outputFormat: 'mp3' }
      )
    ).toBeInstanceOf(AudioMp3Processor)
    expect(
      resolver.resolve(
        { ...baseAsset, mediaType: 'video', outputFormat: 'mp4' },
        { ...request, mediaType: 'video', outputFormat: 'mp4' }
      )
    ).toBeInstanceOf(VideoProcessor)
    expect(() =>
      resolver.resolve(
        { ...baseAsset, mediaType: 'audio', outputFormat: 'mp3' },
        { ...request, mediaType: 'video', outputFormat: 'mp4' }
      )
    ).toThrow('Nenhum processador')
  })
})
