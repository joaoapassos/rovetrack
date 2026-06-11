import { readdir } from 'node:fs/promises'

/**
 * Vasculha um diretório à procura do primeiro ficheiro que corresponda a um prefixo e sufixo específicos.
 * Extremamente útil para encontrar artefatos temporários cujo nome do meio (ID) é dinâmico ou desconhecido.
 * * @param dir O diretório a ser analisado.
 * @param prefix O texto que o ficheiro deve conter no início (ex: "rovetrack_temp_").
 * @param suffix O texto que o ficheiro deve conter no final (ex: ".info.json").
 * @returns O nome do ficheiro encontrado, ou undefined se nenhum corresponder à regra.
 */
export async function findFileByPrefixAndSuffix(
  dir: string,
  prefix: string,
  suffix: string
): Promise<string | undefined> {
  const files = await readdir(dir)
  return files.find(f => f.startsWith(prefix) && f.endsWith(suffix))
}