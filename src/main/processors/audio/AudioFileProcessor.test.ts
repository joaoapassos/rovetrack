import { describe, expect, it, vi } from 'vitest'
import { AudioFileProcessor } from './AudioFileProcessor'

describe('AudioFileProcessor', () => {
  it.each([
    'm4a',
    'opus',
    'flac',
    'wav'
  ] as const)('finaliza áudio %s convertido', async (format) => {
    const processor = new AudioFileProcessor()
    const result = await processor.process(
      {
        sourceId: '1',
        sourceUrl: 'https://example.com/audio',
        title: 'Áudio',
        mediaType: 'audio',
        outputFormat: format,
        filePath: `audio.${format}`
      },
      {
        sourceUrl: 'https://example.com/audio',
        destinationDirectory: 'C:\\output',
        mediaType: 'audio',
        outputFormat: format,
        quality: 'best',
        thumbnail: { enabled: false, aspectRatio: '1:1', quality: 'best', outputFormat: 'jpg' }
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
    expect(result.extension).toBe(`.${format}`)
  })
})
