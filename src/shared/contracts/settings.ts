import { z } from 'zod'
import { normalizeDomainInput } from '../security/urlAccessPolicy'
import { BUILTIN_ALLOWED_SITES } from '../sites/catalog'
import { mediaQualitySchema, thumbnailOptionsSchema } from './media'

export const APP_SETTINGS_SCHEMA_VERSION = 1 as const

const normalizedDomainSchema = z
  .string()
  .min(1)
  .refine(
    (domain) => {
      try {
        return normalizeDomainInput(domain) === domain
      } catch {
        return false
      }
    },
    { message: 'O domínio precisa ser público e estar em formato canônico.' }
  )

export const allowedSiteSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    domains: z.array(normalizedDomainSchema).min(1),
    enabled: z.boolean(),
    builtin: z.boolean()
  })
  .strict()

export const downloadPresetSchema = z
  .object({
    id: z.enum(['music', 'video']),
    name: z.string().min(1),
    mediaType: z.enum(['audio', 'video']),
    outputFormat: z.enum(['mp3', 'mp4']),
    quality: mediaQualitySchema,
    thumbnail: thumbnailOptionsSchema,
    builtin: z.literal(true)
  })
  .strict()

export const appSettingsSchema = z
  .object({
    schemaVersion: z.literal(APP_SETTINGS_SCHEMA_VERSION),
    allowedSites: z.array(allowedSiteSchema),
    downloadPresets: z.array(downloadPresetSchema).length(2)
  })
  .strict()
  .superRefine((settings, context) => {
    const music = settings.downloadPresets.find((preset) => preset.id === 'music')
    const video = settings.downloadPresets.find((preset) => preset.id === 'video')
    if (music?.mediaType !== 'audio' || music.outputFormat !== 'mp3') {
      context.addIssue({
        code: 'custom',
        path: ['downloadPresets'],
        message: 'Preset Música inválido.'
      })
    }
    if (video?.mediaType !== 'video' || video.outputFormat !== 'mp4') {
      context.addIssue({
        code: 'custom',
        path: ['downloadPresets'],
        message: 'Preset Vídeo inválido.'
      })
    }
  })

export type AllowedSite = z.infer<typeof allowedSiteSchema>
export type DownloadPreset = z.infer<typeof downloadPresetSchema>
export type AppSettings = z.infer<typeof appSettingsSchema>

export const DEFAULT_DOWNLOAD_PRESETS: readonly DownloadPreset[] = [
  {
    id: 'music',
    name: 'Música',
    mediaType: 'audio',
    outputFormat: 'mp3',
    quality: 'best',
    thumbnail: { enabled: true, aspectRatio: '1:1', quality: 'best', outputFormat: 'jpg' },
    builtin: true
  },
  {
    id: 'video',
    name: 'Vídeo',
    mediaType: 'video',
    outputFormat: 'mp4',
    quality: 'best',
    thumbnail: { enabled: false, aspectRatio: '16:9', quality: 'best', outputFormat: 'jpg' },
    builtin: true
  }
]

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  allowedSites: BUILTIN_ALLOWED_SITES.map((site) => ({ ...site, domains: [...site.domains] })),
  downloadPresets: DEFAULT_DOWNLOAD_PRESETS.map((preset) => ({
    ...preset,
    thumbnail: { ...preset.thumbnail }
  }))
}

export function cloneDefaultSettings(): AppSettings {
  return structuredClone(DEFAULT_APP_SETTINGS)
}

export function parseAppSettings(input: unknown): AppSettings {
  if (input && typeof input === 'object' && !Array.isArray(input) && !('schemaVersion' in input)) {
    return appSettingsSchema.parse({ ...input, schemaVersion: APP_SETTINGS_SCHEMA_VERSION })
  }
  return appSettingsSchema.parse(input)
}
