import type { PipelineState } from '@shared/contracts/pipeline'
import type { TelemetryPanelProps } from '../types/components'

const statusLabel = (telemetry: PipelineState): string => {
  if (telemetry.status === 'downloading') return `A DESCARREGAR... ${telemetry.progress || 0}%`
  if (telemetry.status === 'interrupted') return 'INTERROMPIDO'
  return telemetry.status.toUpperCase()
}

export function TelemetryPanel({ telemetry, progress }: TelemetryPanelProps): React.JSX.Element {
  const progressTone =
    telemetry.status === 'error'
      ? 'bg-red-500'
      : telemetry.status === 'interrupted'
        ? 'bg-orange-500'
        : telemetry.status === 'partial'
          ? 'bg-amber-400'
          : telemetry.status === 'success'
            ? 'bg-green-500'
            : 'bg-[#A2ECFB]'

  return (
    <div className="flex w-full flex-col gap-3 rounded border border-[#32363f] bg-[#0d0d0f] p-4 shadow-inner">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="flex items-center gap-2 font-bold uppercase text-[#A2ECFB]">
          {statusLabel(telemetry)}
        </span>
        <span className="text-[#515c67]">
          FAIXA {telemetry.batch.current} / {telemetry.batch.total}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#161618]">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-500 ease-out ${progressTone}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="max-w-[80%] text-[#a0a4a8]" title={telemetry.message}>
          {telemetry.message}
        </span>
        <span className="ml-2 shrink-0 text-[#515c67]">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}
