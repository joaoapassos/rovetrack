import { readFile, rename, writeFile } from 'node:fs/promises'
import type { ApplicationUpdateState } from '@shared/contracts/updates'
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

interface UpdateInfoLike {
  version: string
}

interface DownloadProgressLike {
  percent: number
}

export interface ApplicationUpdaterOptions {
  isOperationActive: () => boolean
  onStateChange: () => void
  notify: (title: string, body: string) => void
  statePath: string
}

export class ApplicationUpdater {
  private state: ApplicationUpdateState
  private notifiedVersion?: string

  constructor(private readonly options: ApplicationUpdaterOptions) {
    this.state = {
      currentVersion: app.getVersion(),
      status: app.isPackaged ? 'idle' : 'development'
    }
    if (!app.isPackaged) return
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.on('checking-for-update', () => this.update({ status: 'checking' }))
    autoUpdater.on('update-available', (info: UpdateInfoLike) => {
      this.update({ status: 'available', availableVersion: info.version })
      if (this.notifiedVersion !== info.version) {
        this.notifiedVersion = info.version
        this.options.notify(
          'RoveTrack: atualização disponível',
          `A versão ${info.version} está disponível.`
        )
        void this.persistNotificationState().catch((error) =>
          console.warn('[updates] Não foi possível persistir o estado de notificação:', error)
        )
      }
    })
    autoUpdater.on('update-not-available', () =>
      this.update({ status: 'not-available', availableVersion: undefined })
    )
    autoUpdater.on('download-progress', (progress: DownloadProgressLike) =>
      this.update({ status: 'downloading', progress: Math.max(0, Math.min(100, progress.percent)) })
    )
    autoUpdater.on('update-downloaded', (info: UpdateInfoLike) =>
      this.update({ status: 'downloaded', availableVersion: info.version, progress: 100 })
    )
    autoUpdater.on('error', (error: Error) =>
      this.update({ status: 'error', error: error.message })
    )
  }

  getState(): ApplicationUpdateState {
    return { ...this.state }
  }

  async initialize(): Promise<void> {
    try {
      const parsed = JSON.parse(await readFile(this.options.statePath, 'utf8')) as unknown
      if (
        parsed &&
        typeof parsed === 'object' &&
        'lastNotifiedVersion' in parsed &&
        typeof parsed.lastNotifiedVersion === 'string'
      ) {
        this.notifiedVersion = parsed.lastNotifiedVersion
      }
    } catch {
      // Estado operacional ausente ou corrompido não impede o updater.
    }
  }

  async check(): Promise<void> {
    if (!app.isPackaged) {
      this.update({
        status: 'development',
        error: 'Atualizações do aplicativo estão disponíveis somente no build empacotado.'
      })
      return
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.update({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async download(): Promise<void> {
    if (!app.isPackaged) throw new Error('O download de atualização exige um build empacotado.')
    if (this.state.status !== 'available')
      throw new Error('Não existe atualização pronta para baixar.')
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.update({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  install(): void {
    if (!app.isPackaged) throw new Error('A instalação de atualização exige um build empacotado.')
    if (this.options.isOperationActive()) {
      throw new Error('Aguarde o download atual terminar antes de instalar a atualização.')
    }
    if (this.state.status !== 'downloaded') throw new Error('A atualização ainda não foi baixada.')
    this.update({ status: 'installing' })
    autoUpdater.quitAndInstall(false, true)
  }

  private update(change: Partial<ApplicationUpdateState>): void {
    this.state = {
      ...this.state,
      ...change,
      error: change.status === 'error' ? change.error : undefined
    }
    this.options.onStateChange()
  }

  private async persistNotificationState(): Promise<void> {
    const temporary = `${this.options.statePath}.tmp`
    await writeFile(
      temporary,
      `${JSON.stringify({ lastNotifiedVersion: this.notifiedVersion }, null, 2)}\n`,
      'utf8'
    )
    await rename(temporary, this.options.statePath)
  }
}
