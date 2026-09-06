import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react'
import { useAppSettings } from '../../settings/AppSettingsContext'

export function NotificationsSettings(): React.JSX.Element {
  const { settings, updateSettings } = useAppSettings()
  const notifications = settings.notifications

  const setVolume = (volume: number) =>
    updateSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        volume,
        lastAudibleVolume: volume > 0 ? volume : current.notifications.lastAudibleVolume
      }
    }))

  return (
    <section className="border border-[#32363f] bg-[#222222] p-6 sm:p-7">
      <h3 className="text-lg font-bold">Notificações</h3>
      <p className="mt-1 text-sm text-[#a0a4a8]">
        Controle os alertas sonoros e as notificações nativas do sistema.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="border border-[#32363f] bg-[#1b1b1f] p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">Som de conclusão</p>
              <p className="text-xs text-[#6f767d]">Volume em {notifications.volume}%</p>
            </div>
            <button
              type="button"
              title={notifications.volume === 0 ? 'Restaurar som' : 'Silenciar som'}
              aria-label={notifications.volume === 0 ? 'Restaurar som' : 'Silenciar som'}
              onClick={() =>
                setVolume(notifications.volume === 0 ? notifications.lastAudibleVolume : 0)
              }
              className="flex h-10 w-10 items-center justify-center border border-[#414853] text-[#A2ECFB] hover:border-[#A2ECFB]"
            >
              {notifications.volume === 0 ? (
                <VolumeX className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={notifications.volume}
            title={`Volume das notificações: ${notifications.volume}%`}
            aria-label="Volume das notificações"
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-full accent-[#A2ECFB]"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border border-[#32363f] bg-[#1b1b1f] p-4">
          <div>
            <p className="text-sm font-bold">Notificações do sistema</p>
            <p className="mt-1 text-xs text-[#6f767d]">
              {notifications.nativeEnabled ? 'Ativadas' : 'Desativadas'}
            </p>
          </div>
          <button
            type="button"
            title={
              notifications.nativeEnabled
                ? 'Desativar notificações do sistema'
                : 'Ativar notificações do sistema'
            }
            aria-pressed={notifications.nativeEnabled}
            onClick={() =>
              updateSettings((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  nativeEnabled: !current.notifications.nativeEnabled
                }
              }))
            }
            className="flex h-10 w-10 items-center justify-center border border-[#414853] text-[#A2ECFB] hover:border-[#A2ECFB]"
          >
            {notifications.nativeEnabled ? (
              <Bell className="h-5 w-5" aria-hidden="true" />
            ) : (
              <BellOff className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
