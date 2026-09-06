import type { PipelineReport, PipelineState } from '@shared/contracts/pipeline'
import type { ButtonHTMLAttributes, FormEventHandler, ReactNode } from 'react'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import type { DownloadFormData } from '../schemas/downloadForm'

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'secondary' | 'warning' | 'danger'
  compact?: boolean
}

export interface FormFieldProps {
  id: string
  label: string
  error?: string
  children: ReactNode
}

export interface NotificationControlsProps {
  volume: number
  lastAudibleVolume: number
  nativeEnabled: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
  onToggleNative: () => void
}

export interface TelemetryPanelProps {
  telemetry: PipelineState
  progress: number
}

export interface DownloadFormProps {
  register: UseFormRegister<DownloadFormData>
  control: Control<DownloadFormData>
  errors: FieldErrors<DownloadFormData>
  telemetry: PipelineState | null
  progress: number
  isActive: boolean
  controlPending: boolean
  mediaType: 'audio' | 'video'
  thumbnailEnabled: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  onSelectFolder: () => void
  onInterrupt: () => void
  onViewReport: () => void
  onOpenFolder: () => void
  onPresetChange: (presetId: 'music' | 'video') => void
}

export interface ReportModalProps {
  open: boolean
  report: PipelineReport
  onClose: () => void
  onOpenHistory: () => void
}
