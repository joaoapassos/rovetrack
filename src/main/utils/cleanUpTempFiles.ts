import { rm } from "node:fs/promises"

/**
 * Remove com segurança uma lista de ficheiros do disco rígido.
 * Implementa um mecanismo de insistência (retry) nativo do Node.js para contornar
 * bloqueios temporários de ficheiros causados pelo Sistema Operativo ou Antivírus
 * (erro comum EBUSY no Windows).
 * * @param paths Array com os caminhos absolutos dos ficheiros a serem apagados.
 * @returns Uma Promise que é resolvida quando a limpeza terminar. Falhas isoladas disparam apenas um aviso no console.
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