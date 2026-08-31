import type { PipelineState } from '../contracts/pipeline'

/**
 * Converte a telemetria das quatro etapas numa percentagem única, de 0 a 100.
 * Este cálculo é partilhado pela interface e pelo progresso nativo da janela.
 */
export const calculateGlobalProgress = (state: PipelineState | null): number => {
  if (!state) return 0

  if (state.status === 'success' || state.status === 'partial') return 100

  const { step, batch, progress } = state
  const safeTotalBatch = Math.max(batch.total, 1)

  // Preparação do workspace: 0% -> 5%
  if (step.current === 1) return 5

  // Download: 5% -> 50%
  if (step.current === 2) {
    const currentItemIndex = Math.max(0, batch.current - 1)
    const currentItemProgress = (progress || 0) / 100
    const batchFraction = (currentItemIndex + currentItemProgress) / safeTotalBatch
    return Math.min(50, 5 + 45 * batchFraction)
  }

  // Aplicação de capa e metadados: 50% -> 95%
  if (step.current === 3) {
    const batchFraction = batch.current / safeTotalBatch
    return Math.min(95, 50 + 45 * batchFraction)
  }

  // Limpeza e finalização: 95% -> 100%
  if (step.current === 4) return 95

  return 0
}
