import { rename } from "node:fs/promises"

/**
 * Renomeia um ficheiro.
 */
export async function moveOrRenameFile(oldPath: string, newPath: string): Promise<void> {
  await rename(oldPath, newPath)
}