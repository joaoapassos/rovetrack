import { access } from 'node:fs/promises'
import { join } from 'node:path'

const windowsReservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i
const invalidCharacters = /[<>:"/\\|?*]/g

function removeControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint > 31 && (codePoint < 127 || codePoint > 159)
    })
    .join('')
}

export function safeFilename(value: string, maxLength = 120): string {
  let name = removeControlCharacters(value)
    .normalize('NFC')
    .replace(invalidCharacters, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')

  if (!name) name = 'untitled'
  if (windowsReservedName.test(name)) name = `_${name}`
  name = name.slice(0, maxLength).replace(/[. ]+$/g, '')
  return name || 'untitled'
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function resolveOutputPath(
  directory: string,
  title: string,
  extension: string,
  exists: (filePath: string) => Promise<boolean> = pathExists
): Promise<string> {
  const safeExtension = extension.startsWith('.') ? extension : `.${extension}`
  if (!/^\.[a-z0-9]+$/i.test(safeExtension)) throw new Error('Extensão de saída inválida.')
  const baseName = safeFilename(title)

  for (let suffix = 1; suffix < 10_000; suffix += 1) {
    const candidateName = suffix === 1 ? baseName : `${baseName} (${suffix})`
    const candidate = join(directory, `${candidateName}${safeExtension}`)
    if (!(await exists(candidate))) return candidate
  }

  throw new Error('Não foi possível reservar um nome de arquivo disponível.')
}
