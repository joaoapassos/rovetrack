import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import type { PipelineState } from '@shared/contracts/pipeline'
import { calculateGlobalProgress } from '@shared/utils/calculateGlobalProgress'
import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron'
import icon from '../../resources/icon.png?asset'
import {
  notificationsEnabledSchema,
  processMediaPayloadSchema,
  validateDirectoryPath
} from './ipcValidation'
import { createMediaPipeline } from './pipeline'
import { AudioMp3Processor } from './processors/audio/AudioMp3Processor'
import { ProviderResolver } from './providers/ProviderResolver'
import { YtDlpProvider } from './providers/yt-dlp/YtDlpProvider'
import { isAllowedExternalUrl } from './security/externalNavigation'
import { OutputStorage } from './services/storage/OutputStorage'
import { cleanWorkspace, prepareWorkspace } from './utils/workspace'

const processMedia = createMediaPipeline({
  providerResolver: new ProviderResolver([new YtDlpProvider()]),
  mediaProcessor: new AudioMp3Processor(),
  outputStorage: new OutputStorage(),
  prepareWorkspace,
  cleanWorkspace
})

let nativeNotificationsEnabled = true
let processing = false

function updateTaskbarProgress(mainWindow: BrowserWindow, state: PipelineState): void {
  const progress = calculateGlobalProgress(state) / 100
  if (state.status === 'error') {
    mainWindow.setProgressBar(progress, { mode: 'error' })
  } else if (state.status === 'partial') {
    mainWindow.setProgressBar(1, { mode: 'paused' })
  } else {
    mainWindow.setProgressBar(progress, { mode: 'normal' })
  }

  if (['success', 'partial', 'error'].includes(state.status) && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true)
  }
}

async function openAllowedExternalUrl(url: string): Promise<void> {
  if (!isAllowedExternalUrl(url)) return
  await shell.openExternal(url)
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'RoveTrack',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.on('focus', () => mainWindow.flashFrame(false))
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openAllowedExternalUrl(url).catch((error) =>
      console.warn('[navigation] Não foi possível abrir URL externa:', error)
    )
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    void openAllowedExternalUrl(url).catch((error) =>
      console.warn('[navigation] Não foi possível abrir URL externa:', error)
    )
  })
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false)
    }
  )

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (is.dev && rendererUrl) mainWindow.loadURL(rendererUrl)
  else mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

function registerIpcHandlers(): void {
  ipcMain.handle('dialog:selectFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Selecione o destino'
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle('shell:openFolder', async (_event, input: unknown) => {
    const directory = await validateDirectoryPath(input)
    const errorMessage = await shell.openPath(directory)
    if (errorMessage) throw new Error(`Não foi possível abrir o diretório: ${errorMessage}`)
  })

  ipcMain.handle('notifications:setEnabled', (_event, input: unknown) => {
    nativeNotificationsEnabled = notificationsEnabledSchema.parse(input)
  })

  ipcMain.handle('audio:process', async (event, input: unknown) => {
    if (processing) throw new Error('Já existe uma operação em andamento.')
    const payload = processMediaPayloadSchema.parse(input)
    processing = true

    try {
      const destinationDirectory = await validateDirectoryPath(payload.request.destinationDirectory)
      const request = { ...payload.request, destinationDirectory }
      const mainWindow = BrowserWindow.fromWebContents(event.sender)
      const report = await processMedia(request, payload.runId, (state) => {
        if (mainWindow && !mainWindow.isDestroyed()) updateTaskbarProgress(mainWindow, state)
        if (!event.sender.isDestroyed()) event.sender.send('audio:telemetry', state)
      })

      if (nativeNotificationsEnabled && Notification.isSupported()) {
        new Notification({
          title: report.failed > 0 ? 'RoveTrack: concluído com falhas' : 'RoveTrack',
          body:
            report.failed > 0
              ? `${report.succeeded} item(ns) concluído(s); ${report.failed} falhou(aram).`
              : `${report.succeeded} item(ns) concluído(s) com sucesso.`,
          icon,
          silent: true
        }).show()
      }
      return report
    } catch (error) {
      if (nativeNotificationsEnabled && Notification.isSupported()) {
        new Notification({
          title: 'RoveTrack: falha crítica',
          body: 'O processamento não pôde ser concluído. Consulte o relatório.',
          icon,
          silent: true
        }).show()
      }
      throw error
    } finally {
      processing = false
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.rovetrack.app')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
