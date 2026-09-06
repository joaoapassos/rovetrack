import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  backupSchema,
  type RovetrackBackup
} from '@shared/contracts/backup'
import type { AppSettings } from '@shared/contracts/settings'
import type { DownloadHistoryEntry } from '../types/downloadHistory'

export type BackupScope = 'settings' | 'history' | 'all'

export function createBackup(
  scope: BackupScope,
  settings: AppSettings,
  history: DownloadHistoryEntry[],
  applicationVersion: string
): RovetrackBackup {
  return backupSchema.parse({
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    applicationVersion,
    sections: {
      ...(scope !== 'history' && { settings }),
      ...(scope !== 'settings' && { history })
    }
  })
}

export function parseBackup(input: unknown): RovetrackBackup {
  return backupSchema.parse(input)
}
