import { describe, expect, it, vi } from 'vitest'
import { AudioMp3Processor } from './AudioMp3Processor'
import { injectId3Tags } from './id3'

vi.mock('./id3', () => ({ injectId3Tags: vi.fn() }))

describe('AudioMp3Processor', () => {
  it('mantém metadata textual quando thumbnail está desligada', async () => {
    const processor = new AudioMp3Processor()
    await expect(
      processor.process(
        {
          sourceId: '1',
          sourceUrl: 'https://youtube.com/watch?v=1',
          title: 'Faixa',
          creator: 'Artista',
          collection: 'Álbum',
          mediaType: 'audio',
          outputFormat: 'mp3',
          filePath: 'song.mp3'
        },
        {
          sourceUrl: 'https://youtube.com/watch?v=1',
          destinationDirectory: 'C:\\output',
          mediaType: 'audio',
          outputFormat: 'mp3',
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
    ).resolves.toMatchObject({ extension: '.mp3' })
    expect(injectId3Tags).toHaveBeenCalledWith(
      'song.mp3',
      expect.objectContaining({
        title: 'Faixa',
        artist: 'Artista',
        album: 'Álbum',
        coverImagePath: undefined
      })
    )
  })
})
