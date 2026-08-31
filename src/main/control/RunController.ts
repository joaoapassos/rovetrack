import type { RunControl, RunControlState } from './contracts'

export class RunInterruptedError extends Error {
  constructor() {
    super('A operação foi interrompida pelo utilizador.')
    this.name = 'RunInterruptedError'
  }
}

export const isRunInterruptedError = (error: unknown): error is RunInterruptedError =>
  error instanceof RunInterruptedError

export class RunController implements RunControl {
  private currentState: RunControlState = 'running'
  private readonly listeners = new Set<(state: RunControlState) => void>()

  get state(): RunControlState {
    return this.currentState
  }

  interrupt(): boolean {
    if (this.currentState !== 'running') return false
    this.setState('interrupted')
    return true
  }

  async checkpoint(): Promise<void> {
    this.throwIfInterrupted()
  }

  onStateChange(listener: (state: RunControlState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(state: RunControlState): void {
    this.currentState = state
    for (const listener of this.listeners) listener(state)
  }

  private throwIfInterrupted(): void {
    if (this.currentState === 'interrupted') throw new RunInterruptedError()
  }
}
