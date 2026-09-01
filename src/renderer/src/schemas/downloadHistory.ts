import { mediaDownloadRequestSchema } from '@shared/contracts/media'
import { pipelineReportSchema } from '@shared/contracts/pipeline'
import { z } from 'zod'

export const HISTORY_SCHEMA_VERSION = 3 as const
export const HISTORY_LIMIT = 100

const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))
const trackSchema = z.object({
  trackId: z.string(),
  title: z.string().optional(),
  status: z.enum(['success', 'error'])
})
const historyStatusSchema = z.enum(['success', 'partial', 'interrupted', 'error'])
const baseEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: dateStringSchema,
  url: z.url(),
  outputDir: z.string().min(1),
  status: historyStatusSchema,
  name: z.string().min(1),
  kind: z.enum(['track', 'playlist']),
  tracks: z.array(trackSchema),
  report: pipelineReportSchema
})

export const currentHistoryEntrySchema = baseEntrySchema.extend({
  schemaVersion: z.literal(HISTORY_SCHEMA_VERSION),
  request: mediaDownloadRequestSchema
})

export const versionTwoHistoryEntrySchema = baseEntrySchema.extend({
  schemaVersion: z.literal(2)
})

export const versionOneHistoryEntrySchema = baseEntrySchema.extend({
  status: z.enum(['success', 'partial', 'error']),
  schemaVersion: z.literal(1)
})

export const legacyHistoryEntrySchema = baseEntrySchema
  .omit({ status: true })
  .extend({ status: z.enum(['success', 'error']), schemaVersion: z.undefined().optional() })
