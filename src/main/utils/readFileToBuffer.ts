import { readFile } from "node:fs/promises"

/**
 * Lê o conteúdo bruto de um ficheiro e carrega-o para a memória RAM (Buffer).
 * Essencial para processos de manipulação de imagem pesados, permitindo que a
 * biblioteca manipule os dados sem causar bloqueios (lock) no ficheiro físico.
 * * @param filePath O caminho absoluto do ficheiro a ser lido.
 * @returns Uma Promise contendo os dados brutos do ficheiro em formato Buffer.
 */
export async function readFileToBuffer(filePath: string): Promise<Buffer> {
  return readFile(filePath)
}