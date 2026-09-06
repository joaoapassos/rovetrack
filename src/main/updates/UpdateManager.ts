import { join } from 'node:path'
import type { UpdateSettings, UpdateState } from '@shared/contracts/updates'
import { app, BrowserWindow, Notification } from 'electron'
import icon from '../../../resources/icon.png?asset'
import { ApplicationUpdater } from './ApplicationUpdater'
import { ComponentResolver } from './components/ComponentResolver'
import { ComponentUpdateManager } from './components/ComponentUpdateManager'

export interface UpdateManagerOptions {
  isOperationActive: () => boolean
  nativeNotificationsEnabled: () => boolean
  componentResolver?: ComponentResolver
}

export class UpdateManager {
  readonly componentResolver: ComponentResolver
  readonly application: ApplicationUpdater
  readonly components: ComponentUpdateManager

  constructor(private readonly options: UpdateManagerOptions) {
    this.componentResolver = options.componentResolver ?? new ComponentResolver()
    const onStateChange = () => this.emit()
    const notify = (title: string, body: string) => this.notify(title, body)
    this.application = new ApplicationUpdater({
      isOperationActive: options.isOperationActive,
      onStateChange,
      notify,
      statePath: join(app.getPath('userData'), 'application-update-state.json')
    })
    this.components = new ComponentUpdateManager({
      rootDirectory: join(app.getPath('userData'), 'components', 'yt-dlp'),
      resolver: this.componentResolver,
      isOperationActive: options.isOperationActive,
      onStateChange,
      notify
    })
  }

  async initialize(): Promise<void> {
    await Promise.all([this.application.initialize(), this.components.initialize()])
  }

  getState(): UpdateState {
    const application = this.application.getState()
    const ytDlp = this.components.getState()
    return {
      application,
      components: { ytDlp },
      hasAvailableUpdate:
        ['available', 'downloaded'].includes(application.status) ||
        ytDlp.status === 'available' ||
        ytDlp.pendingInstall,
      operationActive: this.options.isOperationActive()
    }
  }

  configure(settings: UpdateSettings): void {
    this.components.configure(settings)
    if (settings.mode !== 'managed') void this.components.check(true)
  }

  async startupCheck(): Promise<void> {
    await Promise.allSettled([this.application.check(), this.components.check(true)])
  }

  operationFinished(): void {
    this.emit()
    void this.components.processPendingInstall()
  }

  operationChanged(): void {
    this.emit()
  }

  private emit(): void {
    const state = this.getState()
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('updates:state', state)
    }
  }

  private notify(title: string, body: string): void {
    if (!this.options.nativeNotificationsEnabled() || !Notification.isSupported()) return
    new Notification({ title, body, icon, silent: true }).show()
  }
}
