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
  processAudio: (payload: ProcessMediaPayload): Promise<void> =>
    ipcRenderer.invoke('audio:process', payload),
  interruptAudio: (runId: string): Promise<void> =>
    ipcRenderer.invoke('audio:interrupt', { runId }),
  onPipelineTelemetry: (callback: (state: PipelineState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: PipelineState) => callback(state)
    ipcRenderer.on('audio:telemetry', listener)
    return () => ipcRenderer.removeListener('audio:telemetry', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
