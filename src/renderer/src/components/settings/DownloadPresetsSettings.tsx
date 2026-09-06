import {
  AUDIO_OUTPUT_FORMATS,
  type MediaType,
  type OutputFormat,
  VIDEO_OUTPUT_FORMATS
} from '@shared/contracts/media'
import { DEFAULT_DOWNLOAD_PRESETS, type DownloadPreset } from '@shared/contracts/settings'
import { useAppSettings } from '../../settings/AppSettingsContext'
import { Select, type SelectOption } from '../Select'

const inputClass =
  'w-full border border-[#414853] bg-[#161618] px-3 py-2.5 text-sm text-[#f8f8f8] outline-none focus:border-[#A2ECFB]'
const qualityOptions = [
  { value: 'best', label: 'Máxima' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' }
] as const
const mediaTypeOptions = [
  { value: 'audio', label: 'Áudio' },
  { value: 'video', label: 'Vídeo' }
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

const formatLabels: Record<OutputFormat, string> = {
  mp3: 'MP3',
  m4a: 'M4A',
  opus: 'Opus',
  flac: 'FLAC',
  wav: 'WAV',
  aac: 'AAC (arquivo M4A)',
  vorbis: 'Vorbis (arquivo OGG)',
  alac: 'ALAC (arquivo M4A)',
  mp4: 'MP4',
  webm: 'WebM',
  mkv: 'MKV',
  mov: 'MOV',
  avi: 'AVI'
}

const formatOptions = (mediaType: MediaType): SelectOption[] =>
  (mediaType === 'audio' ? AUDIO_OUTPUT_FORMATS : VIDEO_OUTPUT_FORMATS).map((value) => ({
    value,
    label: formatLabels[value]
  }))

export function DownloadPresetsSettings(): React.JSX.Element {
  const { settings, updateSettings } = useAppSettings()

  const updatePreset = (id: string, update: (preset: DownloadPreset) => DownloadPreset) =>
    updateSettings((current) => ({
      ...current,
      downloadPresets: current.downloadPresets.map((preset) =>
        preset.id === id ? update(preset) : preset
      )
    }))

  const addPreset = () => {
    const preset: DownloadPreset = {
      id: `preset-${crypto.randomUUID()}`,
      name: `Novo preset ${settings.downloadPresets.length + 1}`,
      mediaType: 'audio',
      outputFormat: 'mp3',
      quality: 'best',
      thumbnail: { enabled: true, aspectRatio: '1:1', quality: 'best', outputFormat: 'jpg' },
      builtin: false
    }
    updateSettings((current) => ({
      ...current,
      downloadPresets: [...current.downloadPresets, preset]
    }))
  }

  return (
    <section className="border border-[#32363f] bg-[#222222] p-6 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">Presets de download</h3>
          <p className="mt-1 text-sm text-[#a0a4a8]">
            Crie perfis com tipo, formato, qualidade e comportamento da thumbnail.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            title="Adicionar preset"
            onClick={addPreset}
            className="text-xs font-bold uppercase text-[#A2ECFB]"
          >
            Adicionar
          </button>
          <button
            type="button"
            title="Restaurar presets padrão"
            onClick={() =>
              updateSettings((current) => ({
                ...current,
                downloadPresets: [...structuredClone(DEFAULT_DOWNLOAD_PRESETS)]
              }))
            }
            className="text-xs font-bold uppercase text-[#A2ECFB]"
          >
            Restaurar
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {settings.downloadPresets.map((preset) => (
          <fieldset key={preset.id} className="space-y-4 border border-[#32363f] p-5">
            <legend className="px-2 font-bold">{preset.name}</legend>

            <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
              Nome
              <input
                value={preset.name}
                title={`Alterar nome do preset ${preset.name}`}
                onChange={(event) =>
                  updatePreset(preset.id, (current) => ({
                    ...current,
                    name: event.target.value || 'Preset sem nome'
                  }))
                }
                className={inputClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label
                htmlFor={`${preset.id}-media-type`}
                className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]"
              >
                Tipo
                <Select
                  id={`${preset.id}-media-type`}
                  title={`Alterar tipo do preset ${preset.name}`}
                  value={preset.mediaType}
                  options={mediaTypeOptions}
                  onValueChange={(value) =>
                    updatePreset(preset.id, (current) => ({
                      ...current,
                      mediaType: value as MediaType,
                      outputFormat: value === 'audio' ? 'mp3' : 'mp4',
                      thumbnail: {
                        ...current.thumbnail,
                        enabled: value === 'audio',
                        aspectRatio: value === 'audio' ? '1:1' : '16:9'
                      }
                    }))
                  }
                />
              </label>
              <label
                htmlFor={`${preset.id}-format`}
                className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]"
              >
                Formato
                <Select
                  id={`${preset.id}-format`}
                  title={`Alterar formato do preset ${preset.name}`}
                  value={preset.outputFormat}
                  options={formatOptions(preset.mediaType)}
                  onValueChange={(value) =>
                    updatePreset(preset.id, (current) => ({
                      ...current,
                      outputFormat: value as OutputFormat
                    }))
                  }
                />
              </label>
            </div>

            <label
              htmlFor={`${preset.id}-quality`}
              className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]"
            >
              Qualidade
              <Select
                id={`${preset.id}-quality`}
                value={preset.quality}
                title={`Escolher qualidade do preset ${preset.name}`}
                options={qualityOptions}
                onValueChange={(value) =>
                  updatePreset(preset.id, (current) => ({
                    ...current,
                    quality: value as DownloadPreset['quality']
                  }))
                }
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                title={`${preset.thumbnail.enabled ? 'Desativar' : 'Ativar'} thumbnail no preset ${preset.name}`}
                checked={preset.thumbnail.enabled}
                onChange={() =>
                  updatePreset(preset.id, (current) => ({
                    ...current,
                    thumbnail: { ...current.thumbnail, enabled: !current.thumbnail.enabled }
                  }))
                }
              />
              Thumbnail habilitada
            </label>
            {preset.mediaType === 'video' && preset.thumbnail.enabled && (
              <p className="text-xs leading-5 text-amber-300">
                A thumbnail será salva separadamente do arquivo de vídeo.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(['aspectRatio', 'quality', 'outputFormat'] as const).map((field) => (
                <label
                  key={field}
                  htmlFor={`${preset.id}-thumbnail-${field}`}
                  className="flex flex-col gap-1 text-[10px] uppercase text-[#a0a4a8]"
                >
                  {field === 'aspectRatio'
                    ? 'Proporção'
                    : field === 'outputFormat'
                      ? 'Formato'
                      : 'Qualidade'}
                  <Select
                    id={`${preset.id}-thumbnail-${field}`}
                    value={preset.thumbnail[field]}
                    title={`Alterar ${field} da thumbnail do preset ${preset.name}`}
                    options={
                      field === 'aspectRatio'
                        ? aspectRatioOptions
                        : field === 'outputFormat'
                          ? thumbnailFormatOptions
                          : qualityOptions
                    }
                    onValueChange={(value) =>
                      updatePreset(preset.id, (current) => ({
                        ...current,
                        thumbnail: { ...current.thumbnail, [field]: value }
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#32363f] pt-4">
              <button
                type="button"
                title={`Duplicar preset ${preset.name}`}
                onClick={() =>
                  updateSettings((current) => ({
                    ...current,
                    downloadPresets: [
                      ...current.downloadPresets,
                      {
                        ...structuredClone(preset),
                        id: `preset-${crypto.randomUUID()}`,
                        name: `${preset.name} (cópia)`,
                        builtin: false
                      }
                    ]
                  }))
                }
                className="text-xs font-bold uppercase text-[#A2ECFB]"
              >
                Duplicar
              </button>
              <button
                type="button"
                title={
                  settings.downloadPresets.length === 1
                    ? 'É necessário manter pelo menos um preset'
                    : `Excluir preset ${preset.name}`
                }
                disabled={settings.downloadPresets.length === 1}
                onClick={() =>
                  updateSettings((current) => ({
                    ...current,
                    downloadPresets: current.downloadPresets.filter((item) => item.id !== preset.id)
                  }))
                }
                className="text-xs font-bold uppercase text-[#f28b82] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Excluir
              </button>
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  )
}
