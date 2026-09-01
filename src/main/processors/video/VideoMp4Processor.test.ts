import { describe, expect, it, vi } from 'vitest'
import { VideoMp4Processor } from './VideoMp4Processor'

describe('VideoMp4Processor', () => {
  it('entrega MP4 sem exigir thumbnail quando ela está desligada', async () => {
    const processor = new VideoMp4Processor()
    const result = await processor.process(
      {
        sourceId: '1',
        sourceUrl: 'https://youtube.com/watch?v=1',
        title: 'Vídeo',
        mediaType: 'video',
        outputFormat: 'mp4',
        filePath: 'video.mp4'
      },
      {
        sourceUrl: 'https://youtube.com/watch?v=1',
        destinationDirectory: 'C:\\output',
        mediaType: 'video',
        outputFormat: 'mp4',
        quality: 'best',
        thumbnail: { enabled: false, aspectRatio: '16:9', quality: 'best', outputFormat: 'jpg' }
      },
      {
        workspaceDirectory: 'workspace',
        updateTelemetry: vi.fn(),
        control: {
          state: 'running',
          checkpoint: vi.fn(),
          onStateChange: vi.fn(() => () => undefined)
        }
      }
    )
    expect(result).toMatchObject({ extension: '.mp4', relatedFiles: [] })
  })
})
