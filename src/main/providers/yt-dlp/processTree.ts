import { execFile } from 'node:child_process'

interface KillableProcess {
  pid?: number
  kill(signal?: NodeJS.Signals | number): unknown
}

export type TaskkillExecutor = (pid: number) => Promise<void>
export type ProcessGroupKiller = (pid: number, signal: NodeJS.Signals) => void

export const buildTaskkillArguments = (pid: number): string[] => ['/PID', String(pid), '/T', '/F']

const executeTaskkill: TaskkillExecutor = (pid) =>
  new Promise<void>((resolve, reject) => {
    execFile(
      'taskkill.exe',
      buildTaskkillArguments(pid),
      { windowsHide: true, timeout: 5_000 },
      (error) => (error ? reject(error) : resolve())
    )
  })

export async function terminateProcessTree(
  child: KillableProcess,
  platform = process.platform,
  taskkill: TaskkillExecutor = executeTaskkill,
  killGroup: ProcessGroupKiller = process.kill
): Promise<void> {
  const pid = child.pid
  if (!pid) {
    child.kill('SIGKILL')
    return
  }

  try {
    if (platform === 'win32') await taskkill(pid)
    else killGroup(-pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}
