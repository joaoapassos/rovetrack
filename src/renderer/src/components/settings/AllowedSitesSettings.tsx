import { DEFAULT_APP_SETTINGS } from '@shared/contracts/settings'
import { normalizeDomainInput } from '@shared/security/urlAccessPolicy'
import { useState } from 'react'
import { useAppSettings } from '../../settings/AppSettingsContext'

const inputClass =
  'border border-[#414853] bg-[#161618] px-3 py-2 text-sm text-[#f8f8f8] outline-none focus:border-[#A2ECFB]'

function parseDomains(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((domain) => domain.trim())
        .filter(Boolean)
        .map(normalizeDomainInput)
    )
  ]
}

export function AllowedSitesSettings(): React.JSX.Element {
  const { settings, updateSettings } = useAppSettings()
  const [label, setLabel] = useState('')
  const [domains, setDomains] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const save = () => {
    setError('')
    try {
      const normalizedDomains = parseDomains(domains)
      const normalizedLabel = label.trim()
      if (!normalizedLabel) throw new Error('Informe um nome para a regra.')
      const duplicate = settings.allowedSites.some(
        (site) =>
          site.id !== editingId && site.domains.some((domain) => normalizedDomains.includes(domain))
      )
      if (duplicate) throw new Error('Um dos domínios já pertence a outra regra.')

      updateSettings((current) => ({
        ...current,
        allowedSites: editingId
          ? current.allowedSites.map((site) =>
              site.id === editingId
                ? { ...site, label: normalizedLabel, domains: normalizedDomains }
                : site
            )
          : [
              ...current.allowedSites,
              {
                id: `site-${crypto.randomUUID()}`,
                label: normalizedLabel,
                domains: normalizedDomains,
                enabled: true,
                builtin: false
              }
            ]
      }))
      setLabel('')
      setDomains('')
      setEditingId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <section className="border border-[#32363f] bg-[#222222] p-6 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">Sites permitidos</h3>
          <p className="mt-1 text-sm text-[#a0a4a8]">
            Com domínios cadastrados, a URL precisa corresponder a um deles.
          </p>
          <p className="mt-1 text-xs text-[#A2ECFB]">
            Sem domínios habilitados, qualquer URL HTTPS pública e segura poderá ser testada.
          </p>
        </div>
        <button
          type="button"
          title="Restaurar sites padrão"
          onClick={() =>
            updateSettings((current) => ({
              ...current,
              allowedSites: structuredClone(DEFAULT_APP_SETTINGS.allowedSites)
            }))
          }
          className="shrink-0 text-xs font-bold uppercase text-[#A2ECFB]"
        >
          Restaurar padrões
        </button>
      </div>

      <ul className="my-5 space-y-3">
        {settings.allowedSites.map((site) => (
          <li
            key={site.id}
            className="flex flex-col gap-3 border border-[#32363f] p-4 sm:flex-row sm:items-center"
          >
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
              <p className="break-words font-mono text-xs text-[#a0a4a8]">
                {site.domains.length ? site.domains.join(', ') : 'Sem domínios'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                title={`Editar ${site.label}`}
                className="text-xs font-bold uppercase text-[#A2ECFB]"
                onClick={() => {
                  setEditingId(site.id)
                  setLabel(site.label)
                  setDomains(site.domains.join('\n'))
                  setError('')
                }}
              >
                Editar
              </button>
              <button
                type="button"
                title={`Excluir ${site.label}`}
                className="text-xs font-bold uppercase text-[#f28b82]"
                onClick={() =>
                  updateSettings((current) => ({
                    ...current,
                    allowedSites: current.allowedSites.filter((item) => item.id !== site.id)
                  }))
                }
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 border border-[#32363f] bg-[#1b1b1f] p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
          Nome da regra
          <input
            value={label}
            title="Nome da regra de sites"
            placeholder="Ex.: Meu provedor"
            onChange={(event) => setLabel(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase text-[#a0a4a8]">
          Domínios ou URLs
          <textarea
            value={domains}
            title="Domínios permitidos separados por vírgula ou linha"
            placeholder="example.com, media.example.com"
            rows={2}
            onChange={(event) => setDomains(event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="button"
            title={editingId ? 'Salvar alterações da regra' : 'Adicionar regra de sites'}
            onClick={save}
            className="bg-[#A2ECFB] px-4 py-2 text-xs font-bold uppercase text-[#1b1b1f]"
          >
            {editingId ? 'Salvar alterações' : 'Adicionar regra'}
          </button>
          {editingId && (
            <button
              type="button"
              title="Cancelar edição"
              onClick={() => {
                setEditingId(null)
                setLabel('')
                setDomains('')
                setError('')
              }}
              className="border border-[#414853] px-4 py-2 text-xs font-bold uppercase"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-[#f28b82]">{error}</p>}
    </section>
  )
}
