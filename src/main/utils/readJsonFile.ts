import { readFile } from "node:fs/promises"

/**
 * Lê e faz o parse de um ficheiro JSON de forma assíncrona.
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}