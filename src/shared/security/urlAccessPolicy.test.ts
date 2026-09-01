import { describe, expect, it } from 'vitest'
import { hostnameMatchesDomain, normalizeDomainInput, UrlAccessPolicy } from './urlAccessPolicy'

const policy = new UrlAccessPolicy([
  {
    id: 'youtube',
    label: 'YouTube',
    domains: ['youtube.com', 'youtu.be'],
    enabled: true,
    builtin: true
  }
])

describe('UrlAccessPolicy', () => {
  it.each([
    'https://youtube.com/watch?v=1',
    'https://www.youtube.com/watch?v=1',
    'https://music.youtube.com/watch?v=1',
    'https://youtu.be/1'
  ])('aceita domínio e subdomínios permitidos: %s', (url) => {
    expect(policy.allows(url)).toBe(true)
  })

  it.each([
    'https://youtube.com.attacker.com/video',
    'https://attacker-youtube.com/video',
    'http://youtube.com/video',
    'https://localhost/video',
    'https://127.0.0.1/video'
  ])('rejeita origem insegura ou semelhante: %s', (url) => {
    expect(policy.allows(url)).toBe(false)
  })

  it('normaliza URL, Unicode e punycode para a mesma identidade', () => {
    const unicode = normalizeDomainInput('https://münich.example/video?id=1')
    const ascii = normalizeDomainInput('xn--mnich-kva.example')
    expect(unicode).toBe(ascii)
    expect(hostnameMatchesDomain(unicode, ascii)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'file:///tmp/a',
    'ftp://example.com',
    'localhost',
    '192.168.1.2'
  ])('rejeita domínio customizado inválido: %s', (input) =>
    expect(() => normalizeDomainInput(input)).toThrow())
})
