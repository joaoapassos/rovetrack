import {
  currentHistoryEntrySchema,
  HISTORY_LIMIT,
  HISTORY_SCHEMA_VERSION,
  legacyHistoryEntrySchema,
  versionOneHistoryEntrySchema
} from '../schemas/downloadHistory'
import type { DownloadHistoryEntry } from '../types/downloadHistory'

export { HISTORY_LIMIT, HISTORY_SCHEMA_VERSION } from '../schemas/downloadHistory'
export type { DownloadHistoryEntry } from '../types/downloadHistory'

const HISTORY_CACHE_NAME = 'rovetrack-download-history-v1'
const HISTORY_REQUEST_PREFIX = 'https://rovetrack.local/history/'
const HISTORY_FALLBACK_KEY = 'rovetrack:download-history-fallback'

export function parseDownloadHistoryEntry(input: unknown): DownloadHistoryEntry | null {
  const current = currentHistoryEntrySchema.safeParse(input)
  if (current.success) return current.data
  const versionOne = versionOneHistoryEntrySchema.safeParse(input)
  if (versionOne.success) return { ...versionOne.data, schemaVersion: HISTORY_SCHEMA_VERSION }
  const legacy = legacyHistoryEntrySchema.safeParse(input)
  return legacy.success ? { ...legacy.data, schemaVersion: HISTORY_SCHEMA_VERSION } : null
}

export function limitDownloadHistory(
  entries: DownloadHistoryEntry[],
  limit = HISTORY_LIMIT
): DownloadHistoryEntry[] {
  return [...entries]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, limit)
}

export function parseDownloadHistoryJson(value: string | null): DownloadHistoryEntry[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return limitDownloadHistory(
      parsed
        .map(parseDownloadHistoryEntry)
        .filter((entry): entry is DownloadHistoryEntry => entry !== null)
    )
  } catch {
    return []
  }
}

const historyRequest = (id: string) =>
  new Request(`${HISTORY_REQUEST_PREFIX}${encodeURIComponent(id)}`)

const readFallbackHistory = (): DownloadHistoryEntry[] =>
  parseDownloadHistoryJson(localStorage.getItem(HISTORY_FALLBACK_KEY))

const writeFallbackHistory = (entries: DownloadHistoryEntry[]) => {
  localStorage.setItem(HISTORY_FALLBACK_KEY, JSON.stringify(limitDownloadHistory(entries)))
}

export async function saveDownloadHistory(entry: DownloadHistoryEntry): Promise<void> {
  try {
    const cache = await caches.open(HISTORY_CACHE_NAME)
    await cache.put(
      historyRequest(entry.id),
      new Response(JSON.stringify(entry), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    )
    writeFallbackHistory(readFallbackHistory().filter((item) => item.id !== entry.id))
    const requests = await cache.keys()
    const cached = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request)
        if (!response) return { request, entry: null }
        try {
          return { request, entry: parseDownloadHistoryEntry(await response.json()) }
        } catch {
          return { request, entry: null }
        }
      })
    )
    cached.sort(
      (left, right) =>
        Date.parse(right.entry?.createdAt ?? '') - Date.parse(left.entry?.createdAt ?? '')
    )
    await Promise.all(
      cached
        .filter((item, index) => !item.entry || index >= HISTORY_LIMIT)
        .map((item) => cache.delete(item.request))
    )
  } catch {
    const entries = readFallbackHistory().filter((item) => item.id !== entry.id)
    writeFallbackHistory([entry, ...entries])
  }
}

export async function listDownloadHistory(): Promise<DownloadHistoryEntry[]> {
  const entries: DownloadHistoryEntry[] = readFallbackHistory()
  try {
    const cache = await caches.open(HISTORY_CACHE_NAME)
    const requests = await cache.keys()
    const cachedEntries = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request)
        if (!response) return null
        try {
          return parseDownloadHistoryEntry(await response.json())
        } catch {
          return null
        }
      })
    )
    entries.push(...cachedEntries.filter((entry): entry is DownloadHistoryEntry => entry !== null))
  } catch (error) {
    console.warn('[history] Cache Storage indisponível:', error)
  }

  return limitDownloadHistory([...new Map(entries.map((entry) => [entry.id, entry])).values()])
}

export async function deleteDownloadHistoryEntry(id: string): Promise<void> {
  try {
    const cache = await caches.open(HISTORY_CACHE_NAME)
    await cache.delete(historyRequest(id))
  } catch (error) {
    console.warn('[history] Não foi possível remover entrada do cache:', error)
  }
  writeFallbackHistory(readFallbackHistory().filter((entry) => entry.id !== id))
}

export async function clearDownloadHistory(): Promise<void> {
  try {
    await caches.delete(HISTORY_CACHE_NAME)
  } catch (error) {
    console.warn('[history] Não foi possível limpar o cache:', error)
  }
  localStorage.removeItem(HISTORY_FALLBACK_KEY)
}
