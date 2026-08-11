const HISTORY_CACHE_NAME = 'rovetrack-download-history-v1'
const HISTORY_REQUEST_PREFIX = 'https://rovetrack.local/history/'
const HISTORY_FALLBACK_KEY = 'rovetrack:download-history-fallback'

export interface DownloadHistoryEntry {
  id: string
  createdAt: string
  url: string
  outputDir: string
  status: 'success' | 'error'
  name: string
  kind: 'track' | 'playlist'
  tracks: PipelineReportTrack[]
  report: PipelineReport
}

const historyRequest = (id: string) =>
  new Request(`${HISTORY_REQUEST_PREFIX}${encodeURIComponent(id)}`)

const readFallbackHistory = (): DownloadHistoryEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_FALLBACK_KEY) ?? '[]') as DownloadHistoryEntry[]
  } catch {
    return []
  }
}

const writeFallbackHistory = (entries: DownloadHistoryEntry[]) => {
  localStorage.setItem(HISTORY_FALLBACK_KEY, JSON.stringify(entries))
}

export async function saveDownloadHistory(entry: DownloadHistoryEntry): Promise<void> {
  try {
    const cache = await caches.open(HISTORY_CACHE_NAME)
    const response = new Response(JSON.stringify(entry), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
    await cache.put(historyRequest(entry.id), response)
    writeFallbackHistory(readFallbackHistory().filter((item) => item.id !== entry.id))
  } catch {
    // Alguns ambientes Electron com origem file:// restringem Cache Storage.
    const entries = readFallbackHistory().filter((item) => item.id !== entry.id)
    writeFallbackHistory([entry, ...entries])
  }
}

export async function listDownloadHistory(): Promise<DownloadHistoryEntry[]> {
  let entries: Array<DownloadHistoryEntry | null> = readFallbackHistory()

  try {
    const cache = await caches.open(HISTORY_CACHE_NAME)
    const requests = await cache.keys()
    const cachedEntries = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request)
        if (!response) return null

        try {
          return (await response.json()) as DownloadHistoryEntry
        } catch {
          return null
        }
      })
    )
    entries = [...cachedEntries, ...entries]
  } catch {}

  return [
    ...new Map(
      entries
        .filter((entry): entry is DownloadHistoryEntry => entry !== null)
        .map((entry) => [entry.id, entry])
    ).values()
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
}

export async function deleteDownloadHistoryEntry(id: string): Promise<void> {
  try {
    const cache = await caches.open(HISTORY_CACHE_NAME)
    await cache.delete(historyRequest(id))
  } catch {}

  writeFallbackHistory(readFallbackHistory().filter((entry) => entry.id !== id))
}

export async function clearDownloadHistory(): Promise<void> {
  try {
    await caches.delete(HISTORY_CACHE_NAME)
  } catch {}

  localStorage.removeItem(HISTORY_FALLBACK_KEY)
}
