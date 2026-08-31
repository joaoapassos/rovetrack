import { z } from 'zod'

export const mediaTypeSchema = z.enum(['audio', 'video', 'image'])
export const outputFormatSchema = z.enum(['mp3', 'mp4', 'webm', 'jpg', 'png'])

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
    outputFormat: outputFormatSchema
  })
  .strict()

export const processMediaPayloadSchema = z
  .object({
    runId: z.uuid(),
    request: mediaDownloadRequestSchema
  })
  .strict()

export type MediaType = z.infer<typeof mediaTypeSchema>
export type OutputFormat = z.infer<typeof outputFormatSchema>
export type MediaDownloadRequest = z.infer<typeof mediaDownloadRequestSchema>
export type ProcessMediaPayload = z.infer<typeof processMediaPayloadSchema>
