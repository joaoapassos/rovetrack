import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { buildTaskkillArguments, terminateProcessTree } from './processTree'

describe('terminateProcessTree', () => {
  it('solicita encerramento forçado de toda a árvore no Windows', () => {
    expect(buildTaskkillArguments(321)).toEqual(['/PID', '321', '/T', '/F'])
  })
  it('usa taskkill com o PID raiz no Windows', async () => {
    const taskkill = vi.fn().mockResolvedValue(undefined)
    const child = { pid: 321, kill: vi.fn() }
    await terminateProcessTree(child, 'win32', taskkill)
    expect(taskkill).toHaveBeenCalledWith(321)
    expect(child.kill).not.toHaveBeenCalled()
  })

  it('mata o grupo de processos em sistemas POSIX', async () => {
    const killGroup = vi.fn()
    const child = { pid: 654, kill: vi.fn() }
    await terminateProcessTree(child, 'linux', vi.fn(), killGroup)
    expect(killGroup).toHaveBeenCalledWith(-654, 'SIGKILL')
  })

  it('usa kill direto como fallback', async () => {
    const child = { pid: 987, kill: vi.fn() }
    await terminateProcessTree(child, 'win32', vi.fn().mockRejectedValue(new Error('failed')))
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
  })

  it('encerra uma árvore de processos real no Windows', async () => {
    if (process.platform !== 'win32') return
    const child = spawn(
      process.execPath,
      [
        '-e',
        "require('node:child_process').spawn('ping.exe',['127.0.0.1','-n','30'],{stdio:'ignore'});setInterval(()=>{},1000)"
      ],
      { windowsHide: true }
    )
    await once(child, 'spawn')

    try {
      const closed = once(child, 'close')
      await terminateProcessTree(child)
      let timeout: NodeJS.Timeout | undefined
      try {
        await Promise.race([
          closed,
          new Promise((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error('A árvore não encerrou em cinco segundos.')),
              5_000
            )
          })
        ])
      } finally {
        if (timeout) clearTimeout(timeout)
      }
      expect(child.exitCode ?? child.signalCode).not.toBeNull()
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    }
  })
})
