import { z } from 'zod'

export const updateModeSchema = z.enum(['managed', 'stable', 'advanced'])
export const ytDlpChannelSchema = z.enum(['stable', 'nightly', 'master'])
export const componentIdSchema = z.literal('yt-dlp')

export const updateSettingsSchema = z
  .object({
    mode: updateModeSchema,
    advanced: z
      .object({
        ytDlp: z
          .object({
            channel: ytDlpChannelSchema,
            autoCheck: z.boolean(),
            notifyWhenAvailable: z.boolean(),
            autoInstall: z.boolean()
          })
          .strict()
      })
      .strict()
  })
  .strict()

export const DEFAULT_UPDATE_SETTINGS: UpdateSettings = {
  mode: 'managed',
  advanced: {
    ytDlp: {
      channel: 'nightly',
      autoCheck: true,
      notifyWhenAvailable: true,
      autoInstall: false
    }
  }
}

export const applicationUpdateStatusSchema = z.enum([
  'development',
  'idle',
  'checking',
  'available',
  'not-available',
  'downloading',
  'downloaded',
  'installing',
  'error'
])

export const componentUpdateStatusSchema = z.enum([
  'idle',
  'checking',
  'available',
  'updating',
  'updated',
  'error',
  'unsupported'
])

export const applicationUpdateStateSchema = z
  .object({
    currentVersion: z.string(),
    availableVersion: z.string().optional(),
    status: applicationUpdateStatusSchema,
    progress: z.number().min(0).max(100).optional(),
    error: z.string().optional()
  })
  .strict()

export const componentUpdateStateSchema = z
  .object({
    id: componentIdSchema,
    bundledVersion: z.string().optional(),
    activeVersion: z.string().optional(),
    availableVersion: z.string().optional(),
    previousVersion: z.string().optional(),
    previousSource: z.enum(['bundled', 'managed']).optional(),
    channel: ytDlpChannelSchema.optional(),
    source: z.enum(['bundled', 'managed']),
    status: componentUpdateStatusSchema,
    lastCheckedAt: z.string().optional(),
    error: z.string().optional(),
    managedInstalled: z.boolean(),
    pendingInstall: z.boolean()
  })
  .strict()

export const updateStateSchema = z
  .object({
    application: applicationUpdateStateSchema,
    components: z.object({ ytDlp: componentUpdateStateSchema }).strict(),
    hasAvailableUpdate: z.boolean(),
    operationActive: z.boolean()
  })
  .strict()

export type UpdateMode = z.infer<typeof updateModeSchema>
export type YtDlpChannel = z.infer<typeof ytDlpChannelSchema>
export type ComponentId = z.infer<typeof componentIdSchema>
export type UpdateSettings = z.infer<typeof updateSettingsSchema>
export type ApplicationUpdateState = z.infer<typeof applicationUpdateStateSchema>
export type ComponentUpdateState = z.infer<typeof componentUpdateStateSchema>
export type UpdateState = z.infer<typeof updateStateSchema>
