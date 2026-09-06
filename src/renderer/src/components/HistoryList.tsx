import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DownloadHistoryEntry } from '../types/downloadHistory'
import {
  clearDownloadHistory,
  deleteDownloadHistoryEntry,
  filterDownloadHistory,
  type HistoryStatusFilter,
  listDownloadHistory
} from '../utils/downloadHistory'
import { SearchInput } from './SearchInput'
import { Select } from './Select'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'success', label: 'Concluídos' },
  { value: 'partial', label: 'Parciais' },
  { value: 'interrupted', label: 'Interrompidos' },
  { value: 'error', label: 'Falhas' }
] as const

interface HistoryListProps {
  isProcessing: boolean
  onRetry: (entry: DownloadHistoryEntry) => void
  onViewReport: (entry: DownloadHistoryEntry) => void
}

export function HistoryList({
  isProcessing,
  onRetry,
  onViewReport
}: HistoryListProps): React.JSX.Element {
  const [entries, setEntries] = useState<DownloadHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [folderAvailability, setFolderAvailability] = useState<Record<string, boolean>>({})
  const [folderError, setFolderError] = useState('')
  const [revision, setRevision] = useState(0)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all')
  const filteredEntries = useMemo(
    () => filterDownloadHistory(entries, query, statusFilter),
    [entries, query, statusFilter]
  )
  const filtersActive = query.trim().length > 0 || statusFilter !== 'all'

  useEffect(() => {
    const reload = () => setRevision((current) => current + 1)
    window.addEventListener('rovetrack:history-changed', reload)
    return () => window.removeEventListener('rovetrack:history-changed', reload)
  }, [])

  useEffect(() => {
    void revision
    setLoading(true)
    setLoadError('')
    listDownloadHistory()
      .then(async (historyEntries) => {
        setEntries(historyEntries)
        const availability = await Promise.all(
          historyEntries.map(
            async (entry) => [entry.id, await window.api.directoryExists(entry.outputDir)] as const
          )
        )
        setFolderAvailability(Object.fromEntries(availability))
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false))
  }, [revision])

  const handleDelete = async (id: string) => {
    await deleteDownloadHistoryEntry(id)
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }

  const handleClear = async () => {
    if (!window.confirm('Limpar todo o histórico de downloads?')) return
    await clearDownloadHistory()
    setEntries([])
  }

  const handleOpenFolder = async (entry: DownloadHistoryEntry) => {
    setFolderError('')
    try {
      await window.api.openFolder(entry.outputDir)
    } catch {
      setFolderAvailability((current) => ({ ...current, [entry.id]: false }))
      setFolderError('A pasta selecionada não existe mais ou não é um diretório local válido.')
    }
  }

  return (
    <section
      aria-labelledby="history-list-title"
      className="mx-auto w-full overflow-hidden border border-[#414853] bg-[#222222] shadow-2xl"
    >
      <header className="flex flex-col items-center gap-3 border-b border-[#32363f] bg-[#1b1b1f] px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#A2ECFB]">
            Arquivo de operações
          </p>
          <h2 id="history-list-title" className="text-lg font-bold uppercase text-[#f8f8f8]">
            Histórico de downloads
          </h2>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <span className="font-mono text-xs text-[#a0a4a8]" aria-live="polite">
            {filtersActive ? `${filteredEntries.length} DE ${entries.length}` : entries.length}{' '}
            REGISTROS
          </span>
          <button
            type="button"
            title="Limpar todo o histórico"
            disabled={entries.length === 0}
            onClick={() => void handleClear()}
            className="border border-[#414853] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#f28b82] transition-colors hover:border-[#f28b82] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Limpar histórico
          </button>
        </div>
      </header>

      <div className="p-5 sm:p-7">
        <div className="mb-7 grid gap-4 border border-[#32363f] bg-[#1b1b1f] p-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <label htmlFor="history-search" className="flex min-w-0 flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a0a4a8]">
              Buscar no histórico
            </span>
            <SearchInput
              id="history-search"
              value={query}
              title="Buscar por arquivo, item da playlist, pasta ou link"
              placeholder="Arquivo, item, pasta ou link"
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery('')}
            />
          </label>

          <label htmlFor="history-status" className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a0a4a8]">
              Status
            </span>
            <Select
              id="history-status"
              value={statusFilter}
              title="Filtrar downloads por status"
              options={statusOptions}
              onValueChange={(value) => setStatusFilter(value as HistoryStatusFilter)}
            />
          </label>

          <button
            type="button"
            title="Limpar busca e filtro de status"
            disabled={!filtersActive}
            onClick={() => {
              setQuery('')
              setStatusFilter('all')
            }}
            className="flex items-center justify-center gap-2 border border-[#414853] px-4 py-2.5 text-[10px] font-bold uppercase text-[#a0a4a8] transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Resetar filtros
          </button>
        </div>

        {loading && <p className="font-mono text-xs text-[#a0a4a8]">Carregando histórico...</p>}
        {loadError && <p className="font-mono text-xs text-[#f28b82]">{loadError}</p>}
        {folderError && <p className="mb-3 font-mono text-xs text-[#f28b82]">{folderError}</p>}
        {!loading && !loadError && entries.length === 0 && (
          <div className="border border-dashed border-[#414853] bg-[#1b1b1f] p-8 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-[#a0a4a8]">
              Nenhuma operação arquivada.
            </p>
          </div>
        )}
        {!loading && !loadError && entries.length > 0 && filteredEntries.length === 0 && (
          <div className="border border-dashed border-[#414853] bg-[#1b1b1f] p-8 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-[#a0a4a8]">
              Nenhum registro corresponde aos filtros.
            </p>
            <button
              type="button"
              title="Limpar busca e filtro de status"
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
              }}
              className="mt-4 text-[10px] font-bold uppercase text-[#A2ECFB]"
            >
              Limpar filtros
            </button>
          </div>
        )}

        <ul className="space-y-5">
          {filteredEntries.map((entry) => {
            const tracks = entry.tracks ?? entry.report.tracks ?? []
            return (
              <li className="border border-[#32363f] bg-[#1b1b1f]" key={entry.id}>
                <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          entry.status === 'success'
                            ? 'border-[#A2ECFB]/50 text-[#A2ECFB]'
                            : entry.status === 'partial'
                              ? 'border-amber-400/50 text-amber-400'
                              : entry.status === 'interrupted'
                                ? 'border-orange-400/50 text-orange-400'
                                : 'border-[#f28b82]/50 text-[#f28b82]'
                        }`}
                      >
                        {entry.status === 'success'
                          ? 'Concluído'
                          : entry.status === 'partial'
                            ? 'Parcial'
                            : entry.status === 'interrupted'
                              ? 'Interrompido'
                              : 'Falhou'}
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

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase">
                      <span className="text-[#a0a4a8]">Total {entry.report.total}</span>
                      <span className="text-[#A2ECFB]">Sucesso {entry.report.succeeded}</span>
                      <span className="text-[#f28b82]">Falhas {entry.report.failed}</span>
                    </div>

                    {entry.kind === 'playlist' && tracks.length > 0 && (
                      <details className="mt-3 border-t border-[#32363f] pt-3">
                        <summary
                          title="Mostrar ou ocultar itens desta operação"
                          className="text-[10px] font-bold uppercase tracking-wider text-[#a0a4a8]"
                        >
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
                              {track.status === 'success' ? 'OK' : 'ERRO'} ·{' '}
                              {track.title ?? track.trackId}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-1">
                    <button
                      type="button"
                      disabled={!folderAvailability[entry.id]}
                      title={
                        folderAvailability[entry.id]
                          ? 'Abrir pasta de destino'
                          : 'Pasta indisponível'
                      }
                      onClick={() => void handleOpenFolder(entry)}
                      className="border border-[#414853] px-3 py-2 text-[10px] font-bold uppercase text-[#f8f8f8] hover:border-[#A2ECFB] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {folderAvailability[entry.id] === undefined
                        ? 'Verificando pasta'
                        : folderAvailability[entry.id]
                          ? 'Abrir pasta'
                          : 'Pasta indisponível'}
                    </button>
                    <button
                      type="button"
                      title={
                        isProcessing
                          ? 'Aguarde o download atual terminar'
                          : 'Tentar este download novamente'
                      }
                      disabled={isProcessing}
                      onClick={() => onRetry(entry)}
                      className="border border-[#A2ECFB] px-3 py-2 text-[10px] font-bold uppercase text-[#A2ECFB] hover:bg-[#A2ECFB] hover:text-[#1b1b1f] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Tentar novamente
                    </button>
                    <button
                      type="button"
                      title="Ver relatório desta operação"
                      onClick={() => onViewReport(entry)}
                      className="border border-[#414853] px-3 py-2 text-[10px] font-bold uppercase text-[#f8f8f8] hover:border-[#A2ECFB]"
                    >
                      Ver relatório
                    </button>
                    <button
                      type="button"
                      title="Excluir esta operação do histórico"
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
    </section>
  )
}
