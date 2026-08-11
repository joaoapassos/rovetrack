import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  openFolder: (path: string) => ipcRenderer.invoke('shell:openFolder', path),
  processAudio: (payload: TrackPayload) => ipcRenderer.invoke('audio:process', payload),
  onPipelineTelemetry: (callback) => ipcRenderer.on('audio:telemetry', (_event, state) => callback(state))
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error
  window.electron = electronAPI
  // @ts-expect-error
  window.api = api
}
