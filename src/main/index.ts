import { join } from 'node:path'
import { 
  electronApp, 
  is,
  optimizer, 
} from '@electron-toolkit/utils'
import {
  app, 
  BrowserWindow, 
  dialog,
  ipcMain,
  shell, 
} from 'electron'
import icon from '../../resources/icon.png?asset'
import { processAudioPipeline } from './pipeline'



function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // --- RECPTORES IPC (ROVETRACK) ---
  
  /**
   * Escuta o evento 'dialog:selectFolder' disparado pelo front-end.
   * Interrompe o processo para abrir a janela nativa de seleção do OS.
   */
  ipcMain.handle('dialog:selectFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Selecione o Acampamento Base (Destino)'
    })
    
    if (canceled) return null
    return filePaths[0]
  })

  /**
   * Escuta o evento 'audio:process' disparado pelo front-end.
   * Recebe o payload tipado, engata o motor de extração (Pipeline)
   * e aguarda a finalização para retornar o sinal de sucesso ao React.
   */
  ipcMain.handle('audio:process', async (event, payload: TrackPayload) => {
    await processAudioPipeline(payload, (state: PipelineState) => {
      event.sender.send('audio:telemetry', state)
    });
  })
  // --------------------------------

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
