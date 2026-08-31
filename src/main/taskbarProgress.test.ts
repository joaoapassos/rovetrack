import type { PipelineState } from '@shared/contracts/pipeline'
import { describe, expect, it, vi } from 'vitest'
import { updateTaskbarProgress } from './taskbarProgress'

const state: PipelineState = {
  runId: 'run',
  status: 'downloading',
  message: '',
  progress: 50,
  step: { current: 2, total: 4 },
  batch: { current: 1, total: 1 },
  report: { total: 1, succeeded: 0, failed: 0, errors: [], tracks: [] }
}

describe('updateTaskbarProgress', () => {
  it.each([
    'success',
    'partial',
    'interrupted',
    'error'
  ] as const)('remove a barra no estado terminal %s', (status) => {
    const window = { setProgressBar: vi.fn(), isFocused: () => true, flashFrame: vi.fn() }
    updateTaskbarProgress(window, { ...state, status })
    expect(window.setProgressBar).toHaveBeenCalledWith(-1)
  })

  it('mantém progresso normal durante execução', () => {
    const window = { setProgressBar: vi.fn(), isFocused: () => true, flashFrame: vi.fn() }
    updateTaskbarProgress(window, state)
    expect(window.setProgressBar).toHaveBeenCalledWith(expect.any(Number), { mode: 'normal' })
  })
})
