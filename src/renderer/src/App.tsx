import { zodResolver } from '@hookform/resolvers/zod'
import type { PipelineReport, PipelineState } from '@shared/contracts/pipeline'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import notificationSound from './assets/notification.mp3'
import { AppHeader } from './components/AppHeader'
import { DownloadForm } from './components/DownloadForm'
import { HistoryModal } from './components/HistoryModal'
import { HistoryIcon } from './components/icons'
import { NotificationControls } from './components/NotificationControls'
import { ReportModal } from './components/ReportModal'
import { type DownloadFormData, downloadFormSchema } from './schemas/downloadForm'
import { HISTORY_SCHEMA_VERSION } from './schemas/downloadHistory'
import type { ActiveHistoryAttempt } from './types/app'
import type { DownloadHistoryEntry, DownloadHistoryStatus } from './types/downloadHistory'
import { calculateGlobalProgress } from './utils'
import { saveDownloadHistory } from './utils/downloadHistory'
import {
  readBooleanPreference,
  readLastAudibleVolume,
  readVolumePreference
} from './utils/preferences'

const activeStatuses = new Set(['preparing', 'downloading', 'forging'])
const isTerminalStatus = (status: PipelineState['status']): status is DownloadHistoryStatus =>
  status === 'success' || status === 'partial' || status === 'interrupted' || status === 'error'

function App(): React.JSX.Element {
  const [telemetry, setTelemetry] = useState<PipelineState | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [selectedReport, setSelectedReport] = useState<PipelineReport | null>(null)
  const [completedOutputDir, setCompletedOutputDir] = useState('')
  const [controlPending, setControlPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notificationVolume, setNotificationVolume] = useState(readVolumePreference)
  const [nativeNotificationsEnabled, setNativeNotificationsEnabled] = useState(() =>
    readBooleanPreference('rovetrack:native-notifications')
  )
  const notificationVolumeRef = useRef(notificationVolume)
  const lastAudibleVolumeRef = useRef(readLastAudibleVolume(notificationVolume))
  const activeHistoryAttemptRef = useRef<ActiveHistoryAttempt | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<DownloadFormData>({
    resolver: zodResolver(downloadFormSchema),
    defaultValues: { url: '', outputDir: '' }
  })

  useEffect(
    () =>
      window.api.onPipelineTelemetry((state) => {
        if (activeHistoryAttemptRef.current?.id !== state.runId) return
        setTelemetry(state)
      }),
    []
  )

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
    window.api.setNativeNotificationsEnabled(nativeNotificationsEnabled).catch(console.error)
  }, [nativeNotificationsEnabled])

  useEffect(() => {
    if (!telemetry || !isTerminalStatus(telemetry.status)) return
    setSelectedReport(telemetry.report)
    setIsReportOpen(true)
    if (notificationVolumeRef.current === 0) return
    const audio = new Audio(notificationSound)
    audio.volume = notificationVolumeRef.current / 100
    audio.play().catch(console.error)
  }, [telemetry])

  useEffect(() => {
    if (!telemetry || !isTerminalStatus(telemetry.status)) return
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
        (telemetry.status === 'interrupted'
          ? 'Download interrompido'
          : isPlaylist
            ? `Playlist com ${report.total} faixas`
            : 'Faixa sem título'),
      kind: isPlaylist ? 'playlist' : 'track',
      tracks: [...report.tracks],
      report
    }
    saveDownloadHistory(entry)
      .then(() => setHistoryVersion((version) => version + 1))
      .catch(console.error)
  }, [telemetry])

  const onSubmit = async (data: DownloadFormData) => {
    const runId = crypto.randomUUID()
    setActionError('')
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível iniciar o download.'
      setActionError(message)
      setTelemetry((current) => {
        if (!current || current.runId !== runId || isTerminalStatus(current.status)) return current
        return {
          ...current,
          status: 'error',
          message,
          report: {
            ...current.report,
            total: Math.max(current.report.total, 1),
            failed: Math.max(current.report.failed, 1),
            errors: current.report.errors.length
              ? current.report.errors
              : [{ trackId: 'pipeline', reason: message, category: 'configuration' }],
            tracks: current.report.tracks.length
              ? current.report.tracks
              : [{ trackId: 'pipeline', status: 'error' }]
          }
        }
      })
    }
  }

  const controlRun = async (action: (runId: string) => Promise<void>) => {
    const runId = activeHistoryAttemptRef.current?.id
    if (!runId) return
    setControlPending(true)
    setActionError('')
    try {
      await action(runId)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Não foi possível controlar a operação.'
      )
    } finally {
      setControlPending(false)
    }
  }

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) setValue('outputDir', folder, { shouldValidate: true })
  }

  const handleOpenOutputFolder = async () => {
    if (!completedOutputDir) return
    try {
      await window.api.openFolder(completedOutputDir)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'A pasta não está mais disponível.')
    }
  }

  const handleRetryDownload = (entry: DownloadHistoryEntry) => {
    setValue('url', entry.url, { shouldValidate: true })
    setValue('outputDir', entry.outputDir, { shouldValidate: true })
    void onSubmit({ url: entry.url, outputDir: entry.outputDir })
  }

  const handleInterrupt = () => {
    if (
      !window.confirm(
        'Interromper este download agora? O processo será encerrado, os arquivos temporários serão removidos e os itens já concluídos permanecerão na pasta de destino.'
      )
    ) {
      return
    }
    void controlRun(window.api.interruptAudio)
  }

  const isActive = activeStatuses.has(telemetry?.status ?? '')

  return (
    <main className="flex min-h-screen select-none flex-col items-center justify-center gap-10 bg-[#1b1b1f] p-6 font-sans text-[#f8f8f8]">
      <button
        type="button"
        aria-label="Abrir histórico de downloads"
        onClick={() => setIsHistoryOpen(true)}
        className="fixed left-5 top-5 z-40 flex h-10 w-10 items-center justify-center border border-[#32363f] bg-[#222222] text-[#a0a4a8] transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
      >
        <HistoryIcon />
      </button>
      <NotificationControls
        volume={notificationVolume}
        lastAudibleVolume={lastAudibleVolumeRef.current}
        nativeEnabled={nativeNotificationsEnabled}
        onVolumeChange={setNotificationVolume}
        onToggleMute={() =>
          setNotificationVolume(notificationVolume > 0 ? 0 : lastAudibleVolumeRef.current)
        }
        onToggleNative={() => setNativeNotificationsEnabled((enabled) => !enabled)}
      />
      <AppHeader />
      {actionError && (
        <p
          role="alert"
          className="w-full max-w-xl border border-red-400/50 bg-red-400/10 p-3 font-mono text-xs text-red-300"
        >
          {actionError}
        </p>
      )}
      <DownloadForm
        register={register}
        errors={errors}
        telemetry={telemetry}
        progress={calculateGlobalProgress(telemetry)}
        isActive={isActive}
        controlPending={controlPending}
        onSubmit={handleSubmit(onSubmit)}
        onSelectFolder={() => void handleSelectFolder()}
        onInterrupt={handleInterrupt}
        onViewReport={() => {
          if (telemetry) setSelectedReport(telemetry.report)
          setIsReportOpen(true)
        }}
        onOpenFolder={() => void handleOpenOutputFolder()}
      />
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
          onOpenHistory={() => {
            setIsReportOpen(false)
            setIsHistoryOpen(true)
          }}
        />
      )}
      <HistoryModal
        key={historyVersion}
        open={isHistoryOpen}
        isProcessing={isActive}
        onClose={() => setIsHistoryOpen(false)}
        onRetry={handleRetryDownload}
        onViewReport={(report) => {
          setIsHistoryOpen(false)
          setSelectedReport(report)
          setIsReportOpen(true)
        }}
      />
    </main>
  )
}

export default App
