import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { readJsonFile } from '@main/utils/readFile'
import type { MediaDownloadRequest } from '@shared/contracts/media'
import { AUDIO_OUTPUT_FORMATS, VIDEO_OUTPUT_FORMATS } from '@shared/contracts/media'
import type { PipelineReportError } from '@shared/contracts/pipeline'
import type {
  DownloadContext,
  DownloadedAsset,
  DownloadProvider,
  DownloadResult
} from '../contracts'
import type { YtDlpRunner } from './process'

interface YtInfoJson {
  id?: string
  webpage_url?: string
  title?: string
  uploader?: string
  playlist_title?: string
}

const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
const outputExtensions: Record<MediaDownloadRequest['outputFormat'], string> = {
  mp3: '.mp3',
  m4a: '.m4a',
  opus: '.opus',
  flac: '.flac',
  wav: '.wav',
  aac: '.m4a',
  vorbis: '.ogg',
  alac: '.m4a',
  mp4: '.mp4',
  webm: '.webm',
  mkv: '.mkv',
  mov: '.mov',
  avi: '.avi'
}

export class YtDlpProvider implements DownloadProvider {
  readonly id = 'yt-dlp'
  readonly capabilities = {
    mediaTypes: ['audio', 'video'],
    outputFormats: [...AUDIO_OUTPUT_FORMATS, ...VIDEO_OUTPUT_FORMATS]
  } as const

  constructor(private readonly runner: YtDlpRunner) {}

  supports(request: MediaDownloadRequest): boolean {
    const formats = request.mediaType === 'audio' ? AUDIO_OUTPUT_FORMATS : VIDEO_OUTPUT_FORMATS
    return formats.includes(request.outputFormat as never)
  }

  async download(request: MediaDownloadRequest, context: DownloadContext): Promise<DownloadResult> {
    const runResult = await this.runner(request, context)
    const files = await readdir(context.workspaceDirectory)
    const extension = outputExtensions[request.outputFormat]
    const jsonFiles = files.filter((file) => {
      if (!file.startsWith('rovetrack_temp_') || !file.endsWith('.info.json')) return false
      return files.includes(`${file.replace('.info.json', '')}${extension}`)
    })
    const assets: DownloadedAsset[] = []
    const normalizationErrors: PipelineReportError[] = []

    for (const jsonFile of jsonFiles) {
      const baseName = jsonFile.replace('.info.json', '')
      try {
        const info = await readJsonFile<YtInfoJson>(join(context.workspaceDirectory, jsonFile))
        const sourceId = info.id ?? baseName.replace(/^rovetrack_temp_/, '')
        const thumbnail = files.find(
          (file) =>
            file.startsWith(baseName) &&
            imageExtensions.some((extension) => file.toLowerCase().endsWith(extension)) &&
            !file.endsWith('_cover.jpg')
        )

        assets.push({
          sourceId,
          sourceUrl: info.webpage_url ?? request.sourceUrl,
          title: typeof info.title === 'string' && info.title ? info.title : 'Título Desconhecido',
          creator: typeof info.uploader === 'string' ? info.uploader : undefined,
          collection: typeof info.playlist_title === 'string' ? info.playlist_title : undefined,
          mediaType: request.mediaType,
          outputFormat: request.outputFormat,
          filePath: join(context.workspaceDirectory, `${baseName}${extension}`),
          thumbnailPath: thumbnail ? join(context.workspaceDirectory, thumbnail) : undefined
        })
      } catch (error) {
        normalizationErrors.push({
          trackId: baseName.replace(/^rovetrack_temp_/, ''),
          reason: 'Não foi possível interpretar os metadados desta mídia.',
          category: 'postprocessing',
          technicalDetails: error instanceof Error ? error.message : String(error),
          retryable: false
        })
      }
    }

    const errors = [...runResult.errors, ...normalizationErrors]
    if (assets.length === 0 && errors.length === 0) {
      throw new Error('O provider terminou sem produzir mídia processável.')
    }

    return {
      total: Math.max(runResult.total, assets.length + errors.length),
      assets,
      errors
    }
  }
}
