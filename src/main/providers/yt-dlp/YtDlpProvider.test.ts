import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunController } from '../../control/RunController'
import { YtDlpProvider } from './YtDlpProvider'

const temporaryDirectories: string[] = []
const request: MediaDownloadRequest = {
  sourceUrl: 'https://www.youtube.com/watch?v=abc123',
  destinationDirectory: 'C:\\output',
  mediaType: 'audio',
  outputFormat: 'mp3'
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  )
})

describe('YtDlpProvider', () => {
  it('suporta apenas hosts YouTube e áudio MP3', () => {
    const provider = new YtDlpProvider(vi.fn())
    expect(provider.supports(request)).toBe(true)
    expect(provider.supports({ ...request, sourceUrl: 'https://example.com/video' })).toBe(false)
    expect(provider.supports({ ...request, mediaType: 'video', outputFormat: 'mp4' })).toBe(false)
  })

  it('normaliza artefatos produzidos sem acessar a internet', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'rovetrack-provider-'))
    temporaryDirectories.push(workspace)
    await writeFile(join(workspace, 'rovetrack_temp_abc123.mp3'), 'audio')
    await writeFile(join(workspace, 'rovetrack_temp_abc123.webp'), 'image')
    await writeFile(
      join(workspace, 'rovetrack_temp_abc123.info.json'),
      JSON.stringify({
        id: 'abc123',
        webpage_url: request.sourceUrl,
        title: 'Song',
        uploader: 'Artist',
        playlist_title: 'Album'
      })
    )
    const provider = new YtDlpProvider(vi.fn().mockResolvedValue({ total: 1, errors: [] }))
    const result = await provider.download(request, {
      workspaceDirectory: workspace,
      updateTelemetry: vi.fn(),
      control: new RunController()
    })

    expect(result.assets[0]).toMatchObject({
      sourceId: 'abc123',
      title: 'Song',
      creator: 'Artist',
      collection: 'Album',
      mediaType: 'audio',
      outputFormat: 'mp3'
    })
  })

  it('isola metadados inválidos sem descartar os demais itens da playlist', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'rovetrack-provider-'))
    temporaryDirectories.push(workspace)
    await Promise.all([
      writeFile(join(workspace, 'rovetrack_temp_ok.mp3'), 'audio'),
      writeFile(
        join(workspace, 'rovetrack_temp_ok.info.json'),
        JSON.stringify({ id: 'ok', title: 'Faixa válida' })
      ),
      writeFile(join(workspace, 'rovetrack_temp_broken.mp3'), 'audio'),
      writeFile(join(workspace, 'rovetrack_temp_broken.info.json'), '{invalid')
    ])
    const provider = new YtDlpProvider(vi.fn().mockResolvedValue({ total: 2, errors: [] }))

    const result = await provider.download(request, {
      workspaceDirectory: workspace,
      updateTelemetry: vi.fn(),
      control: new RunController()
    })

    expect(result.assets).toHaveLength(1)
    expect(result.assets[0].sourceId).toBe('ok')
    expect(result.errors).toMatchObject([
      { trackId: 'broken', category: 'postprocessing', retryable: false }
    ])
  })

  it('propaga encerramento inesperado reportado pelo runner', async () => {
    const provider = new YtDlpProvider(vi.fn().mockRejectedValue(new Error('exit code 2')))
    await expect(
      provider.download(request, {
        workspaceDirectory: 'unused',
        updateTelemetry: vi.fn(),
        control: new RunController()
      })
    ).rejects.toThrow('exit code 2')
  })
})
