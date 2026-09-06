import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import type { YtDlpChannel } from '@shared/contracts/updates'

const CHANNEL_REPOSITORIES: Record<YtDlpChannel, string> = {
  stable: 'yt-dlp/yt-dlp',
  nightly: 'yt-dlp/yt-dlp-nightly-builds',
  master: 'yt-dlp/yt-dlp-master-builds'
}

const MAX_COMPONENT_BYTES = 80 * 1024 * 1024
const MAX_METADATA_BYTES = 256 * 1024
const REQUEST_TIMEOUT_MS = 30_000
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com'
])

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GitHubRelease {
  tag_name: string
  assets: GitHubAsset[]
}

export interface YtDlpRelease {
  version: string
  channel: YtDlpChannel
  assetName: string
  assetUrl: string
  assetSize: number
  checksumUrl: string
}

function assetNameFor(platform: NodeJS.Platform, arch: string): string | null {
  if (platform === 'win32' && arch === 'x64') return 'yt-dlp.exe'
  if (platform === 'win32' && arch === 'arm64') return 'yt-dlp_arm64.exe'
  if (platform === 'linux' && arch === 'x64') return 'yt-dlp_linux'
  if (platform === 'linux' && arch === 'arm64') return 'yt-dlp_linux_aarch64'
  if (platform === 'darwin' && (arch === 'x64' || arch === 'arm64')) return 'yt-dlp_macos'
  return null
}

async function fetchWithLimit(url: string, maximumBytes: number): Promise<Buffer> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') throw new Error('A origem da atualização precisa usar HTTPS.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RoveTrack-Updater' }
    })
    if (!response.ok) throw new Error(`A fonte oficial respondeu com HTTP ${response.status}.`)
    const finalUrl = new URL(response.url)
    if (finalUrl.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.has(finalUrl.hostname)) {
      throw new Error('Redirecionamento inseguro bloqueado.')
    }
    const declaredSize = Number(response.headers.get('content-length') ?? 0)
    if (declaredSize > maximumBytes) throw new Error('O arquivo excede o limite de segurança.')
    if (!response.body) throw new Error('A fonte oficial retornou uma resposta vazia.')
    const reader = response.body.getReader()
    const chunks: Buffer[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maximumBytes) {
        await reader.cancel()
        throw new Error('O arquivo excede o limite de segurança.')
      }
      chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks, received)
  } finally {
    clearTimeout(timeout)
  }
}

export class YtDlpReleaseSource {
  async getLatest(channel: YtDlpChannel): Promise<YtDlpRelease> {
    const repository = CHANNEL_REPOSITORIES[channel]
    const response = await fetchWithLimit(
      `https://api.github.com/repos/${repository}/releases/latest`,
      MAX_METADATA_BYTES
    )
    const release = JSON.parse(response.toString('utf8')) as GitHubRelease
    if (!/^[0-9A-Za-z._-]{1,80}$/.test(release.tag_name)) {
      throw new Error('A fonte oficial retornou uma versão inválida.')
    }
    const assetName = assetNameFor(process.platform, process.arch)
    if (!assetName) {
      throw new Error(
        'Atualização independente do yt-dlp ainda não está disponível para esta plataforma/arquitetura.'
      )
    }
    const asset = release.assets.find((item) => item.name === assetName)
    const checksum = release.assets.find((item) => item.name === 'SHA2-256SUMS')
    if (!asset || !checksum) throw new Error('A release oficial não contém os artefatos esperados.')
    for (const url of [asset.browser_download_url, checksum.browser_download_url]) {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || !ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
        throw new Error('A release oficial retornou uma URL não permitida.')
      }
    }
    if (asset.size <= 0 || asset.size > MAX_COMPONENT_BYTES) {
      throw new Error('O artefato possui tamanho inválido.')
    }
    return {
      version: release.tag_name,
      channel,
      assetName,
      assetUrl: asset.browser_download_url,
      assetSize: asset.size,
      checksumUrl: checksum.browser_download_url
    }
  }

  async downloadVerified(release: YtDlpRelease, destination: string): Promise<void> {
    const [binary, sums] = await Promise.all([
      fetchWithLimit(release.assetUrl, MAX_COMPONENT_BYTES),
      fetchWithLimit(release.checksumUrl, MAX_METADATA_BYTES)
    ])
    if (binary.length !== release.assetSize)
      throw new Error('O download do yt-dlp ficou incompleto.')
    const expected = sums
      .toString('utf8')
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/))
      .find(([, name]) => name?.replace(/^\*/, '') === release.assetName)?.[0]
    if (!expected || !/^[a-f0-9]{64}$/i.test(expected)) {
      throw new Error('O checksum oficial do artefato não foi encontrado.')
    }
    const actual = createHash('sha256').update(binary).digest('hex')
    if (actual.toLowerCase() !== expected.toLowerCase()) {
      throw new Error('A verificação SHA-256 do yt-dlp falhou.')
    }
    await writeFile(destination, binary, { mode: 0o755, flag: 'wx' })
  }
}

export { assetNameFor, MAX_COMPONENT_BYTES }
