import { access } from 'node:fs/promises'
import { join } from 'node:path'
import type { UpdateMode } from '@shared/contracts/updates'
import { app } from 'electron'

export function resolveBundledYtDlpPath(): string {
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  const path = join(app.getAppPath(), 'node_modules', 'yt-dlp-exec', 'bin', binaryName)
  return app.isPackaged ? path.replace('app.asar', 'app.asar.unpacked') : path
}

export class ComponentResolver {
  private mode: UpdateMode = 'managed'
  private managedPath: string | null = null

  configure(mode: UpdateMode): void {
    this.mode = mode
  }

  activateManaged(path: string | null): void {
    this.managedPath = path
  }

  resolveYtDlp(): string {
    if (this.mode !== 'managed' && this.managedPath) return this.managedPath
    return resolveBundledYtDlpPath()
  }

  async hasValidManagedPath(): Promise<boolean> {
    if (!this.managedPath) return false
    try {
      await access(this.managedPath)
      return true
    } catch {
      this.managedPath = null
      return false
    }
  }
}
