import type { PipelineReport, PipelineState } from '@shared/contracts/pipeline'
import type { ButtonHTMLAttributes, FormEventHandler, ReactNode } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { DownloadFormData } from '../schemas/downloadForm'
import type { DownloadHistoryEntry } from './downloadHistory'

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
  errors: FieldErrors<DownloadFormData>
  telemetry: PipelineState | null
  progress: number
  isActive: boolean
  controlPending: boolean
  onSubmit: FormEventHandler<HTMLFormElement>
  onSelectFolder: () => void
  onInterrupt: () => void
  onViewReport: () => void
  onOpenFolder: () => void
}

export interface HistoryModalProps {
  open: boolean
  isProcessing: boolean
  onClose: () => void
  onRetry: (entry: DownloadHistoryEntry) => void
  onViewReport: (report: PipelineReport) => void
}

export interface ReportModalProps {
  open: boolean
  report: PipelineReport
  onClose: () => void
  onOpenHistory: () => void
}
