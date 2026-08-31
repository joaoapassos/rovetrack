import { zodResolver } from '@hookform/resolvers/zod'
import type { PipelineReport, PipelineState } from '@shared/contracts/pipeline'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Icon from './assets/icon.png'
import notificationSound from './assets/notification.mp3'
import { HistoryModal } from './components/HistoryModal'
import { ReportModal } from './components/ReportModal'
import { calculateGlobalProgress } from './utils'
import {
  type DownloadHistoryEntry,
  HISTORY_SCHEMA_VERSION,
  saveDownloadHistory
} from './utils/downloadHistory'

const schema = z.object({
  url: z.url('É necessário um link válido do YouTube.').refine((value) => {
    try {
      const parsed = new URL(value)
      return (
        parsed.protocol === 'https:' &&
        [
          'youtube.com',
          'www.youtube.com',
          'm.youtube.com',
          'music.youtube.com',
          'youtu.be'
        ].includes(parsed.hostname.toLowerCase())
      )
    } catch {
      return false
    }
  }, 'Informe uma URL HTTPS válida do YouTube.'),
  outputDir: z.string().min(1, 'Defina o caminho de destino para a expedição.')
})

type RoveFormData = z.infer<typeof schema>

const readPreference = (key: string): boolean => localStorage.getItem(key) !== 'false'

const readVolumePreference = (): number => {
  const rawVolume = localStorage.getItem('rovetrack:notification-volume')
  const savedVolume = Number(rawVolume)
  if (
    rawVolume !== null &&
    Number.isFinite(savedVolume) &&
    savedVolume >= 0 &&
    savedVolume <= 100
  ) {
    return savedVolume
  }

  // Migra a preferência binária usada nas versões anteriores.
  return readPreference('rovetrack:sound') ? 50 : 0
}

const readLastAudibleVolume = (currentVolume: number): number => {
  const rawVolume = localStorage.getItem('rovetrack:last-audible-volume')
  const savedVolume = Number(rawVolume)
  if (rawVolume !== null && Number.isFinite(savedVolume) && savedVolume > 0 && savedVolume <= 100) {
    return savedVolume
  }

  return currentVolume > 0 ? currentVolume : 50
}

interface ActiveHistoryAttempt {
  id: string
  url: string
  outputDir: string
  saved: boolean
}

function App(): React.JSX.Element {
  const [telemetry, setTelemetry] = useState<PipelineState | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [selectedReport, setSelectedReport] = useState<PipelineReport | null>(null)
  const [completedOutputDir, setCompletedOutputDir] = useState('')
  const [notificationVolume, setNotificationVolume] = useState(readVolumePreference)
  const [nativeNotificationsEnabled, setNativeNotificationsEnabled] = useState(() =>
    readPreference('rovetrack:native-notifications')
  )
  const logEndRef = useRef<HTMLDivElement>(null)
  const notificationVolumeRef = useRef(notificationVolume)
  const lastAudibleVolumeRef = useRef(readLastAudibleVolume(notificationVolume))
  const activeHistoryAttemptRef = useRef<ActiveHistoryAttempt | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    // watch,
    formState: { errors }
  } = useForm<RoveFormData>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', outputDir: '' }
  })

  // const outputDir = watch('outputDir')

  // --- Efeito de Telemetria ---
  useEffect(() => {
    return window.api.onPipelineTelemetry((state) => {
      if (activeHistoryAttemptRef.current?.id !== state.runId) return
      setTelemetry(state)
    })
  }, [])

  useEffect(() => {
    notificationVolumeRef.current = notificationVolume
    localStorage.setItem('rovetrack:notification-volume', String(notificationVolume))

    if (notificationVolume > 0) {
      lastAudibleVolumeRef.current = notificationVolume
      localStorage.setItem('rovetrack:last-audible-volume', String(notificationVolume))
    }
  }, [notificationVolume])

  useEffect(() => {
    localStorage.setItem('rovetrack:native-notifications', String(nativeNotificationsEnabled))
    window.api
      .setNativeNotificationsEnabled(nativeNotificationsEnabled)
      .catch((error) => console.error('Erro ao atualizar notificações nativas:', error))
  }, [nativeNotificationsEnabled])

  // Auto-scroll para o final do terminal sempre que o status muda
  useEffect(() => {
    if (telemetry) logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [telemetry])
  // ----------------------------

  // --- Efeito de Áudio (Notificação Tática) ---
  useEffect(() => {
    if (
      telemetry?.status === 'success' ||
      telemetry?.status === 'partial' ||
      telemetry?.status === 'error'
    ) {
      setSelectedReport(telemetry.report)
      setIsReportOpen(true)
      if (notificationVolumeRef.current === 0) return

      const audio = new Audio(notificationSound)
      audio.volume = notificationVolumeRef.current / 100
      audio.play().catch((error) => console.log('Erro ao reproduzir áudio:', error))
    }
  }, [telemetry])
  // --------------------------------------------

  useEffect(() => {
    if (
      !telemetry ||
      (telemetry.status !== 'success' &&
        telemetry.status !== 'partial' &&
        telemetry.status !== 'error')
    )
      return

    const attempt = activeHistoryAttemptRef.current
    if (!attempt || attempt.saved) return
    attempt.saved = true

    const report = telemetry.report
    const isPlaylist = Boolean(report.source?.collectionTitle) || report.total > 1
    const firstTrackTitle = report.tracks.find((track) => track.title)?.title
    const entry: DownloadHistoryEntry = {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      id: attempt.id,
      createdAt: new Date().toISOString(),
      url: attempt.url,
      outputDir: attempt.outputDir,
      status: telemetry.status,
      name:
        report.source?.collectionTitle ??
        report.source?.title ??
        firstTrackTitle ??
        (isPlaylist ? `Playlist com ${report.total} faixas` : 'Faixa sem título'),
      kind: isPlaylist ? 'playlist' : 'track',
      tracks: [...report.tracks],
      report
    }

    saveDownloadHistory(entry)
      .then(() => setHistoryVersion((version) => version + 1))
      .catch((error) => console.error('Erro ao guardar histórico:', error))
  }, [telemetry])

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) setValue('outputDir', folder, { shouldValidate: true })
  }

  const onSubmit = async (data: RoveFormData) => {
    const runId = crypto.randomUUID()
    setIsReportOpen(false)
    setIsHistoryOpen(false)
    setCompletedOutputDir(data.outputDir)
    activeHistoryAttemptRef.current = {
      id: runId,
      url: data.url,
      outputDir: data.outputDir,
      saved: false
    }
    setTelemetry({
      runId,
      status: 'preparing',
      message: 'A iniciar os motores...',
      progress: 0,
      step: { current: 1, total: 4 },
      batch: { current: 1, total: 1 },
      report: { total: 0, succeeded: 0, failed: 0, errors: [], tracks: [] }
    })
    try {
      await window.api.processAudio({
        runId,
        request: {
          sourceUrl: data.url,
          destinationDirectory: data.outputDir,
          mediaType: 'audio',
          outputFormat: 'mp3'
        }
      })
    } catch {
      // Falhas são apanhadas pelo estado 'error' da telemetria
    }
  }

  const isProcessing =
    telemetry?.status === 'preparing' ||
    telemetry?.status === 'downloading' ||
    telemetry?.status === 'forging'
  const isFinished = ['success', 'partial', 'error'].includes(telemetry?.status ?? '')
  const globalProgress = calculateGlobalProgress(telemetry)

  const handleOpenOutputFolder = async () => {
    if (!completedOutputDir) return
    await window.api.openFolder(completedOutputDir)
  }

  const handleNotificationVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = Number(event.target.value)
    notificationVolumeRef.current = volume

    if (volume > 0) {
      lastAudibleVolumeRef.current = volume
      localStorage.setItem('rovetrack:last-audible-volume', String(volume))
    }

    setNotificationVolume(volume)
  }

  const toggleNotificationMute = () => {
    const nextVolume = notificationVolume > 0 ? 0 : lastAudibleVolumeRef.current
    notificationVolumeRef.current = nextVolume
    setNotificationVolume(nextVolume)
  }

  const handleOpenHistory = () => {
    setIsReportOpen(false)
    setIsHistoryOpen(true)
  }

  const handleRetryDownload = (entry: DownloadHistoryEntry) => {
    setValue('url', entry.url, { shouldValidate: true })
    setValue('outputDir', entry.outputDir, { shouldValidate: true })
    void onSubmit({ url: entry.url, outputDir: entry.outputDir })
  }

  const handleViewHistoricalReport = (report: PipelineReport) => {
    setIsHistoryOpen(false)
    setSelectedReport(report)
    setIsReportOpen(true)
  }

  return (
    <main className="min-h-screen bg-[#1b1b1f] text-[#f8f8f8] flex flex-col gap-10 items-center justify-center p-6 select-none font-sans">
      <button
        type="button"
        aria-label="Abrir histórico de downloads"
        title="Abrir histórico de downloads"
        onClick={() => setIsHistoryOpen(true)}
        className="fixed left-5 top-5 z-40 flex h-10 w-10 items-center justify-center border border-[#32363f] bg-[#222222] text-[#a0a4a8] transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB] focus:outline-none focus:ring-2 focus:ring-[#A2ECFB]/30"
      >
        <HistoryIcon />
      </button>

      <fieldset
        className="fixed right-5 top-5 z-40 flex gap-2"
        aria-label="Controlos de notificação"
      >
        <div
          title={`Volume das notificações: ${notificationVolume}%`}
          className={`group flex h-10 w-10 overflow-hidden border bg-[#222222] transition-[width,border-color] duration-200 ease-out hover:w-48 focus-within:w-48 ${
            notificationVolume === 0 ? 'border-[#A2ECFB]' : 'border-[#32363f]'
          }`}
        >
          <button
            type="button"
            aria-label={notificationVolume === 0 ? 'Restaurar volume' : 'Silenciar notificações'}
            aria-pressed={notificationVolume === 0}
            title={
              notificationVolume === 0
                ? `Restaurar volume para ${lastAudibleVolumeRef.current}%`
                : `Silenciar notificações sonoras (${notificationVolume}%)`
            }
            onClick={toggleNotificationMute}
            className={`flex h-full w-10 shrink-0 items-center justify-center transition-colors focus:outline-none cursor-pointer ${
              notificationVolume === 0
                ? 'text-[#A2ECFB]'
                : 'text-[#a0a4a8] group-hover:text-[#f8f8f8]'
            }`}
          >
            <SoundIcon muted={notificationVolume === 0} />
          </button>

          <div className="flex min-w-[9.5rem] translate-x-2 items-center gap-2 pr-3 opacity-0 transition-[opacity,transform] delay-0 duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-75 group-focus-within:translate-x-0 group-focus-within:opacity-100">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={notificationVolume}
              onChange={handleNotificationVolumeChange}
              aria-label="Volume das notificações sonoras"
              title={`Volume das notificações: ${notificationVolume}%`}
              className="h-1.5 w-24 cursor-pointer accent-[#A2ECFB]"
            />
            <span className="w-8 text-right font-mono text-[10px] text-[#A2ECFB]">
              {notificationVolume}%
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label={
            nativeNotificationsEnabled
              ? 'Bloquear notificações nativas'
              : 'Ativar notificações nativas'
          }
          aria-pressed={!nativeNotificationsEnabled}
          title={
            nativeNotificationsEnabled
              ? 'Bloquear notificações nativas'
              : 'Ativar notificações nativas'
          }
          onClick={() => setNativeNotificationsEnabled((enabled) => !enabled)}
          className={`flex h-10 w-10 items-center justify-center border bg-[#222222] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A2ECFB]/30 cursor-pointer ${
            nativeNotificationsEnabled
              ? 'border-[#32363f] text-[#a0a4a8] hover:border-[#A2ECFB] hover:text-[#f8f8f8]'
              : 'border-[#A2ECFB] text-[#A2ECFB]'
          }`}
        >
          <BellIcon blocked={!nativeNotificationsEnabled} />
        </button>
      </fieldset>

      <header className="mb-8 text-center flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-[#282828] border-2 border-[#414853] rounded-lg mb-4 flex items-center justify-center shadow-lg">
          <img src={Icon} alt="Ícone do RoveTrack" className="w-16 h-16 mb-4" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase">
          RoveTrack <span className="text-sm text-blue-400">BETA</span>
        </h1>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-xl flex flex-col gap-5 bg-[#222222] border border-[#32363f] p-6 rounded-md shadow-2xl space-y-6"
      >
        <div className="space-y-2 flex flex-col gap-2">
          <label
            htmlFor="source-url"
            className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block"
          >
            URL (Video ou Playlist)
          </label>
          <input
            id="source-url"
            {...register('url')}
            disabled={isProcessing}
            placeholder="https://youtube.com/watch?v=... ou Playlist"
            className="w-full bg-[#161618] border border-[#32363f] focus:border-[#A2ECFB] outline-none text-[#e6edf3] text-sm p-3 rounded transition-colors font-mono"
          />
          {errors.url && (
            <p className="text-red-400 text-xs font-mono mt-1">{errors.url.message}</p>
          )}
        </div>

        <div className="space-y-2 flex flex-col gap-2">
          <label
            htmlFor="output-directory"
            className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block"
          >
            Salvar em
          </label>
          <div className="flex gap-2">
            <input
              id="output-directory"
              {...register('outputDir')}
              readOnly
              placeholder="Nenhum caminho selecionado..."
              className="flex-1 bg-[#161618] border border-[#32363f] text-[#a0a4a8] text-sm p-3 rounded font-mono truncate cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleSelectFolder}
              disabled={isProcessing}
              className="bg-[#32363f] hover:bg-[#414853] text-[#e6edf3] px-4 rounded border border-[#414853] font-semibold uppercase text-xs disabled:opacity-50 transition-colors"
            >
              Procurar
            </button>
          </div>
          {errors.outputDir && (
            <p className="text-red-400 text-xs font-mono mt-1">{errors.outputDir.message}</p>
          )}
        </div>

        {/* --- DISPLAY VISUAL DA TELEMETRIA COM PROGRESSO GLOBAL --- */}

        {telemetry && (
          <div className="w-full bg-[#0d0d0f] border border-[#32363f] rounded p-4 flex flex-col gap-3 shadow-inner">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#A2ECFB] uppercase font-bold flex items-center gap-2">
                {telemetry.status === 'downloading'
                  ? `A DESCARREGAR... ${telemetry.progress || 0}%`
                  : telemetry.status.toUpperCase()}
              </span>
              <span className="text-[#515c67]">
                FAIXA {telemetry.batch.current} / {telemetry.batch.total}
              </span>
            </div>

            {/* Barra de Progresso Suave (Global) */}
            <div className="w-full h-2 bg-[#161618] rounded-full overflow-hidden relative">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                  telemetry.status === 'error'
                    ? 'bg-red-500'
                    : telemetry.status === 'partial'
                      ? 'bg-amber-400'
                      : telemetry.status === 'success'
                        ? 'bg-green-500'
                        : 'bg-[#A2ECFB]'
                }`}
                style={{ width: `${globalProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#a0a4a8] max-w-[80%]" title={telemetry.message}>
                {telemetry.message}
              </span>
              <span className="text-[#515c67] ml-2 shrink-0">{Math.round(globalProgress)}%</span>
            </div>
            {/* Âncora para scroll caso decida voltar a meter logs em lista */}
            <div ref={logEndRef} />
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-4 rounded font-bold uppercase tracking-widest transition-all ${
            isProcessing
              ? 'bg-[#32363f] text-[#8b949e] cursor-not-allowed border border-[#414853]'
              : 'bg-[#A2ECFB] text-[#1b1b1f] hover:bg-[#8bd6e5] shadow-[0_0_15px_rgba(162,236,251,0.2)]'
          }`}
        >
          {isProcessing ? 'Andamento...' : 'Iniciar'}
        </button>

        {isFinished && telemetry && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedReport(telemetry.report)
                setIsReportOpen(true)
              }}
              className="w-full border border-[#A2ECFB] bg-[#222222] py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#A2ECFB] transition-colors hover:bg-[#2a3033] focus:outline-none focus:ring-2 focus:ring-[#A2ECFB]/30"
            >
              Ver relatório
            </button>
            <button
              type="button"
              onClick={handleOpenOutputFolder}
              className="w-full border border-[#414853] bg-[#32363f] py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f8f8f8] transition-colors hover:border-[#A2ECFB] hover:bg-[#3a3f47] focus:outline-none focus:ring-2 focus:ring-[#A2ECFB]/30"
            >
              Abrir pasta
            </button>
          </div>
        )}
      </form>

      <footer className="text-sm text-gray-400">
        Copyright &copy; 2026{' '}
        <a
          href="https://github.com/joaoapassos"
          target="_blank"
          rel="noreferrer"
          className="text-blue-400"
        >
          @joaoapassos
        </a>
      </footer>

      {selectedReport && (
        <ReportModal
          open={isReportOpen}
          report={selectedReport}
          onClose={() => setIsReportOpen(false)}
          onOpenHistory={handleOpenHistory}
        />
      )}

      <HistoryModal
        key={historyVersion}
        open={isHistoryOpen}
        isProcessing={isProcessing}
        onClose={() => setIsHistoryOpen(false)}
        onRetry={handleRetryDownload}
        onViewReport={handleViewHistoricalReport}
      />
    </main>
  )
}

function SoundIcon({ muted }: { muted: boolean }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="square" strokeLinejoin="miter" d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z" />
      {muted ? (
        <path strokeLinecap="square" d="m15 9 6 6m0-6-6 6" />
      ) : (
        <path strokeLinecap="square" d="M15 9.5a4 4 0 0 1 0 5m2.5-7.5a7 7 0 0 1 0 10" />
      )}
    </svg>
  )
}

function BellIcon({ blocked }: { blocked: boolean }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
      />
      {blocked && <path strokeLinecap="square" d="M4 4 20 20" />}
    </svg>
  )
}

function HistoryIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="square" strokeLinejoin="miter" d="M4 5h16v15H4V5Zm3-3h10v3H7V2Z" />
      <path strokeLinecap="square" d="M8 10h8M8 14h8" />
    </svg>
  )
}

export default App
