import { describe, expect, it } from 'vitest'
import {
  type DownloadHistoryEntry,
  HISTORY_LIMIT,
  HISTORY_SCHEMA_VERSION,
  limitDownloadHistory,
  parseDownloadHistoryEntry,
  parseDownloadHistoryJson
} from './downloadHistory'

function entry(id = 'entry', createdAt = '2026-01-01T00:00:00.000Z'): DownloadHistoryEntry {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    id,
    createdAt,
    url: 'https://www.youtube.com/watch?v=abc123',
    outputDir: 'C:\\output',
    status: 'success',
    name: 'Song',
    kind: 'track',
    tracks: [{ trackId: 'abc123', title: 'Song', status: 'success' }],
    report: {
      runId: id,
      total: 1,
      succeeded: 1,
      failed: 0,
      errors: [],
      tracks: [{ trackId: 'abc123', title: 'Song', status: 'success' }]
    }
  }
}

describe('histórico', () => {
  it('aceita entrada da versão atual', () => {
    expect(parseDownloadHistoryEntry(entry())).toEqual(entry())
  })

  it('migra entrada antiga sem schemaVersion', () => {
    const legacy = entry()
    const { schemaVersion: _schemaVersion, ...withoutVersion } = legacy
    expect(parseDownloadHistoryEntry(withoutVersion)?.schemaVersion).toBe(HISTORY_SCHEMA_VERSION)
  })

  it('descarta somente entrada individual inválida', () => {
    expect(parseDownloadHistoryEntry({ id: 'broken' })).toBeNull()
    expect(parseDownloadHistoryJson(JSON.stringify([entry(), { id: 'broken' }]))).toHaveLength(1)
  })

  it('tolera JSON corrompido e formato não-array', () => {
    expect(parseDownloadHistoryJson('{broken')).toEqual([])
    expect(parseDownloadHistoryJson('{}')).toEqual([])
  })

  it('limita e ordena as entradas mais recentes', () => {
    const entries = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) =>
      entry(String(index), new Date(2026, 0, index + 1).toISOString())
    )
    const limited = limitDownloadHistory(entries)
    expect(limited).toHaveLength(HISTORY_LIMIT)
    expect(limited[0].createdAt >= (limited.at(-1)?.createdAt ?? '')).toBe(true)
  })
})
