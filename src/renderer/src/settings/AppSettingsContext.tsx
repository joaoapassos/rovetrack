import type { AppSettings } from '@shared/contracts/settings'
import type { UpdateState } from '@shared/contracts/updates'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { loadSettings, resetSettings, saveSettings } from './settingsStorage'

interface AppSettingsContextValue {
  settings: AppSettings
  updateSettings: (update: (current: AppSettings) => AppSettings) => void
  restoreDefaults: () => void
  updateState: UpdateState | null
  applicationVersion: string
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

export function AppSettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState(loadSettings)
  const [updateState, setUpdateState] = useState<UpdateState | null>(null)
  const [applicationVersion, setApplicationVersion] = useState('…')
  useEffect(() => {
    window.api
      .setNativeNotificationsEnabled(settings.notifications.nativeEnabled)
      .catch(console.error)
  }, [settings.notifications.nativeEnabled])
  useEffect(() => {
    const unsubscribe = window.api.onUpdateState(setUpdateState)
    window.api.getUpdateState().then(setUpdateState).catch(console.error)
    window.api.getVersion().then(setApplicationVersion).catch(console.error)
    return unsubscribe
  }, [])
  useEffect(() => {
    window.api.configureUpdates(settings.updates).then(setUpdateState).catch(console.error)
  }, [settings.updates])
  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (update) => setSettings((current) => saveSettings(update(current))),
      restoreDefaults: () => setSettings(resetSettings()),
      updateState,
      applicationVersion
    }),
    [settings, updateState, applicationVersion]
  )
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext)
  if (!context) throw new Error('useAppSettings precisa estar dentro de AppSettingsProvider.')
  return context
}
