import type { DownloadFormProps } from '../types/components'
import { ActionButton } from './ActionButton'
import { FormField } from './FormField'
import { TelemetryPanel } from './TelemetryPanel'

const terminalStatuses = new Set(['success', 'partial', 'interrupted', 'error'])

export function DownloadForm({
  register,
  errors,
  telemetry,
  progress,
  isActive,
  controlPending,
  onSubmit,
  onSelectFolder,
  onInterrupt,
  onViewReport,
  onOpenFolder
}: DownloadFormProps): React.JSX.Element {
  const isFinished = terminalStatuses.has(telemetry?.status ?? '')

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-xl flex-col gap-5 space-y-6 rounded-md border border-[#32363f] bg-[#222222] p-6 shadow-2xl"
    >
      <FormField id="source-url" label="URL (Vídeo ou Playlist)" error={errors.url?.message}>
        <input
          id="source-url"
          {...register('url')}
          disabled={isActive}
          placeholder="https://youtube.com/watch?v=... ou Playlist"
          className="w-full rounded border border-[#32363f] bg-[#161618] p-3 font-mono text-sm text-[#e6edf3] outline-none transition-colors focus:border-[#A2ECFB] disabled:opacity-60"
        />
      </FormField>

      <FormField id="output-directory" label="Salvar em" error={errors.outputDir?.message}>
        <div className="flex gap-2">
          <input
            id="output-directory"
            {...register('outputDir')}
            readOnly
            placeholder="Nenhum caminho selecionado..."
            className="min-w-0 flex-1 cursor-not-allowed truncate rounded border border-[#32363f] bg-[#161618] p-3 font-mono text-sm text-[#a0a4a8]"
          />
          <button
            type="button"
            onClick={onSelectFolder}
            disabled={isActive}
            className="rounded border border-[#414853] bg-[#32363f] px-4 text-xs font-semibold uppercase text-[#e6edf3] transition-colors hover:bg-[#414853] disabled:opacity-50"
          >
            Procurar
          </button>
        </div>
      </FormField>

      {telemetry && <TelemetryPanel telemetry={telemetry} progress={progress} />}

      <button
        type="submit"
        disabled={isActive}
        className={`w-full rounded py-4 font-bold uppercase tracking-widest transition-all ${isActive ? 'cursor-not-allowed border border-[#414853] bg-[#32363f] text-[#8b949e]' : 'bg-[#A2ECFB] text-[#1b1b1f] shadow-[0_0_15px_rgba(162,236,251,0.2)] hover:bg-[#8bd6e5]'}`}
      >
        {isActive ? 'Em andamento...' : 'Iniciar'}
      </button>

      {isActive && (
        <ActionButton tone="danger" disabled={controlPending} onClick={onInterrupt}>
          Interromper download
        </ActionButton>
      )}

      {isFinished && telemetry && (
        <div className="grid grid-cols-2 gap-3">
          <ActionButton className="text-[#A2ECFB]" onClick={onViewReport}>
            Ver relatório
          </ActionButton>
          <ActionButton onClick={onOpenFolder}>Abrir pasta</ActionButton>
        </div>
      )}
    </form>
  )
}
