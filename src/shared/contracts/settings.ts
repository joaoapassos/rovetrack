import { z } from 'zod'
import { normalizeDomainInput } from '../security/urlAccessPolicy'
import { BUILTIN_ALLOWED_SITES } from '../sites/catalog'
import {
  AUDIO_OUTPUT_FORMATS,
  mediaQualitySchema,
  outputFormatSchema,
  thumbnailOptionsSchema,
  VIDEO_OUTPUT_FORMATS
} from './media'
import { DEFAULT_UPDATE_SETTINGS, updateSettingsSchema } from './updates'

export const APP_SETTINGS_SCHEMA_VERSION = 3 as const

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
    label: z.string().trim().min(1),
    domains: z.array(normalizedDomainSchema).max(20),
    enabled: z.boolean(),
    builtin: z.boolean()
  })
  .strict()

export const downloadPresetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    mediaType: z.enum(['audio', 'video']),
    outputFormat: outputFormatSchema,
    quality: mediaQualitySchema,
    thumbnail: thumbnailOptionsSchema,
    builtin: z.boolean()
  })
  .strict()
  .superRefine((preset, context) => {
    const formats = preset.mediaType === 'audio' ? AUDIO_OUTPUT_FORMATS : VIDEO_OUTPUT_FORMATS
    if (!formats.includes(preset.outputFormat as never)) {
      context.addIssue({
        code: 'custom',
        path: ['outputFormat'],
        message: 'O formato não é compatível com o tipo de mídia.'
      })
    }
  })

export const notificationSettingsSchema = z
  .object({
    volume: z.number().int().min(0).max(100),
    lastAudibleVolume: z.number().int().min(1).max(100),
    nativeEnabled: z.boolean()
  })
  .strict()

export const appSettingsSchema = z
  .object({
    schemaVersion: z.literal(APP_SETTINGS_SCHEMA_VERSION),
    allowedSites: z.array(allowedSiteSchema).max(100),
    downloadPresets: z.array(downloadPresetSchema).min(1).max(50),
    notifications: notificationSettingsSchema,
    updates: updateSettingsSchema
  })
  .strict()
  .superRefine((settings, context) => {
    for (const [field, values] of [
      ['allowedSites', settings.allowedSites],
      ['downloadPresets', settings.downloadPresets]
    ] as const) {
      if (new Set(values.map((value) => value.id)).size !== values.length) {
        context.addIssue({ code: 'custom', path: [field], message: 'Os IDs precisam ser únicos.' })
      }
    }
  })

export type AllowedSite = z.infer<typeof allowedSiteSchema>
export type DownloadPreset = z.infer<typeof downloadPresetSchema>
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>
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

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  volume: 50,
  lastAudibleVolume: 50,
  nativeEnabled: true
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  allowedSites: BUILTIN_ALLOWED_SITES.map((site) => ({ ...site, domains: [...site.domains] })),
  downloadPresets: DEFAULT_DOWNLOAD_PRESETS.map((preset) => ({
    ...preset,
    thumbnail: { ...preset.thumbnail }
  })),
  notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
  updates: structuredClone(DEFAULT_UPDATE_SETTINGS)
}

export function cloneDefaultSettings(): AppSettings {
  return structuredClone(DEFAULT_APP_SETTINGS)
}

export function parseAppSettings(input: unknown): AppSettings {
  const current = appSettingsSchema.safeParse(input)
  if (current.success) return current.data

  if (!input || typeof input !== 'object' || Array.isArray(input))
    return appSettingsSchema.parse(input)
  const legacy = input as Record<string, unknown>
  if (![undefined, 1, 2].includes(legacy.schemaVersion as never)) {
    return appSettingsSchema.parse(input)
  }

  return appSettingsSchema.parse({
    ...legacy,
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
    notifications: legacy.notifications ?? DEFAULT_NOTIFICATION_SETTINGS,
    updates: DEFAULT_UPDATE_SETTINGS
  })
}
