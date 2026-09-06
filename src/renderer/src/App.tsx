import { zodResolver } from '@hookform/resolvers/zod'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { PipelineReport, PipelineState } from '@shared/contracts/pipeline'
import { UrlAccessPolicy } from '@shared/security/urlAccessPolicy'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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

const activeStatuses = new Set(['preparing', 'downloading', 'forging'])
const isTerminalStatus = (status: PipelineState['status']): boolean =>
  status === 'success' || status === 'partial' || status === 'interrupted' || status === 'error'

export function DownloadPage(): React.JSX.Element {
  const { settings, updateSettings } = useAppSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const retryRequest = (location.state as { retryRequest?: MediaDownloadRequest } | null)
    ?.retryRequest
  const sessionRequest = retryRequest ?? getActiveRequest()
  const defaultPreset =
    (sessionRequest &&
      settings.downloadPresets.find(
        (preset) =>
          preset.mediaType === sessionRequest.mediaType &&
          preset.outputFormat === sessionRequest.outputFormat
      )) ??
    settings.downloadPresets.find((preset) => preset.id === 'music') ??
    settings.downloadPresets[0]
  const retryStartedRef = useRef(false)
  const [telemetry, setTelemetry] = useState<PipelineState | null>(getDownloadTelemetry)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<PipelineReport | null>(null)
  const [completedOutputDir, setCompletedOutputDir] = useState(
    sessionRequest?.destinationDirectory ?? ''
  )
  const [controlPending, setControlPending] = useState(false)
  const [actionError, setActionError] = useState('')

  const {
    register,
    control,
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
      presetId: defaultPreset.id,
      mediaType: sessionRequest?.mediaType ?? defaultPreset.mediaType,
      outputFormat: sessionRequest?.outputFormat ?? defaultPreset.outputFormat,
      quality: sessionRequest?.quality ?? defaultPreset.quality,
      thumbnailEnabled: sessionRequest?.thumbnail.enabled ?? defaultPreset.thumbnail.enabled,
      thumbnailAspectRatio:
        sessionRequest?.thumbnail.aspectRatio ?? defaultPreset.thumbnail.aspectRatio,
      thumbnailQuality: sessionRequest?.thumbnail.quality ?? defaultPreset.thumbnail.quality,
      thumbnailOutputFormat:
        sessionRequest?.thumbnail.outputFormat ?? defaultPreset.thumbnail.outputFormat,
      ...(sessionRequest && {
        url: sessionRequest.sourceUrl,
        outputDir: sessionRequest.destinationDirectory
      })
    }
  })

  useEffect(() => subscribeDownloadActivity(setTelemetry), [])

  useEffect(() => {
    if (!telemetry || !isTerminalStatus(telemetry.status)) return
    setSelectedReport(telemetry.report)
    setIsReportOpen(true)
  }, [telemetry])

  const onSubmit = async (data: DownloadFormData) => {
    const request: MediaDownloadRequest = {
      sourceUrl: data.url,
      destinationDirectory: data.outputDir,
      mediaType: data.mediaType,
      outputFormat: data.outputFormat,
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
      const hasDomainRules = settings.allowedSites.some(
        (site) => site.enabled && site.domains.length > 0
      )
      const message = hasDomainRules
        ? 'Este site não está autorizado nas configurações do Rovetrack.'
        : 'Informe uma URL HTTPS pública e segura.'
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
      presetId:
        settings.downloadPresets.find(
          (preset) =>
            preset.mediaType === retryRequest.mediaType &&
            preset.outputFormat === retryRequest.outputFormat
        )?.id ?? settings.downloadPresets[0].id,
      mediaType: retryRequest.mediaType,
      outputFormat: retryRequest.outputFormat,
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
        volume={settings.notifications.volume}
        lastAudibleVolume={settings.notifications.lastAudibleVolume}
        nativeEnabled={settings.notifications.nativeEnabled}
        onVolumeChange={(volume) =>
          updateSettings((current) => ({
            ...current,
            notifications: {
              ...current.notifications,
              volume,
              lastAudibleVolume: volume > 0 ? volume : current.notifications.lastAudibleVolume
            }
          }))
        }
        onToggleMute={() =>
          updateSettings((current) => ({
            ...current,
            notifications: {
              ...current.notifications,
              volume:
                current.notifications.volume > 0 ? 0 : current.notifications.lastAudibleVolume,
              lastAudibleVolume:
                current.notifications.volume > 0
                  ? current.notifications.volume
                  : current.notifications.lastAudibleVolume
            }
          }))
        }
        onToggleNative={() =>
          updateSettings((current) => ({
            ...current,
            notifications: {
              ...current.notifications,
              nativeEnabled: !current.notifications.nativeEnabled
            }
          }))
        }
      />
      <AppHeader />
      {actionError && (
        <div
          role="alert"
          className="w-full max-w-xl border border-red-400/50 bg-red-400/10 p-3 font-mono text-xs text-red-300"
        >
          <p>{actionError}</p>
          {(actionError.includes('autorizado') || actionError.includes('HTTPS pública')) && (
            <Link
              title="Abrir configurações de sites permitidos"
              to="/config"
              className="mt-2 inline-block font-bold text-[#A2ECFB]"
            >
              Abrir configurações de sites
            </Link>
          )}
        </div>
      )}
      <DownloadForm
        register={register}
        control={control}
        errors={errors}
        telemetry={telemetry}
        progress={calculateGlobalProgress(telemetry)}
        isActive={isActive}
        controlPending={controlPending}
        mediaType={watch('mediaType')}
        presets={settings.downloadPresets}
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
          setValue('outputFormat', preset.outputFormat)
          setValue('quality', preset.quality)
          setValue('thumbnailEnabled', preset.thumbnail.enabled)
          setValue('thumbnailAspectRatio', preset.thumbnail.aspectRatio)
          setValue('thumbnailQuality', preset.thumbnail.quality)
          setValue('thumbnailOutputFormat', preset.thumbnail.outputFormat)
        }}
        onMediaTypeChange={(mediaType) => {
          const preset = settings.downloadPresets.find((item) => item.mediaType === mediaType)
          if (!preset) return
          setValue('presetId', preset.id)
          setValue('outputFormat', preset.outputFormat)
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
            navigate('/history')
          }}
        />
      )}
    </main>
  )
}

export default DownloadPage
