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
    const settings = parseAppSettings(parsed)
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      !('notifications' in parsed)
    ) {
      const legacyVolume = Number(localStorage.getItem('rovetrack:notification-volume'))
      const volume =
        Number.isFinite(legacyVolume) && legacyVolume >= 0 && legacyVolume <= 100
          ? legacyVolume
          : settings.notifications.volume
      const legacyLastVolume = Number(localStorage.getItem('rovetrack:last-audible-volume'))
      return {
        ...settings,
        notifications: {
          volume,
          lastAudibleVolume:
            Number.isFinite(legacyLastVolume) && legacyLastVolume > 0 && legacyLastVolume <= 100
              ? legacyLastVolume
              : volume || 50,
          nativeEnabled: localStorage.getItem('rovetrack:native-notifications') !== 'false'
        }
      }
    }
    return settings
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
