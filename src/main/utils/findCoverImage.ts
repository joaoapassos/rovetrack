import { readdir } from 'node:fs/promises'

/**
 * Procura a imagem de capa (ex: .jpg, .webp) baseada no nome principal.
 */
export async function findCoverImage(dir: string, baseName: string, ignoreJson: string): Promise<string | undefined> {
  const files = await readdir(dir)
  return files.find(f => f.startsWith(baseName) && f !== ignoreJson && !f.endsWith('.mp3'))
}