import {
  type PipelineReport,
  type PipelineReportTrack,
  pipelineReportSchema,
  pipelineStatusSchema
} from '@shared/contracts/pipeline'
import { z } from 'zod'

export const HISTORY_SCHEMA_VERSION = 1
export const HISTORY_LIMIT = 100
const HISTORY_CACHE_NAME = 'rovetrack-download-history-v1'
const HISTORY_REQUEST_PREFIX = 'https://rovetrack.local/history/'
const HISTORY_FALLBACK_KEY = 'rovetrack:download-history-fallback'

const historyStatusSchema = pipelineStatusSchema.extract(['success', 'partial', 'error'])
const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))
const trackSchema = z.object({
  trackId: z.string(),
  title: z.string().optional(),
  status: z.enum(['success', 'error'])
})
const baseEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: dateStringSchema,
  url: z.url(),
  outputDir: z.string().min(1),
  status: historyStatusSchema,
  name: z.string().min(1),
  kind: z.enum(['track', 'playlist']),
  tracks: z.array(trackSchema),
  report: pipelineReportSchema
})
const currentEntrySchema = baseEntrySchema.extend({
  schemaVersion: z.literal(HISTORY_SCHEMA_VERSION)
})
const legacyEntrySchema = baseEntrySchema
  .omit({ status: true })
  .extend({ status: z.enum(['success', 'error']), schemaVersion: z.undefined().optional() })

export interface DownloadHistoryEntry {
  schemaVersion: typeof HISTORY_SCHEMA_VERSION
  id: string
  createdAt: string
  url: string
  outputDir: string
  status: 'success' | 'partial' | 'error'
  name: string
  kind: 'track' | 'playlist'
  tracks: PipelineReportTrack[]
  report: PipelineReport
}

export function parseDownloadHistoryEntry(input: unknown): DownloadHistoryEntry | null {
  const current = currentEntrySchema.safeParse(input)
  if (current.success) return current.data
  const legacy = legacyEntrySchema.safeParse(input)
  if (!legacy.success) return null
  return { ...legacy.data, schemaVersion: HISTORY_SCHEMA_VERSION }
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
