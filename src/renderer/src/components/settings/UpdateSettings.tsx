import type { UpdateMode, YtDlpChannel } from '@shared/contracts/updates'
import { CheckCircle2, Download, RefreshCw, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useAppSettings } from '../../settings/AppSettingsContext'
import { ActionButton } from '../ActionButton'
import { Select } from '../Select'

const modes: Array<{ id: UpdateMode; title: string; description: string }> = [
  {
    id: 'managed',
    title: 'Gerenciado pelo Rovetrack (recomendado)',
    description: 'Usa exclusivamente os componentes incluídos e testados com esta release.'
  },
  {
    id: 'stable',
    title: 'Stable',
    description: 'Permite atualizar manualmente o yt-dlp pelo canal stable oficial.'
  },
  {
    id: 'advanced',
    title: 'Avançado',
    description:
      'Permite escolher o canal e controlar verificações, avisos e instalação automática.'
  }
]

const statusLabels: Record<string, string> = {
  development: 'Disponível somente no aplicativo empacotado',
  idle: 'Aguardando verificação',
  checking: 'Verificando…',
  available: 'Atualização disponível',
  'not-available': 'Atualizado',
  downloading: 'Baixando…',
  downloaded: 'Pronto para instalar',
  installing: 'Preparando instalação…',
  updating: 'Atualizando…',
  updated: 'Atualizado',
  unsupported: 'Plataforma não suportada',
  error: 'Falha'
}

const channelDescriptions: Record<YtDlpChannel, string> = {
  stable: 'Releases estáveis, com menor frequência de alterações.',
  nightly:
    'Versões de desenvolvimento frequentes; podem corrigir sites rapidamente, mas introduzir regressões.',
  master:
    'Versões extremamente recentes, com maior risco de regressões. Indicadas apenas a usuários experientes.'
}

export function UpdateSettings(): React.JSX.Element {
  const { settings, updateSettings, updateState } = useAppSettings()
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const updates = settings.updates
  const appState = updateState?.application
  const ytDlp = updateState?.components.ytDlp
  const operationActive = updateState?.operationActive ?? false

  const perform = async (name: string, action: () => Promise<unknown>) => {
    setPending(name)
    setMessage('')
    try {
      await action()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setPending('')
    }
  }

  const setMode = (mode: UpdateMode) =>
    updateSettings((current) => ({
      ...current,
      updates: { ...current.updates, mode }
    }))

  const updateAdvanced = (change: Partial<(typeof settings.updates.advanced)['ytDlp']>) =>
    updateSettings((current) => ({
      ...current,
      updates: {
        ...current.updates,
        advanced: {
          ytDlp: { ...current.updates.advanced.ytDlp, ...change }
        }
      }
    }))

  return (
    <section
      id="updates"
      tabIndex={-1}
      className="scroll-mt-24 border border-[#32363f] bg-[#222222] p-6 outline-none sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Atualizações</h3>
          <p className="mt-1 text-sm text-[#a0a4a8]">
            Atualizações do Rovetrack e do componente yt-dlp são controladas separadamente.
          </p>
        </div>
        <ActionButton
          compact
          title="Verificar agora atualizações do Rovetrack e do yt-dlp"
          disabled={pending !== ''}
          onClick={() => void perform('check', window.api.checkForUpdates)}
        >
          <span className="flex items-center gap-2">
            <RefreshCw
              className={`h-4 w-4 ${pending === 'check' ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Verificar agora
          </span>
        </ActionButton>
      </div>

      <div className="mt-6 border border-[#32363f] bg-[#1b1b1f] p-4">
        <h4 className="font-bold">Rovetrack</h4>
        <dl className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[#6f767d]">Versão instalada</dt>
            <dd>{appState?.currentVersion ?? 'Carregando…'}</dd>
          </div>
          <div>
            <dt className="text-[#6f767d]">Status</dt>
            <dd>{statusLabels[appState?.status ?? 'idle']}</dd>
          </div>
          {appState?.availableVersion && (
            <div>
              <dt className="text-[#6f767d]">Nova versão</dt>
              <dd>{appState.availableVersion}</dd>
            </div>
          )}
          {appState?.status === 'downloading' && (
            <div>
              <dt className="text-[#6f767d]">Progresso</dt>
              <dd>{Math.round(appState.progress ?? 0)}%</dd>
            </div>
          )}
        </dl>
        {appState?.error && (
          <p role="alert" className="mt-3 text-xs text-amber-300">
            {appState.error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {appState?.status === 'available' && (
            <ActionButton
              compact
              tone="primary"
              disabled={pending !== ''}
              onClick={() => void perform('app-download', window.api.downloadApplicationUpdate)}
              title="Baixar a atualização disponível do Rovetrack"
            >
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" aria-hidden="true" />
                Baixar atualização
              </span>
            </ActionButton>
          )}
          {appState?.status === 'downloaded' && (
            <ActionButton
              compact
              tone="primary"
              disabled={pending !== '' || operationActive}
              onClick={() => void perform('app-install', window.api.installApplicationUpdate)}
              title={
                operationActive
                  ? 'Aguarde o download atual terminar'
                  : 'Reiniciar e instalar a atualização do Rovetrack'
              }
            >
              Reiniciar e instalar
            </ActionButton>
          )}
        </div>
        {appState?.status === 'downloaded' && operationActive && (
          <p className="mt-3 text-xs text-amber-300">
            Aguarde o download atual terminar antes de instalar a atualização.
          </p>
        )}
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-bold">Modo de atualização do yt-dlp</legend>
        <div className="mt-3 grid gap-3">
          {modes.map((mode) => (
            <label
              key={mode.id}
              className={`cursor-pointer border p-4 transition-colors ${updates.mode === mode.id ? 'border-[#A2ECFB] bg-[#A2ECFB]/5' : 'border-[#32363f] bg-[#1b1b1f] hover:border-[#6f767d]'}`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="update-mode"
                  value={mode.id}
                  checked={updates.mode === mode.id}
                  onChange={() => setMode(mode.id)}
                  className="mt-1 accent-[#A2ECFB]"
                />
                <span>
                  <span className="block text-sm font-bold">{mode.title}</span>
                  <span className="mt-1 block text-xs text-[#a0a4a8]">{mode.description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {updates.mode === 'advanced' && (
        <div className="mt-5 border border-[#32363f] bg-[#1b1b1f] p-4">
          <label htmlFor="yt-dlp-channel" className="text-sm font-bold">
            Canal do yt-dlp
          </label>
          <Select
            id="yt-dlp-channel"
            value={updates.advanced.ytDlp.channel}
            title="Selecionar canal oficial do yt-dlp"
            options={[
              { value: 'stable', label: 'Stable' },
              { value: 'nightly', label: 'Nightly' },
              { value: 'master', label: 'Master' }
            ]}
            onValueChange={(channel) => updateAdvanced({ channel: channel as YtDlpChannel })}
            className="mt-2"
          />
          <p className="mt-2 text-xs text-amber-200">
            {channelDescriptions[updates.advanced.ytDlp.channel]}
          </p>
          <div className="mt-4 grid gap-3">
            {(
              [
                ['autoCheck', 'Verificar atualizações automaticamente'],
                ['notifyWhenAvailable', 'Notificar quando houver atualização'],
                ['autoInstall', 'Instalar automaticamente']
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={updates.advanced.ytDlp[key]}
                  onChange={(event) => updateAdvanced({ [key]: event.target.checked })}
                  className="accent-[#A2ECFB]"
                />
                {label}
              </label>
            ))}
          </div>
          {updates.advanced.ytDlp.autoInstall && (
            <p className="mt-3 text-xs text-amber-300">
              A instalação automática aguarda qualquer download de mídia ativo terminar.
            </p>
          )}
        </div>
      )}

      <div className="mt-5 border border-[#32363f] bg-[#1b1b1f] p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#A2ECFB]" aria-hidden="true" />
          <h4 className="font-bold">yt-dlp</h4>
        </div>
        <dl className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[#6f767d]">Versão incluída</dt>
            <dd>{ytDlp?.bundledVersion ?? 'Não identificada'}</dd>
          </div>
          <div>
            <dt className="text-[#6f767d]">Versão ativa</dt>
            <dd>{ytDlp?.activeVersion ?? 'Não identificada'}</dd>
          </div>
          <div>
            <dt className="text-[#6f767d]">Origem</dt>
            <dd>{ytDlp?.source === 'managed' ? 'Independente' : 'Incluída no Rovetrack'}</dd>
          </div>
          <div>
            <dt className="text-[#6f767d]">Status</dt>
            <dd>{statusLabels[ytDlp?.status ?? 'idle']}</dd>
          </div>
          {ytDlp?.availableVersion && (
            <div>
              <dt className="text-[#6f767d]">Versão disponível</dt>
              <dd>{ytDlp.availableVersion}</dd>
            </div>
          )}
          {ytDlp?.lastCheckedAt && (
            <div>
              <dt className="text-[#6f767d]">Última verificação</dt>
              <dd>{new Date(ytDlp.lastCheckedAt).toLocaleString('pt-BR')}</dd>
            </div>
          )}
        </dl>
        {updates.mode === 'managed' && (
          <p className="mt-3 text-xs text-[#a0a4a8]">
            O yt-dlp será atualizado junto de uma futura release do Rovetrack.
          </p>
        )}
        {updates.mode === 'managed' && ytDlp?.managedInstalled && (
          <p className="mt-2 text-xs text-amber-200">
            Uma versão independente permanece instalada, mas não está sendo utilizada.
          </p>
        )}
        {ytDlp?.pendingInstall && (
          <p className="mt-3 text-xs text-amber-300">
            Atualização pendente; será instalada após o download atual.
          </p>
        )}
        {ytDlp?.error && (
          <p role="alert" className="mt-3 text-xs text-red-300">
            {ytDlp.error}
          </p>
        )}
        {operationActive && (
          <p className="mt-3 text-xs text-amber-300">
            Finalize o download atual antes de trocar a versão do yt-dlp.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {updates.mode !== 'managed' && ytDlp?.availableVersion && (
            <ActionButton
              compact
              tone="primary"
              disabled={pending !== '' || operationActive}
              title="Baixar, verificar e ativar a atualização oficial do yt-dlp"
              onClick={() =>
                void perform('component-update', () => window.api.updateComponent('yt-dlp'))
              }
            >
              Atualizar yt-dlp
            </ActionButton>
          )}
          {ytDlp?.previousVersion && (
            <ActionButton
              compact
              tone="warning"
              disabled={pending !== '' || operationActive}
              title="Voltar para a versão anterior do yt-dlp"
              onClick={() => {
                if (
                  window.confirm(
                    'Voltar para a versão anterior do yt-dlp? A versão atual será desativada e a versão anterior será usada.'
                  )
                )
                  void perform('rollback', () => window.api.rollbackComponent('yt-dlp'))
              }}
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Voltar para a versão anterior
              </span>
            </ActionButton>
          )}
          <ActionButton
            compact
            disabled={pending !== '' || operationActive}
            title="Restaurar a versão do yt-dlp incluída no Rovetrack"
            onClick={() => {
              if (
                window.confirm(
                  'Restaurar a versão incluída no Rovetrack? Isso desativará a versão independente e usará a distribuída com este aplicativo.'
                )
              )
                void perform('bundled', () => window.api.restoreBundledComponent('yt-dlp'))
            }}
          >
            Usar versão incluída no Rovetrack
          </ActionButton>
        </div>
      </div>
      {message && (
        <p
          role="alert"
          className="mt-4 border border-red-400/40 bg-red-400/10 p-3 text-xs text-red-300"
        >
          {message}
        </p>
      )}
    </section>
  )
}
