# ClaudeMods

Mods for [Claude Code](https://claude.com/claude-code) and the Claude desktop app's Code tab. Each mod is a
hook-module plugin; this repository is a plugin marketplace listing them.

| Mod | What it does |
| --- | --- |
| [usage-band](plugins/usage-band) | Colour-coded band above the prompt: context, session and weekly usage, cache hit rate |

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install usage-band --marketplace GreyManSoftware/ClaudeMods
```

Or from a shell:

```bash
claude plugin marketplace add GreyManSoftware/ClaudeMods
```

```bash
claude plugin install usage-band@claude-mods --scope user
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**,
**Add marketplace** with `GreyManSoftware/ClaudeMods`, then **Add plugin**.

User scope loads the mod in every session started afterwards; restart the app (or run `/reload-plugins`) for
sessions already open.

## Layout

```
.claude-plugin/marketplace.json   the marketplace: one entry per mod
plugins/<mod>/
  .claude-plugin/plugin.json      manifest (name, version, types contract)
  hooks/hooks.json                points at the hooks module
  hooks/register.tsx              the mod itself
  types/index.d.ts                $.state contract, when the mod keeps state
  README.md                       what it does
AGENTS.md                         instructions for coding agents working here
```

## Developing

Clone the repository and add the clone as a folder marketplace, so installs read from your working copy:

```bash
claude plugin marketplace add <path-to-clone>
```

Edits then take effect after `/reload-plugins` or a restart, with no reinstall. Check a mod with
`claude plugin validate plugins/<mod>`.
