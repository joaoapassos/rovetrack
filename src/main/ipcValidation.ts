import { stat } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { mediaDownloadRequestSchema, processMediaPayloadSchema } from '@shared/contracts/media'
import { z } from 'zod'

export { mediaDownloadRequestSchema, processMediaPayloadSchema }

export const directoryPathSchema = z.string().trim().min(1)
export const notificationsEnabledSchema = z.boolean()

export async function validateDirectoryPath(input: unknown): Promise<string> {
  const directory = directoryPathSchema.parse(input)
  if (!isAbsolute(directory)) throw new Error('O diretório precisa possuir um caminho absoluto.')
  const normalized = resolve(directory)
  const details = await stat(normalized)
  if (!details.isDirectory()) throw new Error('O caminho informado não é um diretório.')
  return normalized
}
