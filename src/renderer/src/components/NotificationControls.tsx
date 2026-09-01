import type { NotificationControlsProps } from '../types/components'
import { BellIcon, SoundIcon } from './icons'

export function NotificationControls({
  volume,
  lastAudibleVolume,
  nativeEnabled,
  onVolumeChange,
  onToggleMute,
  onToggleNative
}: NotificationControlsProps): React.JSX.Element {
  return (
    <fieldset className="fixed right-5 top-5 z-40 flex gap-2" aria-label="Controlos de notificação">
      <div
        title={`Volume das notificações: ${volume}%`}
        className={`group flex h-10 w-10 overflow-hidden border bg-[#222222] transition-[width,border-color] duration-200 ease-out hover:w-48 focus-within:w-48 ${volume === 0 ? 'border-[#A2ECFB]' : 'border-[#32363f]'}`}
      >
        <button
          type="button"
          aria-label={volume === 0 ? 'Restaurar volume' : 'Silenciar notificações'}
          aria-pressed={volume === 0}
          title={
            volume === 0
              ? `Restaurar volume para ${lastAudibleVolume}%`
              : `Silenciar notificações sonoras (${volume}%)`
          }
          onClick={onToggleMute}
          className={`flex h-full w-10 shrink-0 cursor-pointer items-center justify-center transition-colors focus:outline-none ${volume === 0 ? 'text-[#A2ECFB]' : 'text-[#a0a4a8] group-hover:text-[#f8f8f8]'}`}
        >
          <SoundIcon muted={volume === 0} />
        </button>
        <div className="flex min-w-[9.5rem] translate-x-2 items-center gap-2 pr-3 opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
          <input
            type="range"
            title={`Ajustar volume das notificações: ${volume}%`}
            min="0"
            max="100"
            step="5"
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            aria-label="Volume das notificações sonoras"
            className="h-1.5 w-24 cursor-pointer accent-[#A2ECFB]"
          />
          <span className="w-8 text-right font-mono text-[10px] text-[#A2ECFB]">{volume}%</span>
        </div>
      </div>
      <button
        type="button"
        title={nativeEnabled ? 'Desativar notificações nativas' : 'Ativar notificações nativas'}
        aria-label={nativeEnabled ? 'Bloquear notificações nativas' : 'Ativar notificações nativas'}
        aria-pressed={!nativeEnabled}
        onClick={onToggleNative}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center border bg-[#222222] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A2ECFB]/30 ${nativeEnabled ? 'border-[#32363f] text-[#a0a4a8] hover:border-[#A2ECFB] hover:text-[#f8f8f8]' : 'border-[#A2ECFB] text-[#A2ECFB]'}`}
      >
        <BellIcon blocked={!nativeEnabled} />
      </button>
    </fieldset>
  )
}
