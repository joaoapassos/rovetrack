import type { PipelineReport, PipelineReportError } from '@shared/contracts/pipeline'
import { useEffect } from 'react'

interface ReportModalProps {
  open: boolean
  report: PipelineReport
  onClose: () => void
  onOpenHistory: () => void
}

export function ReportModal({
  open,
  report,
  onClose,
  onOpenHistory
}: ReportModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar relatório"
        className="absolute inset-0 h-full w-full cursor-default bg-black/80"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="report-modal-title"
        aria-modal="true"
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-[#414853] bg-[#222222] shadow-2xl"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-[#32363f] bg-[#1b1b1f] px-6 py-4">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#A2ECFB]">
              Registo de operação
            </p>
            <h2 id="report-modal-title" className="text-lg font-bold uppercase text-[#f8f8f8]">
              Relatório da expedição
            </h2>
          </div>
          {/* <span className="border border-[#32363f] bg-[#222222] px-2 py-1 font-mono text-[10px] text-[#a0a4a8]">
            FINAL
          </span> */}
        </header>

        <div className="grid grid-cols-3 border-b border-[#32363f] bg-[#1b1b1f]">
          <Metric label="Processadas" value={report.total} />
          <Metric label="Sucesso" value={report.succeeded} tone="text-[#A2ECFB]" />
          <Metric label="Falhas" value={report.failed} tone="text-[#f28b82]" />
        </div>

        <div className="min-h-0 flex-1 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#a0a4a8]">
              Diagnóstico de falhas
            </h3>
            <span className="font-mono text-[10px] text-[#6f767d]">STDERR / PIPELINE</span>
          </div>

          <div className="max-h-72 overflow-y-auto border border-[#32363f] bg-[#121214]">
            {report.errors.length === 0 ? (
              <p className="p-5 font-mono text-xs text-[#a0a4a8]">
                Nenhuma falha registada nesta operação.
              </p>
            ) : (
              <ul className="divide-y divide-[#32363f]">
                {report.errors.map((error, index) => (
                  <li className="p-4 font-mono text-xs" key={`${error.trackId}-${error.reason}`}>
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-bold text-[#f28b82]">
                        ERR-{String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="break-all text-[#f8f8f8]">
                        {error.title ?? error.trackId}
                      </span>
                      {error.title && (
                        <span className="break-all text-[#6f767d]">ID: {error.trackId}</span>
                      )}
                      {error.category && (
                        <span className="border border-[#414853] px-1.5 py-0.5 text-[9px] uppercase text-[#a0a4a8]">
                          {categoryLabel(error.category)}
                        </span>
                      )}
                    </div>
                    <p className="break-words leading-5 text-[#f8f8f8]">{error.reason}</p>
                    {error.suggestion && (
                      <p className="mt-2 break-words border-l-2 border-[#A2ECFB]/60 pl-3 leading-5 text-[#a0a4a8]">
                        Próxima ação: {error.suggestion}
                      </p>
                    )}
                    {error.technicalDetails && (
                      <details className="mt-3 text-[#6f767d]">
                        <summary className="cursor-pointer text-[10px] uppercase tracking-wider hover:text-[#a0a4a8]">
                          Ver detalhes técnicos
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all border border-[#32363f] bg-[#0d0d0f] p-3 text-[10px] leading-4">
                          {error.technicalDetails}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#32363f] bg-[#1b1b1f] px-6 py-4">
          <button
            className="border border-[#414853] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a0a4a8] transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
            onClick={onOpenHistory}
            type="button"
          >
            Ver todo o histórico
          </button>
          <button
            className="border border-[#A2ECFB] bg-[#A2ECFB] px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#1b1b1f] transition-colors hover:bg-[#8bd6e5] focus:outline-none focus:ring-2 focus:ring-[#A2ECFB]/40"
            onClick={onClose}
            type="button"
          >
            Fechar relatório
          </button>
        </footer>
      </section>
    </div>
  )
}

function categoryLabel(category: NonNullable<PipelineReportError['category']>): string {
  const labels: Record<NonNullable<PipelineReportError['category']>, string> = {
    access: 'Acesso do YouTube',
    authentication: 'Autenticação',
    availability: 'Indisponível',
    configuration: 'Configuração',
    network: 'Rede',
    postprocessing: 'Finalização',
    unknown: 'Não identificado'
  }

  return labels[category]
}

function Metric({
  label,
  value,
  tone = 'text-[#f8f8f8]'
}: {
  label: string
  value: number
  tone?: string
}): React.JSX.Element {
  return (
    <div className="border-r border-[#32363f] px-4 py-5 text-center last:border-r-0">
      <strong className={`block font-mono text-2xl font-bold ${tone}`}>{value}</strong>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a0a4a8]">{label}</span>
    </div>
  )
}
