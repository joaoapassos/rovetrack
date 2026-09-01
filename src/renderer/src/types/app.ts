import type { MediaDownloadRequest } from '@shared/contracts/media'

export interface ActiveHistoryAttempt {
  id: string
  url: string
  outputDir: string
  request: MediaDownloadRequest
  saved: boolean
}
