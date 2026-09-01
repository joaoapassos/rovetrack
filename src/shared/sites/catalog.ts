import type { AllowedSite } from '../contracts/settings'

export const BUILTIN_ALLOWED_SITES: readonly AllowedSite[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    domains: ['youtube.com', 'youtu.be'],
    enabled: true,
    builtin: true
  }
]
