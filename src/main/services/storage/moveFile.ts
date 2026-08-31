import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { copyFile, rename, rm, unlink } from 'node:fs/promises'

export interface MoveFileOperations {
  rename: typeof rename
  copyFile: typeof copyFile
  unlink: typeof unlink
  rm: typeof rm
  randomUUID: typeof randomUUID
}

const defaultOperations: MoveFileOperations = { rename, copyFile, unlink, rm, randomUUID }

function isExdev(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EXDEV'
}

export async function moveFileSafely(
  source: string,
  destination: string,
  operations: MoveFileOperations = defaultOperations
): Promise<void> {
  try {
    await operations.rename(source, destination)
    return
  } catch (error) {
    if (!isExdev(error)) throw error
  }

  const temporaryDestination = `${destination}.part-${operations.randomUUID()}`
  try {
    await operations.copyFile(source, temporaryDestination, constants.COPYFILE_EXCL)
    await operations.rename(temporaryDestination, destination)
    await operations.unlink(source)
  } catch (error) {
    await operations.rm(temporaryDestination, { force: true }).catch(() => undefined)
    throw error
  }
}
