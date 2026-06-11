import { rename } from "node:fs/promises"

/**
 * Altera o nome de um ficheiro no disco ou move-o de uma diretoria para outra.
 * É a operação final utilizada para transformar os ficheiros temporários em ficheiros de entrega.
 * * @param oldPath O caminho atual do ficheiro.
 * @param newPath O novo caminho (ou novo nome) desejado para o ficheiro.
 */
export async function moveOrRenameFile(oldPath: string, newPath: string): Promise<void> {
  await rename(oldPath, newPath)
}