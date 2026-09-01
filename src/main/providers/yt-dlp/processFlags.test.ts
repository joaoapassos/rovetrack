import type { MediaDownloadRequest } from '@shared/contracts/media'
import { describe, expect, it } from 'vitest'
import { buildYtDlpMediaFlags } from './process'

const request: MediaDownloadRequest = {
  sourceUrl: 'https://youtube.com/watch?v=1',
  destinationDirectory: 'C:\\output',
  mediaType: 'audio',
  outputFormat: 'mp3',
  quality: 'best',
  thumbnail: { enabled: true, aspectRatio: '1:1', quality: 'best', outputFormat: 'jpg' }
}

describe('flags de mídia do yt-dlp', () => {
  it('traduz áudio, vídeo, qualidade e thumbnail sem vazar flags para o domínio', () => {
    expect(buildYtDlpMediaFlags(request)).toMatchObject({
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      writeThumbnail: true
    })
    expect(
      buildYtDlpMediaFlags({
        ...request,
        mediaType: 'video',
        outputFormat: 'mp4',
        quality: 'medium',
        thumbnail: { ...request.thumbnail, enabled: false }
      })
    ).toMatchObject({ mergeOutputFormat: 'mp4', embedMetadata: true, writeThumbnail: false })
    expect(
      String(
        buildYtDlpMediaFlags({
          ...request,
          mediaType: 'video',
          outputFormat: 'mp4',
          quality: 'medium'
        }).format
      )
    ).toContain('height<=720')
  })
})
