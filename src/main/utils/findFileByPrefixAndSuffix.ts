import { readdir } from 'node:fs/promises'


/**
 * Procura um ficheiro numa diretoria que corresponda a um prefixo e sufixo.
 */
export async function findFileByPrefixAndSuffix(
  dir: string,
  prefix: string,
  suffix: string
): Promise<string | undefined> {
  const files = await readdir(dir)
  return files.find(f => f.startsWith(prefix) && f.endsWith(suffix))
}