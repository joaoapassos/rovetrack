import { zodResolver } from '@hookform/resolvers/zod'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { PipelineReport, PipelineState } from '@shared/contracts/pipeline'
import { UrlAccessPolicy } from '@shared/security/urlAccessPolicy'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import notificationSound from './assets/notification.mp3'
import { AppHeader } from './components/AppHeader'
import { DownloadForm } from './components/DownloadForm'
import { NotificationControls } from './components/NotificationControls'
import { ReportModal } from './components/ReportModal'
import { type DownloadFormData, downloadFormSchema } from './schemas/downloadForm'
import { useAppSettings } from './settings/AppSettingsContext'
import {
  beginDownloadActivity,
  getActiveRequest,
  getActiveRunId,
  getDownloadTelemetry,
  publishDownloadTelemetry,
  subscribeDownloadActivity
} from './state/downloadActivity'
import { calculateGlobalProgress } from './utils'
import {
  readBooleanPreference,
  readLastAudibleVolume,
  readVolumePreference
} from './utils/preferences'

const activeStatuses = new Set(['preparing', 'downloading', 'forging'])
const isTerminalStatus = (status: PipelineState['status']): boolean =>
  status === 'success' || status === 'partial' || status === 'interrupted' || status === 'error'

export function DownloadPage(): React.JSX.Element {
  const { settings } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const retryRequest = (location.state as { retryRequest?: MediaDownloadRequest } | null)
    ?.retryRequest
  const sessionRequest = retryRequest ?? getActiveRequest()
  const musicPreset =
    settings.downloadPresets.find((preset) => preset.id === 'music') ?? settings.downloadPresets[0]
  const retryStartedRef = useRef(false)
  const [telemetry, setTelemetry] = useState<PipelineState | null>(getDownloadTelemetry)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<PipelineReport | null>(null)
  const [completedOutputDir, setCompletedOutputDir] = useState(
    sessionRequest?.destinationDirectory ?? ''
  )
  const [controlPending, setControlPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notificationVolume, setNotificationVolume] = useState(readVolumePreference)
  const [nativeNotificationsEnabled, setNativeNotificationsEnabled] = useState(() =>
    readBooleanPreference('rovetrack:native-notifications')
  )
  const notificationVolumeRef = useRef(notificationVolume)
  const lastAudibleVolumeRef = useRef(readLastAudibleVolume(notificationVolume))

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors }
  } = useForm<DownloadFormData>({
    resolver: zodResolver(downloadFormSchema),
    defaultValues: {
      url: '',
      outputDir: '',
      presetId: sessionRequest?.mediaType === 'video' ? 'video' : 'music',
      mediaType: sessionRequest?.mediaType === 'video' ? 'video' : 'audio',
      quality: sessionRequest?.quality ?? musicPreset.quality,
      thumbnailEnabled: sessionRequest?.thumbnail.enabled ?? musicPreset.thumbnail.enabled,
      thumbnailAspectRatio:
        sessionRequest?.thumbnail.aspectRatio ?? musicPreset.thumbnail.aspectRatio,
      thumbnailQuality: sessionRequest?.thumbnail.quality ?? musicPreset.thumbnail.quality,
      thumbnailOutputFormat:
        sessionRequest?.thumbnail.outputFormat ?? musicPreset.thumbnail.outputFormat,
      ...(sessionRequest && {
        url: sessionRequest.sourceUrl,
        outputDir: sessionRequest.destinationDirectory
      })
    }
  })

  useEffect(() => subscribeDownloadActivity(setTelemetry), [])

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

  const onSubmit = async (data: DownloadFormData) => {
    const request: MediaDownloadRequest = {
      sourceUrl: data.url,
      destinationDirectory: data.outputDir,
      mediaType: data.mediaType,
      outputFormat: data.mediaType === 'audio' ? 'mp3' : 'mp4',
      quality: data.quality,
      thumbnail: {
        enabled: data.thumbnailEnabled,
        aspectRatio: data.thumbnailAspectRatio,
        quality: data.thumbnailQuality,
        outputFormat: data.thumbnailOutputFormat
      }
    }
    const policy = new UrlAccessPolicy(settings.allowedSites)
    if (!policy.allows(data.url)) {
      const message = 'Este site não está autorizado nas configurações do RoveTrack.'
      setError('url', {
        message
      })
      setActionError(message)
      return
    }
    const runId = crypto.randomUUID()
    setActionError('')
    setIsReportOpen(false)
    setCompletedOutputDir(data.outputDir)
    beginDownloadActivity(runId, request)
    try {
      await window.api.processMedia({
        runId,
        request,
        allowedDomains: settings.allowedSites
          .filter((site) => site.enabled)
          .flatMap((site) => site.domains)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível iniciar o download.'
      setActionError(message)
      const current = getDownloadTelemetry()
      if (current && current.runId === runId && !isTerminalStatus(current.status)) {
        publishDownloadTelemetry({
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
        })
      }
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: the retry state is consumed exactly once.
  useEffect(() => {
    if (!retryRequest || retryStartedRef.current) return
    retryStartedRef.current = true
    navigate('/', { replace: true, state: null })
    void onSubmit({
      url: retryRequest.sourceUrl,
      outputDir: retryRequest.destinationDirectory,
      presetId: retryRequest.mediaType === 'video' ? 'video' : 'music',
      mediaType: retryRequest.mediaType === 'video' ? 'video' : 'audio',
      quality: retryRequest.quality,
      thumbnailEnabled: retryRequest.thumbnail.enabled,
      thumbnailAspectRatio: retryRequest.thumbnail.aspectRatio,
      thumbnailQuality: retryRequest.thumbnail.quality,
      thumbnailOutputFormat: retryRequest.thumbnail.outputFormat
    })
  }, [retryRequest, navigate])

  const controlRun = async (action: (runId: string) => Promise<void>) => {
    const runId = getActiveRunId()
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

  const handleInterrupt = () => {
    if (
      !window.confirm(
        'Interromper este download agora? O processo será encerrado, os arquivos temporários serão removidos e os itens já concluídos permanecerão na pasta de destino.'
      )
    ) {
      return
    }
    void controlRun(window.api.interruptMedia)
  }

  const isActive = activeStatuses.has(telemetry?.status ?? '')

  return (
    <main className="flex min-h-screen select-none flex-col items-center justify-center gap-10 bg-[#1b1b1f] p-6 font-sans text-[#f8f8f8]">
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
        <div
          role="alert"
          className="w-full max-w-xl border border-red-400/50 bg-red-400/10 p-3 font-mono text-xs text-red-300"
        >
          <p>{actionError}</p>
          {actionError.includes('autorizado') && (
            <Link
              title="Abrir configurações de sites permitidos"
              to="/options/config"
              className="mt-2 inline-block font-bold text-[#A2ECFB]"
            >
              Abrir configurações de sites
            </Link>
          )}
        </div>
      )}
      <DownloadForm
        register={register}
        errors={errors}
        telemetry={telemetry}
        progress={calculateGlobalProgress(telemetry)}
        isActive={isActive}
        controlPending={controlPending}
        mediaType={watch('mediaType')}
        thumbnailEnabled={watch('thumbnailEnabled')}
        onSubmit={handleSubmit(onSubmit)}
        onSelectFolder={() => void handleSelectFolder()}
        onInterrupt={handleInterrupt}
        onViewReport={() => {
          if (telemetry) setSelectedReport(telemetry.report)
          setIsReportOpen(true)
        }}
        onOpenFolder={() => void handleOpenOutputFolder()}
        onPresetChange={(presetId) => {
          const preset = settings.downloadPresets.find((item) => item.id === presetId)
          if (!preset) return
          setValue('mediaType', preset.mediaType)
          setValue('quality', preset.quality)
          setValue('thumbnailEnabled', preset.thumbnail.enabled)
          setValue('thumbnailAspectRatio', preset.thumbnail.aspectRatio)
          setValue('thumbnailQuality', preset.thumbnail.quality)
          setValue('thumbnailOutputFormat', preset.thumbnail.outputFormat)
        }}
      />
      <footer className="text-sm text-gray-400">
        Copyright &copy; 2026{' '}
        <a
          href="https://github.com/joaoapassos"
          title="Abrir perfil de João Alves Passos no GitHub"
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
            window.dispatchEvent(new CustomEvent('rovetrack:open-history'))
          }}
        />
      )}
    </main>
  )
}

export default DownloadPage
