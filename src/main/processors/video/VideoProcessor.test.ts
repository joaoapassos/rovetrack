import { describe, expect, it, vi } from 'vitest'
import { VideoProcessor } from './VideoProcessor'

describe('VideoProcessor', () => {
  it.each([
    'mp4',
    'webm',
    'mkv',
    'mov',
    'avi'
  ] as const)('entrega vídeo %s sem exigir thumbnail quando ela está desligada', async (outputFormat) => {
    const processor = new VideoProcessor()
    const result = await processor.process(
      {
        sourceId: '1',
        sourceUrl: 'https://youtube.com/watch?v=1',
        title: 'Vídeo',
        mediaType: 'video',
        outputFormat,
        filePath: `video.${outputFormat}`
      },
      {
        sourceUrl: 'https://youtube.com/watch?v=1',
        destinationDirectory: 'C:\\output',
        mediaType: 'video',
        outputFormat,
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
    expect(result).toMatchObject({ extension: `.${outputFormat}`, relatedFiles: [] })
  })
})
