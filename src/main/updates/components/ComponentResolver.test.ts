import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getAppPath: () => 'C:\\RoveTrack\\app.asar', isPackaged: true }
}))

import { ComponentResolver, resolveBundledYtDlpPath } from './ComponentResolver'

describe('ComponentResolver', () => {
  let resolver: ComponentResolver

  beforeEach(() => {
    resolver = new ComponentResolver()
    resolver.activateManaged('C:\\profile\\components\\yt-dlp.exe')
  })

  it('sempre usa bundled no modo managed', () => {
    resolver.configure('managed')
    expect(resolver.resolveYtDlp()).toBe(resolveBundledYtDlpPath())
  })

  it.each(['stable', 'advanced'] as const)('usa managed em %s quando disponível', (mode) => {
    resolver.configure(mode)
    expect(resolver.resolveYtDlp()).toBe('C:\\profile\\components\\yt-dlp.exe')
  })

  it('volta ao bundled quando managed é desativado', () => {
    resolver.configure('advanced')
    resolver.activateManaged(null)
    expect(resolver.resolveYtDlp()).toBe(resolveBundledYtDlpPath())
  })
})
