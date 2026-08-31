import type { ProcessMediaPayload } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'

declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      openFolder: (path: string) => Promise<void>
      directoryExists: (path: string) => Promise<boolean>
      setNativeNotificationsEnabled: (enabled: boolean) => Promise<void>
      processAudio: (payload: ProcessMediaPayload) => Promise<void>
      interruptAudio: (runId: string) => Promise<void>
      onPipelineTelemetry: (callback: (state: PipelineState) => void) => () => void
    }
  }
}
