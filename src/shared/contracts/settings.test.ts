import { describe, expect, it } from 'vitest'
import {
  APP_SETTINGS_SCHEMA_VERSION,
  appSettingsSchema,
  cloneDefaultSettings,
  DEFAULT_DOWNLOAD_PRESETS,
  parseAppSettings
} from './settings'

describe('AppSettings', () => {
  it('possui defaults únicos para Música e Vídeo', () => {
    expect(APP_SETTINGS_SCHEMA_VERSION).toBe(2)
    expect(DEFAULT_DOWNLOAD_PRESETS).toMatchObject([
      {
        id: 'music',
        mediaType: 'audio',
        outputFormat: 'mp3',
        quality: 'best',
        thumbnail: { enabled: true, aspectRatio: '1:1' }
      },
      {
        id: 'video',
        mediaType: 'video',
        outputFormat: 'mp4',
        quality: 'best',
        thumbnail: { enabled: false, aspectRatio: '16:9' }
      }
    ])
  })

  it('rejeita corrupção, campos desconhecidos e versões futuras', () => {
    expect(appSettingsSchema.safeParse(cloneDefaultSettings()).success).toBe(true)
    expect(appSettingsSchema.safeParse({ ...cloneDefaultSettings(), unknown: true }).success).toBe(
      false
    )
    expect(
      appSettingsSchema.safeParse({ ...cloneDefaultSettings(), schemaVersion: 99 }).success
    ).toBe(false)
    expect(
      appSettingsSchema.safeParse({ ...cloneDefaultSettings(), downloadPresets: [] }).success
    ).toBe(false)
    expect(
      appSettingsSchema.safeParse({
        ...cloneDefaultSettings(),
        allowedSites: [{ id: 'bad', label: 'Bad', domains: ['*'], enabled: true, builtin: false }]
      }).success
    ).toBe(false)
  })

  it('migra o formato anterior sem schemaVersion', () => {
    const {
      schemaVersion: _version,
      notifications: _notifications,
      ...legacy
    } = cloneDefaultSettings()
    expect(parseAppSettings(legacy)).toMatchObject({
      schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
      notifications: { volume: 50, nativeEnabled: true }
    })
    expect(parseAppSettings({ ...legacy, schemaVersion: 1 }).schemaVersion).toBe(
      APP_SETTINGS_SCHEMA_VERSION
    )
  })

  it('aceita CRUD de sites e presets com formatos compatíveis', () => {
    const settings = cloneDefaultSettings()
    settings.allowedSites = []
    settings.downloadPresets.push({
      ...settings.downloadPresets[0],
      id: 'lossless',
      name: 'FLAC',
      outputFormat: 'flac',
      builtin: false
    })
    expect(appSettingsSchema.safeParse(settings).success).toBe(true)
    expect(
      appSettingsSchema.safeParse({
        ...settings,
        downloadPresets: [{ ...settings.downloadPresets[0], outputFormat: 'webm' }]
      }).success
    ).toBe(false)
  })
})
