import type { RovetrackBackup } from '@shared/contracts/backup'
import type { ProcessMediaPayload } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'
import type { ComponentId, UpdateSettings, UpdateState } from '@shared/contracts/updates'

declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>
      openFolder: (path: string) => Promise<void>
      directoryExists: (path: string) => Promise<boolean>
      setNativeNotificationsEnabled: (enabled: boolean) => Promise<void>
      openExternal: (url: string) => Promise<void>
      getTerms: () => Promise<string>
      getVersion: () => Promise<string>
      saveBackup: (backup: RovetrackBackup) => Promise<boolean>
      openBackup: () => Promise<RovetrackBackup | null>
      processMedia: (payload: ProcessMediaPayload) => Promise<void>
      interruptMedia: (runId: string) => Promise<void>
      getUpdateState: () => Promise<UpdateState>
      configureUpdates: (settings: UpdateSettings) => Promise<UpdateState>
      checkForUpdates: () => Promise<UpdateState>
      downloadApplicationUpdate: () => Promise<void>
      installApplicationUpdate: () => Promise<void>
      updateComponent: (component: ComponentId) => Promise<void>
      rollbackComponent: (component: ComponentId) => Promise<void>
      restoreBundledComponent: (component: ComponentId) => Promise<void>
      onUpdateState: (callback: (state: UpdateState) => void) => () => void
      onPipelineTelemetry: (callback: (state: PipelineState) => void) => () => void
    }
  }
}
