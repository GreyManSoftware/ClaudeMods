import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit, Snapshot, Variant } from '../types'

const snapshot = atom({ plugin: 'usage-band', key: 'snapshot' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)
const variant = atom({ plugin: 'usage-band', key: 'variant' } as const, 'heat')
const isHidden = atom({ plugin: 'usage-band', key: 'isHidden' } as const, false)

const VARIANTS: readonly Variant[] = ['heat', 'compact', 'bars', 'chips', 'detailed']

type Level = 'success' | 'warning' | 'error' | 'subtle'

const label = (kind: string): string => {
  if (kind === 'five_hour') return 'Session'
  if (kind === 'seven_day') return 'Week'
  if (kind === 'spend_limit') return 'Spend'
  // Per-model weekly windows, e.g. seven_day_opus.
  const rest = kind.replace(/^seven_day_?/, '').replace(/_/g, ' ')
  return kind.startsWith('seven_day') ? `Week ${rest.charAt(0).toUpperCase()}${rest.slice(1)}` : kind
}

// Usage: low under 50%, medium 50-79%, high from 80%.
const level = (pct: number | undefined): Level =>
  pct === undefined ? 'subtle' : pct >= 80 ? 'error' : pct >= 50 ? 'warning' : 'success'

// Cache hit rate runs the other way: high is good.
const hitLevel = (pct: number | undefined): Level =>
  pct === undefined ? 'subtle' : pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'

const bar = (pct: number, width: number): string => {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const tokens = (n: number | undefined): string =>
  n === undefined ? '?' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

const span = (ms: number): string => {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

const resetsIn = (limit: Limit, at: number): string =>
  limit.resetsAt ? `resets in ${span(Date.parse(limit.resetsAt) - at)}` : ''

// Share of the last turn's prompt tokens the cache served.
const hitRate = (snap: Snapshot): number | undefined => {
  const read = snap.lastCacheRead ?? 0
  const total = read + (snap.lastCacheWrite ?? 0) + (snap.lastInput ?? 0)
  return total > 0 ? Math.round((read / total) * 100) : undefined
}

const hitText = (pct: number | undefined): string => (pct === undefined ? '—' : `${pct}% hit`)

async function refresh($: EngineInterface, fromResponse?: Partial<Snapshot>) {
  const usage = await $.session.usage()
  const at = await $.clock.now()
  await update($, snapshot, prev => ({
    ...(prev ?? { limits: [], contextWindow: usage.context.window }),
    ...fromResponse,
    contextPercent: usage.context.percent,
    contextTokens: usage.context.tokens,
    contextWindow: usage.context.window,
    limits: usage.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
    costUsd: usage.cost?.usd,
  }))
  await update($, now, () => at)
}

export const register: Register = on => {
  let tick: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const saved = (await $.store.get('variant')) as Variant | undefined
    if (saved && VARIANTS.includes(saved)) await update($, variant, () => saved)
    await refresh($)
    tick?.cancel()
    // Keeps reset times and limits current between turns; usage() without a breakdown is free.
    tick = $.clock.every(60_000, () => void refresh($))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // Subagents run on their own caches; only the main loop's matters here.
    if (e.agentId === undefined && e.usage) {
      await refresh($, {
        lastCacheRead: e.usage.cache_read_input_tokens,
        lastCacheWrite: e.usage.cache_creation_input_tokens,
        lastInput: e.usage.input_tokens,
        model: e.usage.model,
      })
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const snap = await read($, snapshot)
    if (e.props.hasSurvey || snap === null || (await read($, isHidden))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const at = (await read($, now)) || (await $.clock.now())
    const v = await read($, variant)
    const ctx = snap.contextPercent
    const hit = hitRate(snap)

    const controls = (
      <Box key="controls" flexDirection="row" gap={1}>
        <Button
          key="layout"
          plain
          dimColor
          label={`◐ ${v}`}
          onPress={async () => {
            const nextVariant = VARIANTS[(VARIANTS.indexOf(v) + 1) % VARIANTS.length]
            await update($, variant, () => nextVariant)
            await $.store.set('variant', nextVariant)
          }}
        />
        <Button key="hide" plain dimColor label="✕" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )

    if (v === 'heat') {
      // Solid colour blocks: the fill is the level, so it reads at a glance.
      const block = (key: string, name: string, value: string, color: Level) => (
        <Box key={key} flexDirection="row">
          <Text backgroundColor={color} color="inverseText" bold>
            {` ${name} ${value} `}
          </Text>
        </Box>
      )
      return (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {block('ctx', 'Context', `${ctx ?? '?'}%`, level(ctx))}
            {snap.limits.map(l => block(l.kind, label(l.kind), `${l.percentUsed}%`, level(l.percentUsed)))}
            {block('cache', 'Cache', hitText(hit), hitLevel(hit))}
          </Box>
          {controls}
        </Box>
      )
    }

    if (v === 'compact') {
      return (
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row" gap={1}>
            <Text dimColor>Context</Text>
            <Text color={level(ctx)}>{ctx ?? '?'}%</Text>
            {snap.limits.map(l => (
              <Box key={l.kind} flexDirection="row" gap={1}>
                <Text dimColor>· {label(l.kind)}</Text>
                <Text color={level(l.percentUsed)}>{l.percentUsed}%</Text>
              </Box>
            ))}
            <Text dimColor>· Cache</Text>
            <Text color={hitLevel(hit)}>{hitText(hit)}</Text>
          </Box>
          {controls}
        </Box>
      )
    }

    if (v === 'bars') {
      const row = (key: string, name: string, pct: number, color: Level, tail: string) => (
        <Box key={key} flexDirection="row" gap={1}>
          <Text dimColor>{name.padEnd(12)}</Text>
          <Text color={color} mono>{bar(pct, 20)}</Text>
          <Text color={color} tabular>{tail}</Text>
        </Box>
      )
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" justifyContent="space-between">
            {row('ctx', 'Context', ctx ?? 0, level(ctx), `${ctx ?? '?'}% · ${tokens(snap.contextTokens)}/${tokens(snap.contextWindow)}`)}
            {controls}
          </Box>
          {snap.limits.map(l => row(l.kind, label(l.kind), l.percentUsed, level(l.percentUsed), `${l.percentUsed}% · ${resetsIn(l, at)}`))}
          {row('cache', 'Cache', hit ?? 0, hitLevel(hit), hitText(hit))}
        </Box>
      )
    }

    if (v === 'chips') {
      const chip = (key: string, name: string, value: string, color: Level) => (
        <Box key={key} borderStyle="round" borderColor={color} paddingX={1} flexDirection="row" gap={1}>
          <Text dimColor>{name}</Text>
          <Text color={color} bold>{value}</Text>
        </Box>
      )
      return (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {chip('ctx', 'Context', `${ctx ?? '?'}%`, level(ctx))}
            {snap.limits.map(l => chip(l.kind, label(l.kind), `${l.percentUsed}%`, level(l.percentUsed)))}
            {chip('cache', 'Cache', hitText(hit), hitLevel(hit))}
          </Box>
          {controls}
        </Box>
      )
    }

    // detailed
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row" gap={1}>
            <Text dimColor>Context</Text>
            <Text color={level(ctx)}>
              {ctx ?? '?'}% ({tokens(snap.contextTokens)} of {tokens(snap.contextWindow)})
            </Text>
            {snap.model ? <Text dimColor>· {snap.model}</Text> : null}
            {snap.costUsd !== undefined ? <Text dimColor>· ${snap.costUsd.toFixed(2)} this session</Text> : null}
          </Box>
          {controls}
        </Box>
        <Box flexDirection="row" gap={2} flexWrap="wrap">
          {snap.limits.map(l => (
            <Box key={l.kind} flexDirection="row" gap={1}>
              <Text dimColor>{label(l.kind)}</Text>
              <Text color={level(l.percentUsed)}>{l.percentUsed}%</Text>
              <Text dimColor>{resetsIn(l, at)}</Text>
            </Box>
          ))}
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text dimColor>Cache, last turn</Text>
          <Text color={hitLevel(hit)}>{hitText(hit)}</Text>
          {snap.lastCacheRead !== undefined ? (
            <Text dimColor>
              · {tokens(snap.lastCacheRead)} read, {tokens(snap.lastCacheWrite)} written, {tokens(snap.lastInput)} uncached
            </Text>
          ) : null}
        </Box>
      </Box>
    )
  })
}
