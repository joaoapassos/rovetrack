import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

export async function prepareWorkspace(
  runId: string,
  tempRoot = app.getPath('temp')
): Promise<string> {
  const workspaceRoot = join(tempRoot, 'rovetrack')
  await mkdir(workspaceRoot, { recursive: true })
  return mkdtemp(join(workspaceRoot, `${runId}-`))
}

export async function cleanWorkspace(workspaceDirectory: string): Promise<void> {
  await rm(workspaceDirectory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200
  })
}
