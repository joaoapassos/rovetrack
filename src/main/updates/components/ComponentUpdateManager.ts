import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { ComponentUpdateState, UpdateSettings, YtDlpChannel } from '@shared/contracts/updates'
import { DEFAULT_UPDATE_SETTINGS } from '@shared/contracts/updates'
import { z } from 'zod'
import { type ComponentResolver, resolveBundledYtDlpPath } from './ComponentResolver'
import { YtDlpReleaseSource } from './yt-dlp/YtDlpReleaseSource'

const COMPONENT_STATE_SCHEMA_VERSION = 1 as const
const AUTO_CHECK_COOLDOWN_MS = 24 * 60 * 60 * 1000
const HEALTH_CHECK_TIMEOUT_MS = 15_000

const storedStateSchema = z
  .object({
    schemaVersion: z.literal(COMPONENT_STATE_SCHEMA_VERSION),
    activeSource: z.enum(['bundled', 'managed']),
    activeVersion: z.string().optional(),
    activeChannel: z.enum(['stable', 'nightly', 'master']).optional(),
    previousSource: z.enum(['bundled', 'managed']).optional(),
    previousVersion: z.string().optional(),
    previousChannel: z.enum(['stable', 'nightly', 'master']).optional(),
    lastCheckedAt: z.string().optional(),
    lastNotifiedVersion: z.string().optional()
  })
  .strict()

type StoredState = z.infer<typeof storedStateSchema>

const initialStoredState = (): StoredState => ({
  schemaVersion: COMPONENT_STATE_SCHEMA_VERSION,
  activeSource: 'bundled'
})

export interface ComponentManagerOptions {
  rootDirectory: string
  resolver: ComponentResolver
  releaseSource?: YtDlpReleaseSource
  isOperationActive: () => boolean
  onStateChange: () => void
  notify: (title: string, body: string) => void
  healthCheck?: (path: string) => Promise<string>
}

function runVersion(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      path,
      ['--version'],
      { timeout: HEALTH_CHECK_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => {
        if (error) return reject(new Error(`O health check do yt-dlp falhou: ${error.message}`))
        const version = stdout.trim().split(/\r?\n/)[0]
        if (!version) return reject(new Error('O yt-dlp não informou sua versão.'))
        resolve(version)
      }
    )
  })
}

export class ComponentUpdateManager {
  private settings: UpdateSettings = structuredClone(DEFAULT_UPDATE_SETTINGS)
  private stored: StoredState = initialStoredState()
  private bundledVersion?: string
  private availableVersion?: string
  private status: ComponentUpdateState['status'] = 'idle'
  private error?: string
  private pendingInstall = false
  private readonly statePath: string
  private readonly source: YtDlpReleaseSource
  private readonly healthCheck: (path: string) => Promise<string>

  constructor(private readonly options: ComponentManagerOptions) {
    this.statePath = join(options.rootDirectory, 'state.json')
    this.source = options.releaseSource ?? new YtDlpReleaseSource()
    this.healthCheck = options.healthCheck ?? runVersion
  }

  async initialize(): Promise<void> {
    await mkdir(this.options.rootDirectory, { recursive: true })
    try {
      this.stored = storedStateSchema.parse(JSON.parse(await readFile(this.statePath, 'utf8')))
    } catch {
      this.stored = initialStoredState()
    }
    try {
      this.bundledVersion = await this.healthCheck(resolveBundledYtDlpPath())
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error)
    }
    await this.activateResolverFromState()
    await this.persist()
    this.emit()
  }

  configure(settings: UpdateSettings): void {
    this.settings = structuredClone(settings)
    this.options.resolver.configure(settings.mode)
    if (settings.mode === 'managed') {
      this.availableVersion = undefined
      this.pendingInstall = false
      this.status = 'idle'
      this.error = undefined
    }
    this.emit()
  }

  getState(): ComponentUpdateState {
    const useManaged = this.settings.mode !== 'managed' && this.stored.activeSource === 'managed'
    return {
      id: 'yt-dlp',
      bundledVersion: this.bundledVersion,
      activeVersion: useManaged ? this.stored.activeVersion : this.bundledVersion,
      availableVersion: this.availableVersion,
      previousVersion: this.stored.previousVersion,
      previousSource: this.stored.previousSource,
      channel: this.settings.mode === 'stable' ? 'stable' : this.settings.advanced.ytDlp.channel,
      source: useManaged ? 'managed' : 'bundled',
      status: this.status,
      lastCheckedAt: this.stored.lastCheckedAt,
      error: this.error,
      managedInstalled:
        this.stored.activeSource === 'managed' || this.stored.previousSource === 'managed',
      pendingInstall: this.pendingInstall
    }
  }

  async check(automatic = false): Promise<void> {
    if (this.settings.mode === 'managed') return
    if (automatic && !this.shouldAutoCheck()) return
    const channel = this.channel()
    this.setStatus('checking')
    try {
      const release = await this.source.getLatest(channel)
      this.stored.lastCheckedAt = new Date().toISOString()
      this.availableVersion =
        release.version !== this.getState().activeVersion ? release.version : undefined
      this.setStatus(this.availableVersion ? 'available' : 'updated')
      if (
        this.availableVersion &&
        this.shouldNotify() &&
        this.stored.lastNotifiedVersion !== release.version
      ) {
        this.options.notify(
          'RoveTrack: atualização disponível',
          `yt-dlp ${release.version} está disponível.`
        )
        this.stored.lastNotifiedVersion = release.version
      }
      await this.persist()
      if (this.availableVersion && this.shouldAutoInstall()) {
        if (this.options.isOperationActive()) {
          this.pendingInstall = true
          this.emit()
        } else await this.install()
      }
    } catch (error) {
      this.fail(error)
    }
  }

  async install(): Promise<void> {
    this.assertIdleOperation()
    if (this.settings.mode === 'managed') {
      throw new Error('O modo Gerenciado utiliza exclusivamente o yt-dlp incluído no RoveTrack.')
    }
    const channel = this.channel()
    this.setStatus('updating')
    const temporaryPath = join(this.options.rootDirectory, `.candidate-${randomUUID()}`)
    try {
      const release = await this.source.getLatest(channel)
      if (release.version === this.stored.activeVersion && this.stored.activeSource === 'managed') {
        throw new Error('Esta versão do yt-dlp já está ativa.')
      }
      const versionDirectory = join(this.options.rootDirectory, release.version)
      const finalPath = join(versionDirectory, release.assetName)
      await this.source.downloadVerified(release, temporaryPath)
      if (process.platform !== 'win32') await chmod(temporaryPath, 0o755)
      const version = await this.healthCheck(temporaryPath)
      await mkdir(versionDirectory, { recursive: true })
      await rm(finalPath, { force: true })
      await rename(temporaryPath, finalPath)
      const previousSource = this.stored.activeSource
      const previousVersion =
        previousSource === 'managed' ? this.stored.activeVersion : this.bundledVersion
      const previousChannel = this.stored.activeChannel
      const nextState: StoredState = {
        ...this.stored,
        activeSource: 'managed',
        activeVersion: version,
        activeChannel: channel,
        previousSource,
        previousVersion,
        previousChannel
      }
      await this.commitActiveState(nextState, finalPath)
      this.availableVersion = undefined
      this.pendingInstall = false
      await this.pruneManagedVersions().catch((error) =>
        console.warn('[updates] Não foi possível remover versões antigas do yt-dlp:', error)
      )
      this.setStatus('updated')
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => {})
      this.fail(error)
      throw error
    }
  }

  async rollback(): Promise<void> {
    this.assertIdleOperation()
    const { previousSource, previousVersion, previousChannel } = this.stored
    if (!previousSource || !previousVersion)
      throw new Error('Não existe uma versão anterior disponível.')
    const previousPath =
      previousSource === 'bundled'
        ? resolveBundledYtDlpPath()
        : this.managedPath(previousVersion, previousChannel)
    const checkedVersion = await this.healthCheck(previousPath)
    const currentSource = this.stored.activeSource
    const currentVersion = this.stored.activeVersion ?? this.bundledVersion
    const currentChannel = this.stored.activeChannel
    const nextState: StoredState = {
      ...this.stored,
      activeSource: previousSource,
      activeVersion: checkedVersion,
      activeChannel: previousSource === 'managed' ? previousChannel : undefined,
      previousSource: currentSource,
      previousVersion: currentVersion,
      previousChannel: currentChannel
    }
    await this.commitActiveState(nextState, previousSource === 'managed' ? previousPath : null)
    this.setStatus('updated')
  }

  async restoreBundled(): Promise<void> {
    this.assertIdleOperation()
    const version = await this.healthCheck(resolveBundledYtDlpPath())
    const nextState: StoredState = {
      ...this.stored,
      activeSource: 'bundled',
      activeVersion: version,
      activeChannel: undefined,
      ...(this.stored.activeSource === 'managed' && {
        previousSource: 'managed' as const,
        previousVersion: this.stored.activeVersion,
        previousChannel: this.stored.activeChannel
      })
    }
    await this.commitActiveState(nextState, null)
    this.setStatus('updated')
  }

  async processPendingInstall(): Promise<void> {
    if (!this.pendingInstall || this.options.isOperationActive()) return
    await this.install().catch(() => {})
  }

  private managedPath(version: string, channel?: YtDlpChannel): string {
    const asset =
      process.platform === 'win32'
        ? process.arch === 'arm64'
          ? 'yt-dlp_arm64.exe'
          : 'yt-dlp.exe'
        : process.platform === 'darwin'
          ? 'yt-dlp_macos'
          : process.arch === 'arm64'
            ? 'yt-dlp_linux_aarch64'
            : 'yt-dlp_linux'
    void channel
    return join(this.options.rootDirectory, version, asset)
  }

  private async activateResolverFromState(): Promise<void> {
    if (this.stored.activeSource !== 'managed' || !this.stored.activeVersion) {
      this.options.resolver.activateManaged(null)
      return
    }
    const path = this.managedPath(this.stored.activeVersion, this.stored.activeChannel)
    try {
      this.stored.activeVersion = await this.healthCheck(path)
      this.options.resolver.activateManaged(path)
    } catch {
      this.stored.activeSource = 'bundled'
      this.stored.activeVersion = this.bundledVersion
      this.stored.activeChannel = undefined
      this.options.resolver.activateManaged(null)
    }
  }

  private async commitActiveState(
    nextState: StoredState,
    managedPath: string | null
  ): Promise<void> {
    const previousState = this.stored
    this.stored = nextState
    try {
      await this.persist()
    } catch (error) {
      this.stored = previousState
      throw error
    }
    this.options.resolver.activateManaged(managedPath)
  }

  private async pruneManagedVersions(): Promise<void> {
    const keep = new Set<string>()
    if (this.stored.activeSource === 'managed' && this.stored.activeVersion) {
      keep.add(this.stored.activeVersion)
    }
    if (this.stored.previousSource === 'managed' && this.stored.previousVersion) {
      keep.add(this.stored.previousVersion)
    }
    const root = resolve(this.options.rootDirectory)
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (
        !entry.isDirectory() ||
        keep.has(entry.name) ||
        !/^[0-9A-Za-z._-]{1,80}$/.test(entry.name)
      ) {
        continue
      }
      const target = resolve(root, entry.name)
      if (dirname(target) !== root) continue
      await rm(target, { recursive: true, force: true })
    }
  }

  private channel(): YtDlpChannel {
    return this.settings.mode === 'stable' ? 'stable' : this.settings.advanced.ytDlp.channel
  }

  private shouldAutoCheck(): boolean {
    if (this.settings.mode === 'managed') return false
    if (this.settings.mode === 'advanced' && !this.settings.advanced.ytDlp.autoCheck) return false
    const last = this.stored.lastCheckedAt ? Date.parse(this.stored.lastCheckedAt) : 0
    return !last || Date.now() - last >= AUTO_CHECK_COOLDOWN_MS
  }

  private shouldNotify(): boolean {
    return this.settings.mode === 'stable' || this.settings.advanced.ytDlp.notifyWhenAvailable
  }

  private shouldAutoInstall(): boolean {
    return this.settings.mode === 'advanced' && this.settings.advanced.ytDlp.autoInstall
  }

  private assertIdleOperation(): void {
    if (this.options.isOperationActive()) {
      throw new Error('Finalize o download atual antes de trocar a versão do yt-dlp.')
    }
  }

  private async persist(): Promise<void> {
    const temporary = `${this.statePath}.tmp`
    await writeFile(temporary, `${JSON.stringify(this.stored, null, 2)}\n`, 'utf8')
    await rename(temporary, this.statePath)
  }

  private setStatus(status: ComponentUpdateState['status']): void {
    this.status = status
    this.error = undefined
    this.emit()
  }

  private fail(error: unknown): void {
    this.status = 'error'
    this.error = error instanceof Error ? error.message : String(error)
    this.emit()
  }

  private emit(): void {
    this.options.onStateChange()
  }
}

export { AUTO_CHECK_COOLDOWN_MS, runVersion, storedStateSchema }
