import { readFile } from "node:fs/promises"

/**
 * Lê fisicamente um ficheiro .json do disco rígido e converte-o de volta num Objeto JavaScript.
 * Utiliza Generics (<T>) para tipar automaticamente o retorno com base na interface fornecida.
 * * @template T A interface TypeScript que descreve o formato esperado do JSON.
 * @param filePath O caminho absoluto do ficheiro JSON.
 * @returns Uma Promise com o objeto parseado já devidamente tipado.
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}