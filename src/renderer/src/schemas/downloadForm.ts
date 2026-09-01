import {
  mediaQualitySchema,
  thumbnailAspectRatioSchema,
  thumbnailOutputFormatSchema,
  thumbnailQualitySchema
} from '@shared/contracts/media'
import { z } from 'zod'

export const downloadFormSchema = z.object({
  url: z.url('É necessário um link válido.').refine((value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:'
    } catch {
      return false
    }
  }, 'Informe uma URL HTTPS válida.'),
  outputDir: z.string().min(1, 'Defina o caminho de destino para a expedição.'),
  presetId: z.enum(['music', 'video']),
  mediaType: z.enum(['audio', 'video']),
  quality: mediaQualitySchema,
  thumbnailEnabled: z.boolean(),
  thumbnailAspectRatio: thumbnailAspectRatioSchema,
  thumbnailQuality: thumbnailQualitySchema,
  thumbnailOutputFormat: thumbnailOutputFormatSchema
})

export type DownloadFormData = z.infer<typeof downloadFormSchema>
