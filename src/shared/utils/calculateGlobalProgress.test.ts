import type { PipelineState } from '@shared/contracts/pipeline'
import { describe, expect, it } from 'vitest'
import { calculateGlobalProgress } from './calculateGlobalProgress'

const base: PipelineState = {
  runId: 'run',
  status: 'downloading',
  message: '',
  progress: 10,
  step: { current: 2, total: 4 },
  batch: { current: 1, total: 1 },
  report: { total: 1, succeeded: 0, failed: 0, errors: [], tracks: [] }
}

describe('calculateGlobalProgress', () => {
  it('não converte erro antecipado automaticamente em 100%', () => {
    expect(calculateGlobalProgress({ ...base, status: 'error' })).toBeLessThan(100)
  })

  it('conclui success e partial em 100%', () => {
    expect(calculateGlobalProgress({ ...base, status: 'success' })).toBe(100)
    expect(calculateGlobalProgress({ ...base, status: 'partial' })).toBe(100)
  })

  it('preserva o progresso ao interromper', () => {
    expect(calculateGlobalProgress({ ...base, status: 'interrupted' })).toBeLessThan(100)
  })
})
