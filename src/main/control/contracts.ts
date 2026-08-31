export type RunControlState = 'running' | 'interrupted'

export interface RunControl {
  readonly state: RunControlState
  checkpoint(): Promise<void>
  onStateChange(listener: (state: RunControlState) => void): () => void
}
