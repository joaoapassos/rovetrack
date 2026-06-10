import { rm } from "node:fs/promises"

/**
 * Apaga ficheiros temporários com mecanismo de insistência (retry) para evitar o erro EBUSY no Windows.
 */
export async function cleanUpTempFiles(paths: string[]): Promise<void> {
  const cleanOptions = { force: true, maxRetries: 5, retryDelay: 200 }
  
  for (const path of paths) {
    if (path) {
      try {
        await rm(path, cleanOptions)
      } catch (error : unknown) {
        if(error instanceof Error) console.warn(`[cleanUpTempFiles] Aviso: Não foi possível limpar o ficheiro temporário: ${path}\nDetalhes do erro`, error.message)
        else console.warn(`[cleanUpTempFiles] Aviso: Não foi possível limpar o ficheiro temporário: ${path}`)
      }
    }
  }
}