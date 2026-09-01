import { z } from 'zod'

export const mediaTypeSchema = z.enum(['audio', 'video', 'image'])
export const outputFormatSchema = z.enum(['mp3', 'mp4', 'webm', 'jpg', 'png'])
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
      (request.mediaType === 'audio' && request.outputFormat === 'mp3') ||
      (request.mediaType === 'video' && request.outputFormat === 'mp4')
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
    allowedDomains: z.array(z.string().min(1)).min(1).max(100)
  })
  .strict()

export type MediaType = z.infer<typeof mediaTypeSchema>
export type OutputFormat = z.infer<typeof outputFormatSchema>
export type MediaQuality = z.infer<typeof mediaQualitySchema>
export type ThumbnailOptions = z.infer<typeof thumbnailOptionsSchema>
export type MediaDownloadRequest = z.infer<typeof mediaDownloadRequestSchema>
export type ProcessMediaPayload = z.infer<typeof processMediaPayloadSchema>
