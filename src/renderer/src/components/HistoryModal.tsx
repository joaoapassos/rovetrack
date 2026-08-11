import { useEffect, useState } from 'react'
import {
  clearDownloadHistory,
  type DownloadHistoryEntry,
  deleteDownloadHistoryEntry,
  listDownloadHistory
} from '../utils/downloadHistory'

interface HistoryModalProps {
  open: boolean
  isProcessing: boolean
  onClose: () => void
  onRetry: (entry: DownloadHistoryEntry) => void
  onViewReport: (report: PipelineReport) => void
}

const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

export function HistoryModal({
  open,
  isProcessing,
  onClose,
  onRetry,
  onViewReport
}: HistoryModalProps): React.JSX.Element | null {
  const [entries, setEntries] = useState<DownloadHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!open) return

    setLoading(true)
    setLoadError('')
    listDownloadHistory()
      .then(setEntries)
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  const handleDelete = async (id: string) => {
    await deleteDownloadHistoryEntry(id)
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }

  const handleClear = async () => {
    if (!window.confirm('Limpar todo o histórico de downloads?')) return
    await clearDownloadHistory()
    setEntries([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar histórico"
        className="absolute inset-0 h-full w-full cursor-default bg-black/80"
        onClick={onClose}
        type="button"
      />

      <section
        aria-labelledby="history-modal-title"
        aria-modal="true"
        className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-[#414853] bg-[#222222] shadow-2xl"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-[#32363f] bg-[#1b1b1f] px-6 py-4">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#A2ECFB]">
              Arquivo de operações
            </p>
            <h2 id="history-modal-title" className="text-lg font-bold uppercase text-[#f8f8f8]">
              Histórico de downloads
            </h2>
          </div>
          <span className="font-mono text-xs text-[#a0a4a8]">{entries.length} REGISTOS</span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && <p className="font-mono text-xs text-[#a0a4a8]">A carregar histórico...</p>}
          {loadError && <p className="font-mono text-xs text-[#f28b82]">{loadError}</p>}
          {!loading && !loadError && entries.length === 0 && (
            <div className="border border-dashed border-[#414853] bg-[#1b1b1f] p-8 text-center">
              <p className="font-mono text-xs uppercase tracking-wider text-[#a0a4a8]">
                Nenhuma operação arquivada.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {entries.map((entry) => {
              const tracks = entry.tracks ?? entry.report.tracks ?? []

              return (
                <li className="border border-[#32363f] bg-[#1b1b1f]" key={entry.id}>
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            entry.status === 'success'
                              ? 'border-[#A2ECFB]/50 text-[#A2ECFB]'
                              : 'border-[#f28b82]/50 text-[#f28b82]'
                          }`}
                        >
                          {entry.status === 'success' ? 'Concluído' : 'Com falhas'}
                        </span>
                        <time className="font-mono text-[10px] text-[#6f767d]">
                          {dateFormatter.format(new Date(entry.createdAt))}
                        </time>
                      </div>

                      <h3 className="truncate text-sm font-bold text-[#f8f8f8]" title={entry.name}>
                        {entry.name}
                      </h3>
                      <p
                        className="mt-2 truncate font-mono text-[10px] text-[#6f767d]"
                        title={entry.url}
                      >
                        URL: {entry.url}
                      </p>
                      <p
                        className="mt-1 truncate font-mono text-[10px] text-[#a0a4a8]"
                        title={entry.outputDir}
                      >
                        DESTINO: {entry.outputDir}
                      </p>

                      <div className="mt-3 flex gap-4 font-mono text-[10px] uppercase">
                        <span className="text-[#a0a4a8]">Total {entry.report.total}</span>
                        <span className="text-[#A2ECFB]">Sucesso {entry.report.succeeded}</span>
                        <span className="text-[#f28b82]">Falhas {entry.report.failed}</span>
                      </div>

                      {entry.kind === 'playlist' && tracks.length > 0 && (
                        <details className="mt-3 border-t border-[#32363f] pt-3">
                          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-[#a0a4a8]">
                            Ver {tracks.length} faixas
                          </summary>
                          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto font-mono text-[10px]">
                            {tracks.map((track) => (
                              <li
                                className={
                                  track.status === 'success' ? 'text-[#a0a4a8]' : 'text-[#f28b82]'
                                }
                                key={`${track.trackId}-${track.status}`}
                              >
                                {track.status === 'success' ? 'OK' : 'ERR'} ·{' '}
                                {track.title ?? track.trackId}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>

                    <div className="grid shrink-0 grid-cols-3 gap-2 sm:grid-cols-1">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onRetry(entry)}
                        className="border border-[#A2ECFB] px-3 py-2 text-[10px] font-bold uppercase text-[#A2ECFB] hover:bg-[#A2ECFB] hover:text-[#1b1b1f] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Tentar novamente
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewReport(entry.report)}
                        className="border border-[#414853] px-3 py-2 text-[10px] font-bold uppercase text-[#f8f8f8] hover:border-[#A2ECFB]"
                      >
                        Ver relatório
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry.id)}
                        className="border border-[#414853] px-3 py-2 text-[10px] font-bold uppercase text-[#f28b82] hover:border-[#f28b82]"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <footer className="flex items-center justify-between border-t border-[#32363f] bg-[#1b1b1f] px-6 py-4">
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={() => void handleClear()}
            className="border border-[#414853] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#f28b82] hover:border-[#f28b82] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Limpar histórico
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#A2ECFB] bg-[#A2ECFB] px-5 py-2 text-xs font-black uppercase tracking-wider text-[#1b1b1f] hover:bg-[#8bd6e5]"
          >
            Fechar
          </button>
        </footer>
      </section>
    </div>
  )
}
