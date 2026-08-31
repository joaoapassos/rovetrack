import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveOutputPath, safeFilename } from './filename'

const temporaryDirectories: string[] = []
afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  )
})

describe('política de filename', () => {
  it.each([
    ['AC/DC', 'AC DC'],
    ['A:B', 'A B'],
    ['hello?', 'hello'],
    ['CON', '_CON'],
    ['NUL', '_NUL'],
    ['nome.', 'nome'],
    ['nome com espaço final ', 'nome com espaço final'],
    ['', 'untitled']
  ])('normaliza %j', (input, expected) => {
    expect(safeFilename(input)).toBe(expected)
  })

  it('limita títulos muito longos', () => {
    expect(safeFilename('a'.repeat(300))).toHaveLength(120)
  })

  it('preserva extensão e numera colisões sem sobrescrever', async () => {
    const directory = join(tmpdir(), `rovetrack-filename-${crypto.randomUUID()}`)
    temporaryDirectories.push(directory)
    await mkdir(directory)
    await writeFile(join(directory, 'Song.mp3'), 'existing')
    expect(await resolveOutputPath(directory, 'Song', '.mp3')).toBe(join(directory, 'Song (2).mp3'))
  })
})
