import { z } from 'zod'

const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be'
])

export const downloadFormSchema = z.object({
  url: z.url('É necessário um link válido do YouTube.').refine((value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:' && youtubeHosts.has(parsed.hostname.toLowerCase())
    } catch {
      return false
    }
  }, 'Informe uma URL HTTPS válida do YouTube.'),
  outputDir: z.string().min(1, 'Defina o caminho de destino para a expedição.')
})

export type DownloadFormData = z.infer<typeof downloadFormSchema>
