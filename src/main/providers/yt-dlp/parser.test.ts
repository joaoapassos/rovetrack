import { describe, expect, it } from 'vitest'
import {
  classifyYtDlpError,
  LineBuffer,
  parsePlaylistPosition,
  parseProgress,
  parseWarning
} from './parser'

describe('parser do yt-dlp', () => {
  it('interpreta progresso normal', () => {
    expect(parseProgress('[download]  45.5% of 10MiB')).toBe(45.5)
  })

  it('interpreta posição de playlist', () => {
    expect(parsePlaylistPosition('[download] Downloading item 2 of 7')).toEqual({
      current: 2,
      total: 7
    })
  })

  it('interpreta warning', () => {
    expect(parseWarning('WARNING: PO Token unavailable')).toBe('PO Token unavailable')
  })

  it.each([
    ['HTTP Error 403: Forbidden', 'access'],
    ['HTTP Error 429: Too Many Requests', 'network'],
    ['Private video is unavailable', 'availability'],
    ['Sign in to confirm your age; cookies required', 'authentication'],
    ['Connection timed out', 'network']
  ])('classifica %s', (message, category) => {
    expect(classifyYtDlpError(message).category).toBe(category)
  })

  it('preserva linha fragmentada entre chunks', () => {
    const buffer = new LineBuffer()
    expect(buffer.push('[download] 4')).toEqual([])
    expect(buffer.push('2.0%\n')).toEqual(['[download] 42.0%'])
  })

  it('processa múltiplas linhas no mesmo chunk', () => {
    const buffer = new LineBuffer()
    expect(buffer.push('line one\nline two\nrest')).toEqual(['line one', 'line two'])
    expect(buffer.flush()).toEqual(['rest'])
  })

  it('entrega a última linha mesmo sem newline', () => {
    const buffer = new LineBuffer()
    buffer.push('last line')
    expect(buffer.flush()).toEqual(['last line'])
    expect(buffer.flush()).toEqual([])
  })
})
