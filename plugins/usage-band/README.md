# usage-band

A band above the prompt box showing, colour-coded by level:

| Metric | Source | Colours |
| --- | --- | --- |
| Context | % of the model's context window used | green < 50%, amber 50–79%, red ≥ 80% |
| Session | 5-hour rate-limit window | same |
| Week | 7-day rate-limit window (plus any per-model weekly windows the API reports) | same |
| Cache | hit rate of the last turn: cache-read tokens ÷ all prompt tokens | green ≥ 80%, amber 50–79%, red < 50% |

Every session starts in `compact`. Click `◐` to cycle layouts; open sessions follow the pick within a minute:
`compact` (one line), `heat` (solid colour blocks),
`bars` (block bars with reset times), `chips` (bordered pills), `detailed` (tokens, cost, model, reset times,
cache read/write split). `✕` hides the band for the session.

## Files

- `.claude-plugin/plugin.json`: manifest.
- `hooks/hooks.json`: points the engine at the hooks module.
- `hooks/register.tsx`: the mod. Refreshes figures on `session.start`, every 60 s and on each main-loop
  `turn.complete` (via `$.session.usage()` and the turn's `usage`), and draws on `ui.render` for `AbovePrompt`.
- `types/index.d.ts`: the `$.state` contract for the values it keeps.
