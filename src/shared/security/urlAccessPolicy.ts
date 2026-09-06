import type { AllowedSite } from '../contracts/settings'

const domainLabelPattern = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  )
}

function validatePublicHostname(hostname: string): string {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  if (
    !normalized ||
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized.includes(':') ||
    isPrivateIpv4(normalized) ||
    !normalized.includes('.') ||
    normalized.length > 253 ||
    normalized.split('.').some((label) => !domainLabelPattern.test(label))
  ) {
    throw new Error('Informe um domínio público válido.')
  }
  return normalized
}

export function normalizeDomainInput(input: string): string {
  const value = input.trim()
  if (!value) throw new Error('Informe um domínio.')
  let parsed: URL
  try {
    parsed = new URL(value.includes('://') ? value : `https://${value}`)
  } catch {
    throw new Error('Informe um domínio ou URL HTTPS válida.')
  }
  if (parsed.protocol !== 'https:') throw new Error('Somente URLs HTTPS são permitidas.')
  if (parsed.username || parsed.password || parsed.port) {
    throw new Error('Credenciais e portas não são permitidas no domínio.')
  }
  return validatePublicHostname(parsed.hostname)
}

export function hostnameMatchesDomain(hostname: string, domain: string): boolean {
  const normalizedHostname = validatePublicHostname(new URL(`https://${hostname}`).hostname)
  const normalizedDomain = normalizeDomainInput(domain)
  return (
    normalizedHostname === normalizedDomain || normalizedHostname.endsWith(`.${normalizedDomain}`)
  )
}

export function isSafePublicHttpsUrl(sourceUrl: string): boolean {
  try {
    const parsed = new URL(sourceUrl)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
      return false
    }
    validatePublicHostname(parsed.hostname)
    return true
  } catch {
    return false
  }
}

export class UrlAccessPolicy {
  constructor(private readonly sites: readonly AllowedSite[]) {}

  allows(sourceUrl: string): boolean {
    if (!isSafePublicHttpsUrl(sourceUrl)) return false
    const parsed = new URL(sourceUrl)
    const enabledDomains = this.sites.filter((site) => site.enabled).flatMap((site) => site.domains)

    if (enabledDomains.length === 0) return true

    return enabledDomains.some((domain) => {
      try {
        return hostnameMatchesDomain(parsed.hostname, domain)
      } catch {
        return false
      }
    })
  }

  assertAllowed(sourceUrl: string): void {
    if (!this.allows(sourceUrl)) {
      throw new Error('Este site não está autorizado nas configurações do RoveTrack.')
    }
  }
}
