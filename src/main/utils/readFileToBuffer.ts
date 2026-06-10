import { readFile } from "node:fs/promises"

/**
 * Lê um ficheiro para a memória (Buffer) para ser usado pelo Sharp.
 */
export async function readFileToBuffer(filePath: string): Promise<Buffer> {
  return readFile(filePath)
}