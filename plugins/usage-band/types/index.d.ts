export type Variant = 'heat' | 'compact' | 'bars' | 'chips' | 'detailed'

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

// What a session that just got a reply shares through $.store with every other session.
export type SharedLimits = { at: number; limits: Limit[] }

export type Snapshot = {
  contextPercent?: number
  contextTokens?: number
  contextWindow: number
  limits: Limit[]
  // When `limits` was reported, ms since the epoch: the newest reading across sessions wins.
  limitsAt?: number
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
