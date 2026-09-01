import { DEFAULT_DOWNLOAD_PRESETS } from '@shared/contracts/settings'
import { normalizeDomainInput } from '@shared/security/urlAccessPolicy'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSettings } from '../settings/AppSettingsContext'
import { type BackupScope, createBackup, parseBackup } from '../settings/backup'
import { listDownloadHistory, mergeDownloadHistory } from '../utils/downloadHistory'

const fieldClass = 'border border-[#414853] bg-[#161618] px-3 py-2 text-sm text-[#f8f8f8]'

export function ConfigPage(): React.JSX.Element {
  const { settings, updateSettings, restoreDefaults } = useAppSettings()
  const [domainInput, setDomainInput] = useState('')
  const [domainError, setDomainError] = useState('')
  const [dataMessage, setDataMessage] = useState('')

  const exportBackup = async (scope: BackupScope) => {
    try {
      setDataMessage('')
      const backup = createBackup(scope, settings, await listDownloadHistory())
      if (await window.api.saveBackup(backup)) setDataMessage('Backup exportado com sucesso.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const importBackup = async () => {
    try {
      setDataMessage('')
      const selected = await window.api.openBackup()
      if (!selected) return
      const backup = parseBackup(selected)
      const importSettings = backup.sections.settings
        ? window.confirm('Importar configurações? As configurações atuais serão substituídas.')
        : false
      const importHistory = backup.sections.history
        ? window.confirm('Importar histórico? Os registros serão mesclados por identificador.')
        : false
      if (!importSettings && !importHistory) return
      if (importHistory && backup.sections.history) {
        await mergeDownloadHistory(backup.sections.history)
      }
      if (importSettings && backup.sections.settings) {
        updateSettings(() => backup.sections.settings as typeof settings)
      }
      setDataMessage('Backup importado com sucesso.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const addDomain = () => {
    setDomainError('')
    try {
      const domain = normalizeDomainInput(domainInput)
      if (settings.allowedSites.some((site) => site.domains.includes(domain))) {
        throw new Error('Este domínio já está cadastrado.')
      }
      updateSettings((current) => ({
        ...current,
        allowedSites: [
          ...current.allowedSites,
          {
            id: `custom-${crypto.randomUUID()}`,
            label: domain,
            domains: [domain],
            enabled: true,
            builtin: false
          }
        ]
      }))
      setDomainInput('')
    } catch (error) {
      setDomainError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-sm text-[#a0a4a8]">Preferências e políticas persistidas localmente.</p>
      </header>

      <section className="border border-[#32363f] bg-[#222222] p-5">
        <h3 className="text-lg font-bold">Sites permitidos</h3>
        <p className="mt-1 text-sm text-[#a0a4a8]">
          Autorizar um site permite que o provider tente processá-lo; não garante compatibilidade.
        </p>
        <ul className="my-4 space-y-2">
          {settings.allowedSites.map((site) => (
            <li key={site.id} className="flex items-center gap-3 border border-[#32363f] p-3">
              <input
                aria-label={`Habilitar ${site.label}`}
                type="checkbox"
                title={`${site.enabled ? 'Desabilitar' : 'Habilitar'} ${site.label}`}
                checked={site.enabled}
                onChange={() =>
                  updateSettings((current) => ({
                    ...current,
                    allowedSites: current.allowedSites.map((item) =>
                      item.id === site.id ? { ...item, enabled: !item.enabled } : item
                    )
                  }))
                }
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{site.label}</p>
                <p className="truncate font-mono text-xs text-[#a0a4a8]">
                  {site.domains.join(', ')}
                </p>
              </div>
              <span className="text-[10px] uppercase text-[#6f767d]">
                {site.builtin ? 'Padrão' : 'Personalizado'}
              </span>
              {!site.builtin && (
                <button
                  type="button"
                  title={`Remover o domínio ${site.label}`}
                  className="text-xs font-bold uppercase text-[#f28b82]"
                  onClick={() =>
                    updateSettings((current) => ({
                      ...current,
                      allowedSites: current.allowedSites.filter((item) => item.id !== site.id)
                    }))
                  }
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder="example.com ou https://example.com/video"
            className={`${fieldClass} min-w-0 flex-1`}
          />
          <button
            type="button"
            title="Adicionar domínio à lista de sites permitidos"
            onClick={addDomain}
            className="bg-[#A2ECFB] px-4 text-xs font-bold uppercase text-[#1b1b1f]"
          >
            Adicionar
          </button>
        </div>
        {domainError && (
          <p role="alert" className="mt-2 text-xs text-[#f28b82]">
            {domainError}
          </p>
        )}
      </section>

      <section className="border border-[#32363f] bg-[#222222] p-5">
        <h3 className="text-lg font-bold">Presets de download</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {settings.downloadPresets.map((preset) => (
            <fieldset key={preset.id} className="space-y-3 border border-[#32363f] p-4">
              <legend className="px-2 font-bold">
                {preset.name} · {preset.outputFormat.toUpperCase()}
              </legend>
              <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
                Qualidade
                <select
                  value={preset.quality}
                  title={`Escolher qualidade do preset ${preset.name}`}
                  className={fieldClass}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      downloadPresets: current.downloadPresets.map((item) =>
                        item.id === preset.id
                          ? { ...item, quality: event.target.value as typeof item.quality }
                          : item
                      ) as typeof current.downloadPresets
                    }))
                  }
                >
                  <option value="best">Máxima</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  title={`${preset.thumbnail.enabled ? 'Desativar' : 'Ativar'} thumbnail no preset ${preset.name}`}
                  checked={preset.thumbnail.enabled}
                  onChange={() =>
                    updateSettings((current) => ({
                      ...current,
                      downloadPresets: current.downloadPresets.map((item) =>
                        item.id === preset.id
                          ? {
                              ...item,
                              thumbnail: { ...item.thumbnail, enabled: !item.thumbnail.enabled }
                            }
                          : item
                      ) as typeof current.downloadPresets
                    }))
                  }
                />
                Thumbnail habilitada
              </label>
              {preset.mediaType === 'video' && preset.thumbnail.enabled && (
                <p className="text-xs leading-5 text-amber-300">
                  A thumbnail de vídeo será salva separadamente do arquivo MP4.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(['aspectRatio', 'quality', 'outputFormat'] as const).map((field) => (
                  <label
                    key={field}
                    className="flex flex-col gap-1 text-[10px] uppercase text-[#a0a4a8]"
                  >
                    {field === 'aspectRatio'
                      ? 'Proporção'
                      : field === 'outputFormat'
                        ? 'Formato'
                        : 'Qualidade'}
                    <select
                      value={preset.thumbnail[field]}
                      title={`Alterar ${field === 'aspectRatio' ? 'proporção' : field === 'outputFormat' ? 'formato' : 'qualidade'} da thumbnail do preset ${preset.name}`}
                      className={fieldClass}
                      onChange={(event) =>
                        updateSettings((current) => ({
                          ...current,
                          downloadPresets: current.downloadPresets.map((item) =>
                            item.id === preset.id
                              ? {
                                  ...item,
                                  thumbnail: { ...item.thumbnail, [field]: event.target.value }
                                }
                              : item
                          ) as typeof current.downloadPresets
                        }))
                      }
                    >
                      {field === 'aspectRatio' ? (
                        <>
                          <option value="1:1">1:1</option>
                          <option value="16:9">16:9</option>
                        </>
                      ) : field === 'outputFormat' ? (
                        <>
                          <option value="jpg">JPG</option>
                          <option value="png">PNG</option>
                          <option value="webp">WebP</option>
                        </>
                      ) : (
                        <>
                          <option value="best">Máxima</option>
                          <option value="high">Alta</option>
                          <option value="medium">Média</option>
                          <option value="low">Baixa</option>
                        </>
                      )}
                    </select>
                  </label>
                ))}
              </div>
              <button
                type="button"
                title={`Restaurar o preset ${preset.name}`}
                className="text-xs font-bold uppercase text-[#A2ECFB]"
                onClick={() => {
                  const defaultPreset = DEFAULT_DOWNLOAD_PRESETS.find(
                    (item) => item.id === preset.id
                  )
                  if (!defaultPreset) return
                  updateSettings((current) => ({
                    ...current,
                    downloadPresets: current.downloadPresets.map((item) =>
                      item.id === preset.id ? structuredClone(defaultPreset) : item
                    ) as typeof current.downloadPresets
                  }))
                }}
              >
                Restaurar preset
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section id="backup" className="border border-[#32363f] bg-[#222222] p-5">
        <h3 className="text-lg font-bold">Dados / Backup</h3>
        <p className="mt-1 text-sm text-[#a0a4a8]">
          O histórico pode conter URLs e caminhos locais do seu computador.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['settings', 'history', 'all'] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              title={`Exportar ${scope === 'settings' ? 'configurações' : scope === 'history' ? 'histórico' : 'todos os dados'}`}
              onClick={() => void exportBackup(scope)}
              className="border border-[#A2ECFB] px-3 py-2 text-xs font-bold uppercase text-[#A2ECFB]"
            >
              Exportar{' '}
              {scope === 'settings' ? 'configurações' : scope === 'history' ? 'histórico' : 'tudo'}
            </button>
          ))}
          <button
            type="button"
            title="Selecionar e importar um backup do RoveTrack"
            onClick={() => void importBackup()}
            className="border border-[#414853] px-3 py-2 text-xs font-bold uppercase"
          >
            Importar backup
          </button>
        </div>
        {dataMessage && <p className="mt-3 text-xs text-[#A2ECFB]">{dataMessage}</p>}
        <Link
          to="/options/history"
          title="Abrir a página completa de histórico"
          className="mt-4 inline-block text-xs font-bold uppercase text-[#A2ECFB]"
        >
          Gerenciar histórico
        </Link>
      </section>

      <button
        type="button"
        title="Restaurar sites e presets para os valores padrão"
        className="border border-[#f28b82] px-4 py-2 text-xs font-bold uppercase text-[#f28b82]"
        onClick={() => {
          if (
            window.confirm(
              'Restaurar sites e presets para os valores padrão? O histórico será preservado.'
            )
          )
            restoreDefaults()
        }}
      >
        Restaurar configurações padrão
      </button>
    </div>
  )
}
