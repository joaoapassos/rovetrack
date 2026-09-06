import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { backupSchema, MAX_BACKUP_BYTES } from '@shared/contracts/backup'
import { UrlAccessPolicy } from '@shared/security/urlAccessPolicy'
import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron'
import icon from '../../resources/icon.png?asset'
import { RunController } from './control/RunController'
import {
  directoryExists,
  notificationsEnabledSchema,
  processMediaPayloadSchema,
  runControlPayloadSchema,
  validateDirectoryPath
} from './ipcValidation'
import { createMediaPipeline } from './pipeline'
import { AudioFileProcessor } from './processors/audio/AudioFileProcessor'
import { AudioMp3Processor } from './processors/audio/AudioMp3Processor'
import { ProcessorResolver } from './processors/ProcessorResolver'
import { VideoProcessor } from './processors/video/VideoProcessor'
import { ProviderResolver } from './providers/ProviderResolver'
import { YtDlpProvider } from './providers/yt-dlp/YtDlpProvider'
import { isAllowedExternalUrl } from './security/externalNavigation'
import { OutputStorage } from './services/storage/OutputStorage'
import { updateTaskbarProgress } from './taskbarProgress'
import { cleanWorkspace, prepareWorkspace } from './utils/workspace'

const processMedia = createMediaPipeline({
  providerResolver: new ProviderResolver([new YtDlpProvider()]),
  processorResolver: new ProcessorResolver([
    new AudioMp3Processor(),
    new AudioFileProcessor(),
    new VideoProcessor()
  ]),
  outputStorage: new OutputStorage(),
  prepareWorkspace,
  cleanWorkspace
})

let nativeNotificationsEnabled = true
let activeRun: { runId: string; senderId: number; controller: RunController } | null = null

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

  ipcMain.handle('shell:openExternal', async (_event, input: unknown) => {
    if (typeof input !== 'string' || !isAllowedExternalUrl(input)) {
      throw new Error('URL externa não permitida.')
    }
    await shell.openExternal(input)
  })

  ipcMain.handle('app:getTerms', async () => {
    const termsPath = app.isPackaged
      ? join(process.resourcesPath, 'TERMS_OF_USE.md')
      : join(app.getAppPath(), 'TERMS_OF_USE.md')
    return readFile(termsPath, 'utf8')
  })

  ipcMain.handle('data:saveBackup', async (_event, input: unknown) => {
    const backup = backupSchema.parse(input)
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar dados do RoveTrack',
      defaultPath: `rovetrack-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Backup JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return false
    await writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
    return true
  })

  ipcMain.handle('data:openBackup', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Importar dados do RoveTrack',
      properties: ['openFile'],
      filters: [{ name: 'Backup JSON', extensions: ['json'] }]
    })
    if (canceled || !filePaths[0]) return null
    const details = await stat(filePaths[0])
    if (details.size > MAX_BACKUP_BYTES) throw new Error('O backup excede o limite de 5 MB.')
    const content = await readFile(filePaths[0], 'utf8')
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('O arquivo selecionado não contém JSON válido.')
    }
    return backupSchema.parse(parsed)
  })

  ipcMain.handle('shell:openFolder', async (_event, input: unknown) => {
    const directory = await validateDirectoryPath(input)
    const errorMessage = await shell.openPath(directory)
    if (errorMessage) throw new Error(`Não foi possível abrir o diretório: ${errorMessage}`)
  })

  ipcMain.handle('shell:directoryExists', (_event, input: unknown) => directoryExists(input))

  ipcMain.handle('notifications:setEnabled', (_event, input: unknown) => {
    nativeNotificationsEnabled = notificationsEnabledSchema.parse(input)
  })

  ipcMain.handle('media:process', async (event, input: unknown) => {
    if (activeRun) throw new Error('Já existe uma operação em andamento.')
    const payload = processMediaPayloadSchema.parse(input)
    new UrlAccessPolicy([
      {
        id: 'request-policy',
        label: 'Política da execução',
        domains: payload.allowedDomains,
        enabled: true,
        builtin: false
      }
    ]).assertAllowed(payload.request.sourceUrl)
    const controller = new RunController()
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    activeRun = { runId: payload.runId, senderId: event.sender.id, controller }

    try {
      const destinationDirectory = await validateDirectoryPath(payload.request.destinationDirectory)
      const request = { ...payload.request, destinationDirectory }
      const report = await processMedia(request, payload.runId, controller, (state) => {
        if (mainWindow && !mainWindow.isDestroyed()) updateTaskbarProgress(mainWindow, state)
        if (!event.sender.isDestroyed()) event.sender.send('media:telemetry', state)
      })

      if (nativeNotificationsEnabled && Notification.isSupported()) {
        const wasInterrupted = controller.state === 'interrupted'
        new Notification({
          title: wasInterrupted
            ? 'RoveTrack: operação interrompida'
            : report.failed > 0
              ? 'RoveTrack: concluído com falhas'
              : 'RoveTrack',
          body: wasInterrupted
            ? 'O download foi interrompido e o workspace temporário foi limpo.'
            : report.failed > 0
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
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(-1)
      if (activeRun?.runId === payload.runId) activeRun = null
    }
  })

  const controlRun = (
    senderId: number,
    input: unknown,
    action: (controller: RunController) => boolean
  ): void => {
    const { runId } = runControlPayloadSchema.parse(input)
    if (!activeRun || activeRun.runId !== runId || activeRun.senderId !== senderId) {
      throw new Error('A operação indicada não está ativa.')
    }
    if (!action(activeRun.controller)) throw new Error('A operação não aceita esta transição.')
  }

  ipcMain.handle('media:interrupt', (event, input: unknown) =>
    controlRun(event.sender.id, input, (controller) => controller.interrupt())
  )
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
