import { describe, expect, it } from 'vitest'
import { assetNameFor, MAX_COMPONENT_BYTES } from './YtDlpReleaseSource'

describe('YtDlpReleaseSource', () => {
  it.each([
    ['win32', 'x64', 'yt-dlp.exe'],
    ['win32', 'arm64', 'yt-dlp_arm64.exe'],
    ['linux', 'x64', 'yt-dlp_linux'],
    ['linux', 'arm64', 'yt-dlp_linux_aarch64'],
    ['darwin', 'x64', 'yt-dlp_macos'],
    ['darwin', 'arm64', 'yt-dlp_macos']
  ] as const)('mapeia %s/%s para um asset oficial conhecido', (platform, arch, expected) => {
    expect(assetNameFor(platform, arch)).toBe(expected)
  })

  it('rejeita combinações não suportadas e limita o download', () => {
    expect(assetNameFor('freebsd', 'x64')).toBeNull()
    expect(assetNameFor('win32', 'ia32')).toBeNull()
    expect(MAX_COMPONENT_BYTES).toBe(80 * 1024 * 1024)
  })
})
