export type Variant = 'heat' | 'compact' | 'bars' | 'chips' | 'detailed'

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

export type Snapshot = {
  contextPercent?: number
  contextTokens?: number
  contextWindow: number
  limits: Limit[]
  costUsd?: number
  // The main loop's last turn, summed over its requests: what the cache served, wrote and missed.
  lastCacheRead?: number
  lastCacheWrite?: number
  lastInput?: number
  model?: string
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      snapshot: Snapshot | null
      now: number
      variant: Variant
      isHidden: boolean
    }
  }
}
