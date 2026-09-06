import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AllowedSitesSettings } from '../components/settings/AllowedSitesSettings'
import { DownloadPresetsSettings } from '../components/settings/DownloadPresetsSettings'
import { NotificationsSettings } from '../components/settings/NotificationsSettings'
import { UpdateSettings } from '../components/settings/UpdateSettings'
import { useAppSettings } from '../settings/AppSettingsContext'
import { type BackupScope, createBackup, parseBackup } from '../settings/backup'
import { listDownloadHistory, mergeDownloadHistory } from '../utils/downloadHistory'

export function ConfigPage(): React.JSX.Element {
  const { settings, updateSettings, restoreDefaults, applicationVersion } = useAppSettings()
  const [dataMessage, setDataMessage] = useState('')
  const location = useLocation()

  useEffect(() => {
    if (new URLSearchParams(location.search).get('section') !== 'updates') return
    requestAnimationFrame(() => {
      const section = document.getElementById('updates')
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      section?.focus({ preventScroll: true })
    })
  }, [location.search])

  const exportBackup = async (scope: BackupScope) => {
    try {
      setDataMessage('')
      const backup = createBackup(scope, settings, await listDownloadHistory(), applicationVersion)
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
      if (importHistory && backup.sections.history)
        await mergeDownloadHistory(backup.sections.history)
      if (importSettings && backup.sections.settings) {
        updateSettings(() => backup.sections.settings as typeof settings)
      }
      setDataMessage('Backup importado com sucesso.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-sm text-[#a0a4a8]">Preferências e políticas persistidas localmente.</p>
      </header>

      <NotificationsSettings />
      <UpdateSettings />
      <AllowedSitesSettings />
      <DownloadPresetsSettings />

      <section id="backup" className="border border-[#32363f] bg-[#222222] p-6 sm:p-7">
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
            title="Selecionar e importar um backup do Rovetrack"
            onClick={() => void importBackup()}
            className="border border-[#414853] px-3 py-2 text-xs font-bold uppercase"
          >
            Importar backup
          </button>
        </div>
        {dataMessage && <p className="mt-3 text-xs text-[#A2ECFB]">{dataMessage}</p>}
        <Link
          to="/history"
          title="Abrir a página completa de histórico"
          className="mt-4 inline-block text-xs font-bold uppercase text-[#A2ECFB]"
        >
          Gerenciar histórico
        </Link>
      </section>

      <button
        type="button"
        title="Restaurar todas as configurações para os valores padrão"
        className="border border-[#f28b82] px-4 py-3 text-xs font-bold uppercase text-[#f28b82]"
        onClick={() => {
          if (
            window.confirm(
              'Restaurar sites, presets e notificações para os valores padrão? O histórico será preservado.'
            )
          ) {
            restoreDefaults()
          }
        }}
      >
        Restaurar todas as configurações
      </button>
    </div>
  )
}
