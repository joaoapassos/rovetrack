import type { MediaDownloadRequest } from '@shared/contracts/media'
import type { PipelineState } from '@shared/contracts/pipeline'
import { describe, expect, it, vi } from 'vitest'
import { RunController, RunInterruptedError } from './control/RunController'
import { createMediaPipeline } from './pipeline'
import type { MediaProcessor } from './processors/contracts'
import { ProcessorResolver } from './processors/ProcessorResolver'
import type { DownloadProvider } from './providers/contracts'
import { ProviderResolver } from './providers/ProviderResolver'
import type { OutputStorage } from './services/storage/OutputStorage'

const request: MediaDownloadRequest = {
  sourceUrl: 'https://www.youtube.com/watch?v=abc123',
  destinationDirectory: 'C:\\output',
  mediaType: 'audio',
  outputFormat: 'mp3',
  quality: 'best',
  thumbnail: { enabled: true, aspectRatio: '1:1', quality: 'best', outputFormat: 'jpg' }
}

function provider(download: DownloadProvider['download']): DownloadProvider {
  return {
    id: 'fake',
    capabilities: { mediaTypes: ['audio'], outputFormats: ['mp3'] },
    supports: () => true,
    download
  }
}

describe('pipeline', () => {
  it('sempre limpa o workspace após falha global', async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined)
    const pipeline = createMediaPipeline({
      providerResolver: new ProviderResolver([
        provider(vi.fn().mockRejectedValue(new Error('provider failed')))
      ]),
      processorResolver: new ProcessorResolver([{} as MediaProcessor]),
      outputStorage: {} as OutputStorage,
      prepareWorkspace: vi.fn().mockResolvedValue('workspace'),
      cleanWorkspace: cleanup
    })
    const telemetry: PipelineState[] = []
    await expect(
      pipeline(request, 'run-id', new RunController(), (state) => telemetry.push(state))
    ).rejects.toThrow('provider failed')
    expect(cleanup).toHaveBeenCalledWith('workspace')
    expect(telemetry.at(-1)?.status).toBe('error')
  })

  it('representa sucesso parcial de forma explícita', async () => {
    const mediaProcessor: MediaProcessor = {
      supports: () => true,
      process: vi.fn().mockResolvedValue({
        sourceId: 'ok',
        title: 'Song',
        filePath: 'song.mp3',
        extension: '.mp3'
      })
    }
    const outputStorage = {
      store: vi.fn().mockResolvedValue('output.mp3')
    } as unknown as OutputStorage
    const pipeline = createMediaPipeline({
      providerResolver: new ProviderResolver([
        provider(
          vi.fn().mockResolvedValue({
            total: 2,
            assets: [
              {
                sourceId: 'ok',
                sourceUrl: request.sourceUrl,
                title: 'Song',
                mediaType: 'audio',
                outputFormat: 'mp3',
                filePath: 'song.mp3'
              }
            ],
            errors: [{ trackId: 'failed', reason: 'Unavailable' }]
          })
        )
      ]),
      processorResolver: new ProcessorResolver([mediaProcessor]),
      outputStorage,
      prepareWorkspace: vi.fn().mockResolvedValue('workspace'),
      cleanWorkspace: vi.fn().mockResolvedValue(undefined)
    })
    const telemetry: PipelineState[] = []
    const report = await pipeline(request, 'run-id', new RunController(), (state) =>
      telemetry.push(state)
    )
    expect(report).toMatchObject({ succeeded: 1, failed: 1 })
    expect(telemetry.at(-1)?.status).toBe('partial')
  })

  it('registra interrupção somente depois de limpar o workspace', async () => {
    const events: string[] = []
    let started: (() => void) | undefined
    const providerStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    const cleanup = vi.fn().mockImplementation(async () => {
      events.push('cleanup')
    })
    const controller = new RunController()
    const pipeline = createMediaPipeline({
      providerResolver: new ProviderResolver([
        provider(
          vi.fn().mockImplementation(async (_request, context) => {
            started?.()
            await new Promise<void>((_resolve, reject) => {
              const unsubscribe = context.control.onStateChange((state) => {
                if (state === 'interrupted') {
                  unsubscribe()
                  reject(new RunInterruptedError())
                }
              })
            })
          })
        )
      ]),
      processorResolver: new ProcessorResolver([{} as MediaProcessor]),
      outputStorage: {} as OutputStorage,
      prepareWorkspace: vi.fn().mockResolvedValue('workspace'),
      cleanWorkspace: cleanup
    })
    const telemetry: PipelineState[] = []
    const task = pipeline(request, 'run-id', controller, (state) => {
      telemetry.push(state)
      if (state.status === 'interrupted') events.push('interrupted')
    })
    await providerStarted
    controller.interrupt()
    await expect(task).resolves.toMatchObject({ succeeded: 0, failed: 0 })
    expect(cleanup).toHaveBeenCalledWith('workspace')
    expect(telemetry.at(-1)?.status).toBe('interrupted')
    expect(events).toEqual(['cleanup', 'interrupted'])
  })
})
