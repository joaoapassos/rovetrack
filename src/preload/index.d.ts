import type { RoveTrackBackup } from '@shared/contracts/backup'
import type { ProcessMediaPayload } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'

declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      openFolder: (path: string) => Promise<void>
      directoryExists: (path: string) => Promise<boolean>
      setNativeNotificationsEnabled: (enabled: boolean) => Promise<void>
      openExternal: (url: string) => Promise<void>
      getTerms: () => Promise<string>
      saveBackup: (backup: RoveTrackBackup) => Promise<boolean>
      openBackup: () => Promise<RoveTrackBackup | null>
      processMedia: (payload: ProcessMediaPayload) => Promise<void>
      interruptMedia: (runId: string) => Promise<void>
      onPipelineTelemetry: (callback: (state: PipelineState) => void) => () => void
    }
  }
}
