import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  app: { isPackaged: true, getVersion: () => '0.3.0-beta' },
  handlers: new Map<string, (...arguments_: unknown[]) => void>(),
  checkForUpdates: vi.fn().mockResolvedValue(undefined),
  downloadUpdate: vi.fn().mockResolvedValue(undefined),
  quitAndInstall: vi.fn()
}))

vi.mock('electron', () => ({ app: mocks.app }))
vi.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    on: (event: string, handler: (...arguments_: unknown[]) => void) => {
      mocks.handlers.set(event, handler)
    },
    checkForUpdates: mocks.checkForUpdates,
    downloadUpdate: mocks.downloadUpdate,
    quitAndInstall: mocks.quitAndInstall
  }
}))

import { ApplicationUpdater } from './ApplicationUpdater'

describe('ApplicationUpdater', () => {
  const files: string[] = []

  beforeEach(() => {
    mocks.app.isPackaged = true
    mocks.handlers.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await Promise.all(files.splice(0).map((file) => rm(file, { force: true })))
  })

  function create(isOperationActive = false) {
    const statePath = join(process.cwd(), `.application-update-${crypto.randomUUID()}.json`)
    files.push(statePath, `${statePath}.tmp`)
    const notify = vi.fn()
    const updater = new ApplicationUpdater({
      isOperationActive: () => isOperationActive,
      onStateChange: vi.fn(),
      notify,
      statePath
    })
    return { updater, notify }
  }

  it('traduz os eventos do electron-updater para estado serializável', async () => {
    const { updater, notify } = create()
    mocks.handlers.get('checking-for-update')?.()
    expect(updater.getState().status).toBe('checking')
    mocks.handlers.get('update-available')?.({ version: '0.3.0' })
    expect(updater.getState()).toMatchObject({ status: 'available', availableVersion: '0.3.0' })
    expect(notify).toHaveBeenCalledOnce()
    mocks.handlers.get('download-progress')?.({ percent: 42.5 })
    expect(updater.getState()).toMatchObject({ status: 'downloading', progress: 42.5 })
    mocks.handlers.get('update-downloaded')?.({ version: '0.3.0' })
    expect(updater.getState()).toMatchObject({ status: 'downloaded', progress: 100 })
    await updater.download().catch(() => {})
  })

  it('não instala enquanto há uma operação de mídia ativa', () => {
    const { updater } = create(true)
    mocks.handlers.get('update-downloaded')?.({ version: '0.3.0' })
    expect(() => updater.install()).toThrow('Aguarde o download atual')
    expect(mocks.quitAndInstall).not.toHaveBeenCalled()
  })

  it('não trata desenvolvimento como erro fatal', async () => {
    mocks.app.isPackaged = false
    const { updater } = create()
    await updater.check()
    expect(updater.getState()).toMatchObject({ status: 'development' })
    expect(mocks.checkForUpdates).not.toHaveBeenCalled()
  })
})
