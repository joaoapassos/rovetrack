import { AUDIO_OUTPUT_FORMATS, VIDEO_OUTPUT_FORMATS } from '@shared/contracts/media'
import { Controller } from 'react-hook-form'
import type { DownloadFormProps } from '../types/components'
import { ActionButton } from './ActionButton'
import { FormField } from './FormField'
import { Select } from './Select'
import { TelemetryPanel } from './TelemetryPanel'

const terminalStatuses = new Set(['success', 'partial', 'interrupted', 'error'])
const mediaTypeOptions = [
  { value: 'audio', label: 'Áudio' },
  { value: 'video', label: 'Vídeo' }
] as const
const qualityOptions = [
  { value: 'best', label: 'Máxima' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' }
] as const
const aspectRatioOptions = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' }
] as const
const thumbnailFormatOptions = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' }
] as const

export function DownloadForm({
  register,
  control,
  errors,
  telemetry,
  progress,
  isActive,
  controlPending,
  mediaType,
  presets,
  thumbnailEnabled,
  onSubmit,
  onSelectFolder,
  onInterrupt,
  onViewReport,
  onOpenFolder,
  onPresetChange,
  onMediaTypeChange
}: DownloadFormProps): React.JSX.Element {
  const isFinished = terminalStatuses.has(telemetry?.status ?? '')
  const presetOptions = presets.map((preset) => ({ value: preset.id, label: preset.name }))
  const outputFormatOptions = (
    mediaType === 'audio' ? AUDIO_OUTPUT_FORMATS : VIDEO_OUTPUT_FORMATS
  ).map((format) => ({ value: format, label: format.toUpperCase() }))

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
          <Controller
            name="presetId"
            control={control}
            render={({ field }) => (
              <Select
                id="preset"
                title="Escolher preset de download"
                value={field.value}
                options={presetOptions}
                disabled={isActive}
                className="rounded p-3"
                onValueChange={(value) => {
                  field.onChange(value)
                  onPresetChange(value)
                }}
              />
            )}
          />
        </FormField>
        <FormField id="media-type" label="Tipo" error={errors.mediaType?.message}>
          <Controller
            name="mediaType"
            control={control}
            render={({ field }) => (
              <Select
                id="media-type"
                title="Escolher tipo de mídia"
                value={field.value}
                options={mediaTypeOptions}
                disabled={isActive}
                className="rounded p-3"
                onValueChange={(value) => {
                  field.onChange(value)
                  onMediaTypeChange(value as 'audio' | 'video')
                }}
              />
            )}
          />
        </FormField>
      </div>

      <FormField id="output-format" label="Formato final" error={errors.outputFormat?.message}>
        <Controller
          name="outputFormat"
          control={control}
          render={({ field }) => (
            <Select
              id="output-format"
              title="Escolher formato final"
              value={field.value}
              options={outputFormatOptions}
              disabled={isActive}
              className="rounded p-3"
              onValueChange={field.onChange}
            />
          )}
        />
      </FormField>

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
          <label
            htmlFor="media-quality"
            className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]"
          >
            Qualidade
            <Controller
              name="quality"
              control={control}
              render={({ field }) => (
                <Select
                  id="media-quality"
                  title="Escolher qualidade da mídia"
                  value={field.value}
                  options={qualityOptions}
                  onValueChange={field.onChange}
                />
              )}
            />
          </label>
          <label
            htmlFor="thumbnail-aspect-ratio"
            className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]"
          >
            Proporção
            <Controller
              name="thumbnailAspectRatio"
              control={control}
              render={({ field }) => (
                <Select
                  id="thumbnail-aspect-ratio"
                  title="Escolher proporção da thumbnail"
                  value={field.value}
                  options={aspectRatioOptions}
                  onValueChange={field.onChange}
                />
              )}
            />
          </label>
          <label
            htmlFor="thumbnail-quality"
            className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]"
          >
            Qualidade da thumbnail
            <Controller
              name="thumbnailQuality"
              control={control}
              render={({ field }) => (
                <Select
                  id="thumbnail-quality"
                  title="Escolher qualidade da thumbnail"
                  value={field.value}
                  options={qualityOptions}
                  onValueChange={field.onChange}
                />
              )}
            />
          </label>
          <label
            htmlFor="thumbnail-format"
            className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]"
          >
            Formato da thumbnail
            <Controller
              name="thumbnailOutputFormat"
              control={control}
              render={({ field }) => (
                <Select
                  id="thumbnail-format"
                  title="Escolher formato da thumbnail"
                  value={field.value}
                  options={thumbnailFormatOptions}
                  onValueChange={field.onChange}
                />
              )}
            />
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
