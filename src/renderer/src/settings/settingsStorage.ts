import {
  type AppSettings,
  appSettingsSchema,
  cloneDefaultSettings,
  parseAppSettings
} from '@shared/contracts/settings'

export const APP_SETTINGS_STORAGE_KEY = 'rovetrack:app-settings'

export function loadSettings(): AppSettings {
  try {
    const value = localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
    if (!value) return cloneDefaultSettings()
    const parsed: unknown = JSON.parse(value)
    return parseAppSettings(parsed)
  } catch {
    return cloneDefaultSettings()
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  const validated = appSettingsSchema.parse(settings)
  localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(validated))
  window.dispatchEvent(new CustomEvent('rovetrack:settings-changed'))
  return validated
}

export function resetSettings(): AppSettings {
  return saveSettings(cloneDefaultSettings())
}
