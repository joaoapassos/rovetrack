import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanWorkspace, prepareWorkspace } from './workspace'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('workspace por execução', () => {
  it('cria diretórios isolados e permite cleanup', async () => {
    const root = join(tmpdir(), `rovetrack-workspace-${crypto.randomUUID()}`)
    roots.push(root)
    const first = await prepareWorkspace('run-a', root)
    const second = await prepareWorkspace('run-b', root)
    expect(first).not.toBe(second)
    expect((await stat(first)).isDirectory()).toBe(true)
    await cleanWorkspace(first)
    await expect(stat(first)).rejects.toThrow()
  })

  it('falha quando não consegue preparar uma raiz válida', async () => {
    const root = join(tmpdir(), `rovetrack-workspace-file-${crypto.randomUUID()}`)
    roots.push(root)
    await mkdir(root, { recursive: true })
    const fileAsRoot = join(root, 'not-a-directory')
    await writeFile(fileAsRoot, 'content')
    await expect(prepareWorkspace('run', fileAsRoot)).rejects.toThrow()
  })
})
