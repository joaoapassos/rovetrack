import { z } from 'zod'

export const AUDIO_OUTPUT_FORMATS = [
  'mp3',
  'm4a',
  'opus',
  'flac',
  'wav',
  'aac',
  'vorbis',
  'alac'
] as const
export const VIDEO_OUTPUT_FORMATS = ['mp4', 'webm', 'mkv', 'mov', 'avi'] as const

export const mediaTypeSchema = z.enum(['audio', 'video'])
export const outputFormatSchema = z.enum([...AUDIO_OUTPUT_FORMATS, ...VIDEO_OUTPUT_FORMATS])
export const mediaQualitySchema = z.enum(['best', 'high', 'medium', 'low'])
export const thumbnailAspectRatioSchema = z.enum(['1:1', '16:9'])
export const thumbnailQualitySchema = z.enum(['best', 'high', 'medium', 'low'])
export const thumbnailOutputFormatSchema = z.enum(['jpg', 'png', 'webp'])

export const thumbnailOptionsSchema = z
  .object({
    enabled: z.boolean(),
    aspectRatio: thumbnailAspectRatioSchema,
    quality: thumbnailQualitySchema,
    outputFormat: thumbnailOutputFormatSchema
  })
  .strict()

export const mediaDownloadRequestSchema = z
  .object({
    sourceUrl: z.url('Informe uma URL válida.').refine(
      (value) => {
        try {
          return new URL(value).protocol === 'https:'
        } catch {
          return false
        }
      },
      { message: 'Somente URLs HTTPS são permitidas.' }
    ),
    destinationDirectory: z.string().trim().min(1, 'O diretório de destino é obrigatório.'),
    mediaType: mediaTypeSchema,
    outputFormat: outputFormatSchema,
    quality: mediaQualitySchema,
    thumbnail: thumbnailOptionsSchema
  })
  .strict()
  .superRefine((request, context) => {
    const supported =
      (request.mediaType === 'audio' &&
        AUDIO_OUTPUT_FORMATS.includes(
          request.outputFormat as (typeof AUDIO_OUTPUT_FORMATS)[number]
        )) ||
      (request.mediaType === 'video' &&
        VIDEO_OUTPUT_FORMATS.includes(
          request.outputFormat as (typeof VIDEO_OUTPUT_FORMATS)[number]
        ))
    if (!supported) {
      context.addIssue({
        code: 'custom',
        path: ['outputFormat'],
        message: 'A combinação de mídia e formato não é suportada.'
      })
    }
  })

export const processMediaPayloadSchema = z
  .object({
    runId: z.uuid(),
    request: mediaDownloadRequestSchema,
    allowedDomains: z.array(z.string().min(1)).max(2000)
  })
  .strict()

export type MediaType = z.infer<typeof mediaTypeSchema>
export type OutputFormat = z.infer<typeof outputFormatSchema>
export type MediaQuality = z.infer<typeof mediaQualitySchema>
export type ThumbnailOptions = z.infer<typeof thumbnailOptionsSchema>
export type MediaDownloadRequest = z.infer<typeof mediaDownloadRequestSchema>
export type ProcessMediaPayload = z.infer<typeof processMediaPayloadSchema>
