import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * Retorna o caminho absoluto do workspace temporário do RoveTrack.
 */
export function getWorkspacePath(): string {
  // app.getPath('temp') descobre automaticamente a pasta Temp do Windows/Mac/Linux
  return join(app.getPath('temp'), '.rovetrack_workspace')
}

/**
 * Cria a pasta de workspace antes de iniciar uma nova expedição.
 * Se a pasta já existir com lixo de uma expedição anterior que falhou, limpa-a primeiro.
 */
export async function prepareWorkspace(): Promise<string> {
  const workspaceDir = getWorkspacePath()
  
  try {
    // Tenta forçar a eliminação de qualquer lixo antigo
    await rm(workspaceDir, { recursive: true, force: true })
  } catch (error) {
        if(error instanceof Error) console.log(`[prepareWorkspace] Error: ${error.message}`);
  }
  
  // Cria uma nova pasta limpa
  await mkdir(workspaceDir, { recursive: true })
  return workspaceDir
}

/**
 * Apaga o workspace por completo (desmobiliza o acampamento) após o sucesso da expedição.
 */
export async function cleanWorkspace(): Promise<void> {
  const workspaceDir = getWorkspacePath()
  try {
    // Utilizamos o mesmo sistema de "retry" para evitar o erro EBUSY do Windows
    await rm(workspaceDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  } catch (error) {
    console.warn('[Workspace] Aviso: Não foi possível desmobilizar o acampamento:', error)
  }
}