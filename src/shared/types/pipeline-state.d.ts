/** Uma falha individual ocorrida durante o download ou pós-processamento. */
declare interface PipelineReportError {
  /** ID do vídeo no YouTube, ou um identificador da posição quando o ID não estiver disponível. */
  trackId: string
  /** Título, quando já tiver sido possível ler os metadados. */
  title?: string
  /** Mensagem limpa devolvida pelo yt-dlp ou pelo pós-processamento. */
  reason: string
  /** Área em que a falha ocorreu, usada para apresentar um diagnóstico mais claro. */
  category?:
    | 'access'
    | 'authentication'
    | 'availability'
    | 'configuration'
    | 'network'
    | 'postprocessing'
    | 'unknown'
  /** Próxima ação recomendada ao utilizador. */
  suggestion?: string
  /** Mensagem técnica original, preservada para diagnóstico. */
  technicalDetails?: string
  /** Indica se repetir mais tarde pode resolver a falha. */
  retryable?: boolean
}

/** Faixa identificada durante uma tentativa de extração. */
declare interface PipelineReportTrack {
  trackId: string
  title?: string
  status: 'success' | 'error'
}

/** Resumo acumulado de uma execução do pipeline. */
declare interface PipelineReport {
  total: number
  succeeded: number
  failed: number
  errors: PipelineReportError[]
  tracks: PipelineReportTrack[]
  source?: {
    title?: string
    playlistTitle?: string
  }
}

/** Representa o estado atualizado da máquina de extração. */
declare interface PipelineState {
  status: 'idle' | 'preparing' | 'downloading' | 'forging' | 'success' | 'error'
  message: string
  /** Progresso do download, de 0 a 100. */
  progress: number
  step: {
    current: number
    total: number
  }
  batch: {
    current: number
    total: number
  }
  metadata?: {
    title?: string
  }
  /** Relatório incremental; fica completo quando o estado for success ou error. */
  report: PipelineReport
}
