import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { UpdateSettings, YtDlpChannel } from '@shared/contracts/updates'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ComponentResolver } from './ComponentResolver'
import { ComponentUpdateManager } from './ComponentUpdateManager'

vi.mock('electron', () => ({
  app: { getAppPath: () => 'C:\\RoveTrack\\app.asar', isPackaged: true }
}))

const advanced: UpdateSettings = {
  mode: 'advanced',
  advanced: {
    ytDlp: {
      channel: 'nightly',
      autoCheck: true,
      notifyWhenAvailable: true,
      autoInstall: false
    }
  }
}

class FakeSource {
  version = 'A'

  async getLatest(channel: YtDlpChannel) {
    const assetName =
      process.platform === 'win32'
        ? process.arch === 'arm64'
          ? 'yt-dlp_arm64.exe'
          : 'yt-dlp.exe'
        : process.platform === 'darwin'
          ? 'yt-dlp_macos'
          : process.arch === 'arm64'
            ? 'yt-dlp_linux_aarch64'
            : 'yt-dlp_linux'
    return {
      version: this.version,
      channel,
      assetName,
      assetUrl: 'https://github.com/asset',
      assetSize: 1,
      checksumUrl: 'https://github.com/checksum'
    }
  }

  async downloadVerified(_release: unknown, destination: string): Promise<void> {
    await writeFile(destination, this.version)
  }
}

describe('ComponentUpdateManager', () => {
  const roots: string[] = []
  let source: FakeSource
  let activeRun: boolean
  let manager: ComponentUpdateManager

  beforeEach(async () => {
    const root = join(process.cwd(), `.test-components-${crypto.randomUUID()}`)
    roots.push(root)
    source = new FakeSource()
    activeRun = false
    manager = new ComponentUpdateManager({
      rootDirectory: root,
      resolver: new ComponentResolver(),
      releaseSource: source,
      isOperationActive: () => activeRun,
      onStateChange: vi.fn(),
      notify: vi.fn(),
      healthCheck: async (path) =>
        path.includes('node_modules') ? 'bundled-X' : (await readFile(path, 'utf8')).trim()
    })
    await manager.initialize()
    manager.configure(advanced)
  })

  afterEach(async () => {
    const { rm } = await import('node:fs/promises')
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('instala atomicamente e preserva a origem bundled como previous', async () => {
    await manager.install()
    expect(manager.getState()).toMatchObject({
      activeVersion: 'A',
      source: 'managed',
      previousVersion: 'bundled-X',
      previousSource: 'bundled'
    })
  })

  it('faz rollback offline para a versão managed anterior', async () => {
    await manager.install()
    source.version = 'B'
    await manager.install()
    expect(manager.getState().activeVersion).toBe('B')
    await manager.rollback()
    expect(manager.getState()).toMatchObject({
      activeVersion: 'A',
      previousVersion: 'B',
      source: 'managed'
    })
  })

  it('restaura bundled sem apagar a managed', async () => {
    await manager.install()
    await manager.restoreBundled()
    expect(manager.getState()).toMatchObject({
      activeVersion: 'bundled-X',
      source: 'bundled',
      previousVersion: 'A',
      previousSource: 'managed',
      managedInstalled: true
    })
  })

  it('mantém a versão ativa quando o health check do candidato falha', async () => {
    const failingRoot = join(process.cwd(), `.test-components-${crypto.randomUUID()}`)
    roots.push(failingRoot)
    const failing = new ComponentUpdateManager({
      rootDirectory: failingRoot,
      resolver: new ComponentResolver(),
      releaseSource: source,
      isOperationActive: () => false,
      onStateChange: vi.fn(),
      notify: vi.fn(),
      healthCheck: async (path) => {
        if (path.includes('.candidate-')) throw new Error('inválido')
        return 'bundled-X'
      }
    })
    await failing.initialize()
    failing.configure(advanced)
    await expect(failing.install()).rejects.toThrow('inválido')
    expect(failing.getState().source).toBe('bundled')
  })

  it('rejeita rollback sem previous e bloqueia trocas durante activeRun', async () => {
    await expect(manager.rollback()).rejects.toThrow('Não existe uma versão anterior')
    activeRun = true
    await expect(manager.install()).rejects.toThrow('Finalize o download atual')
    await expect(manager.restoreBundled()).rejects.toThrow('Finalize o download atual')
  })
})
