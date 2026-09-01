import type { RoveTrackBackup } from '@shared/contracts/backup'
import type { ProcessMediaPayload } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),
  openFolder: (path: string): Promise<void> => ipcRenderer.invoke('shell:openFolder', path),
  directoryExists: (path: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:directoryExists', path),
  setNativeNotificationsEnabled: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('notifications:setEnabled', enabled),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  getTerms: (): Promise<string> => ipcRenderer.invoke('app:getTerms'),
  saveBackup: (backup: RoveTrackBackup): Promise<boolean> =>
    ipcRenderer.invoke('data:saveBackup', backup),
  openBackup: (): Promise<RoveTrackBackup | null> => ipcRenderer.invoke('data:openBackup'),
  processMedia: (payload: ProcessMediaPayload): Promise<void> =>
    ipcRenderer.invoke('media:process', payload),
  interruptMedia: (runId: string): Promise<void> =>
    ipcRenderer.invoke('media:interrupt', { runId }),
  onPipelineTelemetry: (callback: (state: PipelineState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: PipelineState) => callback(state)
    ipcRenderer.on('media:telemetry', listener)
    return () => ipcRenderer.removeListener('media:telemetry', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
