import type { MediaDownloadRequest } from '@shared/contracts/media'
import { describe, expect, it, vi } from 'vitest'
import {
  beginDownloadActivity,
  getActiveRequest,
  getActiveRunId,
  getDownloadTelemetry,
  publishDownloadTelemetry,
  subscribeDownloadActivity
} from './downloadActivity'

const request: MediaDownloadRequest = {
  sourceUrl: 'https://youtube.com/watch?v=activity',
  destinationDirectory: 'C:\\output',
  mediaType: 'video',
  outputFormat: 'mp4',
  quality: 'best',
  thumbnail: { enabled: false, aspectRatio: '16:9', quality: 'best', outputFormat: 'jpg' }
}

describe('downloadActivity', () => {
  it('preserva execução e telemetria entre páginas', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeDownloadActivity(listener)
    beginDownloadActivity('run-navigation', request)
    publishDownloadTelemetry({
      runId: 'run-navigation',
      status: 'downloading',
      message: '50%',
      progress: 50,
      step: { current: 2, total: 4 },
      batch: { current: 1, total: 1 },
      report: { total: 1, succeeded: 0, failed: 0, errors: [], tracks: [] }
    })

    expect(getActiveRunId()).toBe('run-navigation')
    expect(getActiveRequest()).toEqual(request)
    expect(getDownloadTelemetry()?.progress).toBe(50)
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ progress: 50 }))
    unsubscribe()
  })
})
