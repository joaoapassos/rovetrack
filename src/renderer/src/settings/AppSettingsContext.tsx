import type { AppSettings } from '@shared/contracts/settings'
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { loadSettings, resetSettings, saveSettings } from './settingsStorage'

interface AppSettingsContextValue {
  settings: AppSettings
  updateSettings: (update: (current: AppSettings) => AppSettings) => void
  restoreDefaults: () => void
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

export function AppSettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState(loadSettings)
  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (update) => setSettings((current) => saveSettings(update(current))),
      restoreDefaults: () => setSettings(resetSettings())
    }),
    [settings]
  )
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext)
  if (!context) throw new Error('useAppSettings precisa estar dentro de AppSettingsProvider.')
  return context
}
