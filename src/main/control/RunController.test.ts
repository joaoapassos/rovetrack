import { describe, expect, it, vi } from 'vitest'
import { RunController, RunInterruptedError } from './RunController'

describe('RunController', () => {
  it('interrompe a execução imediatamente e não aceita repetição', async () => {
    const controller = new RunController()
    const listener = vi.fn()
    controller.onStateChange(listener)

    expect(controller.interrupt()).toBe(true)
    expect(controller.interrupt()).toBe(false)
    await expect(controller.checkpoint()).rejects.toBeInstanceOf(RunInterruptedError)
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith('interrupted')
  })
})
