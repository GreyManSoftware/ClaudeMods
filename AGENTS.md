# Agent guide

This repository is a Claude Code plugin marketplace of mods (hook-module plugins). Read this before installing,
using or changing one.

## Using a mod

- Install: `claude plugin marketplace add GreyManSoftware/ClaudeMods`, then
  `claude plugin install <mod>@claude-mods --scope user`. User scope applies to every new session; already-open
  sessions need `/reload-plugins` or an app restart.
- Check what is installed and where it is read from: `claude plugin list`.
- Turn one off without uninstalling: set `"enabledPlugins": { "<mod>@claude-mods": false }` in
  `~/.claude/settings.json`, or `claude plugin uninstall <mod>@claude-mods` to remove it.
- Mods draw UI (bands, panes, status entries); they do not add tools you call. Each mod's `README.md` says what
  it shows and which hooks it uses.

## Changing or adding a mod

- One folder per mod under `plugins/<mod>/`, laid out as in the root README, and one entry for it in
  `.claude-plugin/marketplace.json` (`"source": "./plugins/<mod>"`). The folder name, the manifest `name` and the
  marketplace entry `name` match.
- Load the `plugin-authoring` skill before writing hooks code: it points at this engine build's API types
  (`claude-code.d.ts`) and examples. Grep the types for the event or `$` call you need rather than guessing.
- Values kept in `$.state` are declared in `types/index.d.ts` under the mod's name, and the manifest names that
  file in `"types"`.
- Pass `$` only to functions declared at the top level of the module; the validator rejects it otherwise.
- Bump `version` in the mod's `plugin.json` for every change users should receive.
- Before committing: `claude plugin validate plugins/<mod>` (and `claude plugin validate .` for the marketplace)
  must pass. Do not commit `plugins/<mod>/.claude-plugin/types/`; the engine generates it (it is git-ignored).
- Never commit secrets, personal email addresses or machine-specific paths.
