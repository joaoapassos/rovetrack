import { z } from 'zod'
import { mediaDownloadRequestSchema } from './media'
import { pipelineReportSchema } from './pipeline'
import { parseAppSettings } from './settings'

const migratedAppSettingsSchema = z.unknown().transform((value, context) => {
  try {
    return parseAppSettings(value)
  } catch {
    context.addIssue({ code: 'custom', message: 'As configurações do backup são inválidas.' })
    return z.NEVER
  }
})

export const BACKUP_SCHEMA_VERSION = 1 as const
export const BACKUP_FORMAT = 'rovetrack-backup' as const
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

const historyEntrySchema = z
  .object({
    schemaVersion: z.literal(3),
    id: z.string().min(1),
    createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
    url: z.url(),
    outputDir: z.string().min(1),
    status: z.enum(['success', 'partial', 'interrupted', 'error']),
    name: z.string().min(1),
    kind: z.enum(['track', 'playlist']),
    tracks: z.array(
      z.object({
        trackId: z.string(),
        title: z.string().optional(),
        status: z.enum(['success', 'error'])
      })
    ),
    report: pipelineReportSchema,
    request: mediaDownloadRequestSchema
  })
  .strict()

export const backupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
    applicationVersion: z.string().min(1),
    sections: z
      .object({
        settings: migratedAppSettingsSchema.optional(),
        history: z.array(historyEntrySchema).max(100).optional()
      })
      .strict()
      .refine((sections) => sections.settings !== undefined || sections.history !== undefined, {
        message: 'O backup não contém seções.'
      })
  })
  .strict()

export type RoveTrackBackup = z.infer<typeof backupSchema>
