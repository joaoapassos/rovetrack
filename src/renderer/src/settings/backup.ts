import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  backupSchema,
  type RoveTrackBackup
} from '@shared/contracts/backup'
import type { AppSettings } from '@shared/contracts/settings'
import type { DownloadHistoryEntry } from '../types/downloadHistory'

export type BackupScope = 'settings' | 'history' | 'all'

export function createBackup(
  scope: BackupScope,
  settings: AppSettings,
  history: DownloadHistoryEntry[]
): RoveTrackBackup {
  return backupSchema.parse({
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    applicationVersion: '0.2.0-beta',
    sections: {
      ...(scope !== 'history' && { settings }),
      ...(scope !== 'settings' && { history })
    }
  })
}

export function parseBackup(input: unknown): RoveTrackBackup {
  return backupSchema.parse(input)
}
