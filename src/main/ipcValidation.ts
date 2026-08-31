import { realpath, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, resolve } from 'node:path'
import { mediaDownloadRequestSchema, processMediaPayloadSchema } from '@shared/contracts/media'
import { z } from 'zod'

export { mediaDownloadRequestSchema, processMediaPayloadSchema }

export const directoryPathSchema = z.string().trim().min(1)
export const notificationsEnabledSchema = z.boolean()
export const runControlPayloadSchema = z.object({ runId: z.uuid() }).strict()
const executableDirectoryExtensions = new Set([
  '.app',
  '.appex',
  '.bundle',
  '.framework',
  '.plugin'
])
const windowsShellNamespaceSuffix =
  /\.\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i

export async function validateDirectoryPath(input: unknown): Promise<string> {
  const directory = directoryPathSchema.parse(input)
  if (!isAbsolute(directory)) throw new Error('O diretório precisa possuir um caminho absoluto.')
  const normalized = resolve(directory)
  const canonical = await realpath(normalized)
  const details = await stat(canonical)
  if (!details.isDirectory()) throw new Error('O caminho informado não é um diretório.')
  const directoryName = basename(canonical)
  if (
    executableDirectoryExtensions.has(extname(directoryName).toLowerCase()) ||
    windowsShellNamespaceSuffix.test(directoryName)
  ) {
    throw new Error('Diretórios que representam aplicações não podem ser abertos.')
  }
  return canonical
}

export async function directoryExists(input: unknown): Promise<boolean> {
  try {
    await validateDirectoryPath(input)
    return true
  } catch {
    return false
  }
}
