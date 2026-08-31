import { z } from 'zod'

export const pipelineStatusSchema = z.enum([
  'idle',
  'preparing',
  'downloading',
  'forging',
  'success',
  'partial',
  'interrupted',
  'error'
])

export const pipelineReportErrorSchema = z.object({
  trackId: z.string(),
  title: z.string().optional(),
  reason: z.string(),
  category: z
    .enum([
      'access',
      'authentication',
      'availability',
      'configuration',
      'network',
      'postprocessing',
      'unknown'
    ])
    .optional(),
  suggestion: z.string().optional(),
  technicalDetails: z.string().optional(),
  retryable: z.boolean().optional()
})

export const pipelineReportTrackSchema = z.object({
  trackId: z.string(),
  title: z.string().optional(),
  status: z.enum(['success', 'error'])
})

export const pipelineReportSchema = z.object({
  runId: z.string().optional(),
  total: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(pipelineReportErrorSchema),
  tracks: z.array(pipelineReportTrackSchema),
  source: z
    .object({
      title: z.string().optional(),
      collectionTitle: z.string().optional()
    })
    .optional()
})

export type PipelineStatus = z.infer<typeof pipelineStatusSchema>
export type PipelineReportError = z.infer<typeof pipelineReportErrorSchema>
export type PipelineReportTrack = z.infer<typeof pipelineReportTrackSchema>
export type PipelineReport = z.infer<typeof pipelineReportSchema>

export interface PipelineState {
  runId: string
  status: PipelineStatus
  message: string
  progress: number
  step: {
    current: number
    total: number
  }
  batch: {
    current: number
    total: number
  }
  metadata?: {
    title?: string
  }
  report: PipelineReport
}
