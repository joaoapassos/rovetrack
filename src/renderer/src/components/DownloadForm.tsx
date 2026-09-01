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
  mediaType,
  thumbnailEnabled,
  onSubmit,
  onSelectFolder,
  onInterrupt,
  onViewReport,
  onOpenFolder,
  onPresetChange
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
            title="Selecionar pasta de destino"
            onClick={onSelectFolder}
            disabled={isActive}
            className="rounded border border-[#414853] bg-[#32363f] px-4 text-xs font-semibold uppercase text-[#e6edf3] transition-colors hover:bg-[#414853] disabled:opacity-50"
          >
            Procurar
          </button>
        </div>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="preset" label="Preset" error={errors.presetId?.message}>
          <select
            id="preset"
            title="Escolher preset de download"
            {...register('presetId', {
              onChange: (event) => onPresetChange(event.target.value as 'music' | 'video')
            })}
            disabled={isActive}
            className="w-full rounded border border-[#32363f] bg-[#161618] p-3 text-sm"
          >
            <option value="music">Música</option>
            <option value="video">Vídeo</option>
          </select>
        </FormField>
        <FormField id="media-type" label="Tipo" error={errors.mediaType?.message}>
          <select
            id="media-type"
            title="Escolher tipo de mídia"
            {...register('mediaType')}
            disabled={isActive}
            className="w-full rounded border border-[#32363f] bg-[#161618] p-3 text-sm"
          >
            <option value="audio">Música (MP3)</option>
            <option value="video">Vídeo (MP4)</option>
          </select>
        </FormField>
      </div>

      <details className="border border-[#32363f] bg-[#1b1b1f] p-4">
        <summary
          title="Mostrar ou ocultar opções avançadas do download"
          className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#A2ECFB]"
        >
          Opções do download
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              title="Ativar ou desativar thumbnail"
              {...register('thumbnailEnabled')}
              disabled={isActive}
            />
            Processar thumbnail
          </label>
          {mediaType === 'video' && thumbnailEnabled && (
            <p className="sm:col-span-2 text-xs leading-5 text-amber-300">
              No modo Vídeo, a thumbnail será salva como um arquivo separado ao lado do MP4. Em
              Música, a capa é incorporada ao arquivo MP3.
            </p>
          )}
          <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
            Qualidade
            <select
              title="Escolher qualidade da mídia"
              {...register('quality')}
              className="bg-[#161618] p-2 text-[#f8f8f8]"
            >
              <option value="best">Máxima</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
            Proporção
            <select
              title="Escolher proporção da thumbnail"
              {...register('thumbnailAspectRatio')}
              className="bg-[#161618] p-2 text-[#f8f8f8]"
            >
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
            Qualidade da thumbnail
            <select
              title="Escolher qualidade da thumbnail"
              {...register('thumbnailQuality')}
              className="bg-[#161618] p-2 text-[#f8f8f8]"
            >
              <option value="best">Máxima</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
            Formato da thumbnail
            <select
              title="Escolher formato da thumbnail"
              {...register('thumbnailOutputFormat')}
              className="bg-[#161618] p-2 text-[#f8f8f8]"
            >
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </label>
        </div>
      </details>

      {telemetry && <TelemetryPanel telemetry={telemetry} progress={progress} />}

      <button
        type="submit"
        title={isActive ? 'Download em andamento' : 'Iniciar download'}
        disabled={isActive}
        className={`w-full cursor-pointer rounded py-4 font-bold uppercase tracking-widest transition-all ${isActive ? 'cursor-not-allowed border border-[#414853] bg-[#32363f] text-[#8b949e]' : 'bg-[#A2ECFB] text-[#1b1b1f] shadow-[0_0_15px_rgba(162,236,251,0.2)] hover:bg-[#8bd6e5]'}`}
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
