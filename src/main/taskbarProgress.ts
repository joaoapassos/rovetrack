import type { PipelineState } from '@shared/contracts/pipeline'
import { calculateGlobalProgress } from '@shared/utils/calculateGlobalProgress'

interface TaskbarWindow {
  setProgressBar(progress: number, options?: { mode: 'normal' }): void
  isFocused(): boolean
  flashFrame(flag: boolean): void
}

const terminalStatuses = new Set(['success', 'partial', 'interrupted', 'error'])

export function updateTaskbarProgress(window: TaskbarWindow, state: PipelineState): void {
  if (terminalStatuses.has(state.status)) {
    window.setProgressBar(-1)
    if (!window.isFocused()) window.flashFrame(true)
    return
  }
  window.setProgressBar(calculateGlobalProgress(state) / 100, { mode: 'normal' })
}
