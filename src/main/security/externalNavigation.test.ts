import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from './externalNavigation'

describe('URLs externas', () => {
  it('aceita somente HTTPS', () => {
    expect(isAllowedExternalUrl('https://github.com/joaoapassos/rovetrack')).toBe(true)
    expect(isAllowedExternalUrl('http://example.com')).toBe(false)
    expect(isAllowedExternalUrl('file:///tmp/file')).toBe(false)
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedExternalUrl('invalid')).toBe(false)
  })
})
