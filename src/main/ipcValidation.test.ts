import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  directoryExists,
  mediaDownloadRequestSchema,
  processMediaPayloadSchema,
  runControlPayloadSchema,
  validateDirectoryPath
} from './ipcValidation'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

const validRequest = {
  sourceUrl: 'https://www.youtube.com/watch?v=abc123',
  destinationDirectory: 'C:\\output',
  mediaType: 'audio',
  outputFormat: 'mp3'
}

describe('schemas IPC', () => {
  it('aceita payload válido', () => {
    expect(
      processMediaPayloadSchema.safeParse({ runId: crypto.randomUUID(), request: validRequest })
        .success
    ).toBe(true)
  })

  it.each([
    [{ ...validRequest, sourceUrl: 'not-a-url' }],
    [{ ...validRequest, sourceUrl: 'file:///tmp/file' }],
    [{ ...validRequest, mediaType: 'document' }],
    [{ ...validRequest, outputFormat: 123 }]
  ])('rejeita entrada inválida %#', (input) => {
    expect(mediaDownloadRequestSchema.safeParse(input).success).toBe(false)
  })

  it('aceita tipo conhecido globalmente mesmo que o provider atual não o suporte', () => {
    expect(
      mediaDownloadRequestSchema.safeParse({
        ...validRequest,
        mediaType: 'video',
        outputFormat: 'mp4'
      }).success
    ).toBe(true)
  })

  it('valida diretório existente e rejeita arquivo/relativo', async () => {
    const root = join(tmpdir(), `rovetrack-ipc-${crypto.randomUUID()}`)
    roots.push(root)
    await mkdir(root)
    const file = join(root, 'file.txt')
    const applicationBundle = join(root, 'malicious.app')
    await writeFile(file, 'content')
    await mkdir(applicationBundle)
    await expect(validateDirectoryPath(root)).resolves.toBe(root)
    await expect(validateDirectoryPath(file)).rejects.toThrow('não é um diretório')
    await expect(validateDirectoryPath('relative/path')).rejects.toThrow('absoluto')
    await expect(directoryExists(root)).resolves.toBe(true)
    await expect(directoryExists(file)).resolves.toBe(false)
    await expect(directoryExists('file:///tmp/malicious.exe')).resolves.toBe(false)
    await expect(directoryExists(applicationBundle)).resolves.toBe(false)
  })

  it('valida comandos de controle por runId', () => {
    expect(runControlPayloadSchema.safeParse({ runId: crypto.randomUUID() }).success).toBe(true)
    expect(runControlPayloadSchema.safeParse({ runId: 'invalid' }).success).toBe(false)
    expect(
      runControlPayloadSchema.safeParse({ runId: crypto.randomUUID(), command: 'exec' }).success
    ).toBe(false)
  })
})
