# The Last Ember

A solo fantasy deckbuilding adventure, currently at the development-starter stage.
The game has not been implemented. Read [BUILD_HANDOFF.md](BUILD_HANDOFF.md) for
the complete autonomous build brief, rules, art direction, and acceptance criteria.

## Development

Use Bun 1.3.10. The initial stack is React, TypeScript, Vite, and Bun's test runner.
There is no database, backend, account setup, or required secret.

```sh
bun install --frozen-lockfile
bun run dev
bun test
bun run typecheck
bun run build
bun run preview
```

Vite runs through Bun. Dependencies are pinned in `package.json` and `bun.lock`.
The initial test checks React rendering only; gameplay tests belong with the future engine.

## Amp orbs

`.agents/setup` installs the pinned Bun version if necessary using the orb's
preinstalled npm, then installs locked dependencies. It is safe to run repeatedly.
`.agents/resume` performs a fast readiness check without reinstalling dependencies
or restarting services. Both scripts resolve the repository root from their own path.

```sh
.agents/setup
.agents/resume
amp orb services ensure
```

The declared `web` service listens on Amp's assigned port. Amp supervises it across
CLI updates and orb wakeups. Use the exact portal URL printed by `ensure`.
Vite allows the specific hostname supplied through `PUBLIC_URL`; no generated
orb hostname is committed and host validation is not disabled globally.

## Next build

Start a new orb from the pushed default branch and ask it:

> Read BUILD_HANDOFF.md and implement the complete first version autonomously.
> The toolchain and orb lifecycle files are already prepared. Build, playtest,
> refine, and verify the full adventure, then provide a working portal and evidence.

This starter screen is not the chosen art direction. Follow style C in the brief
when creating the game UI and assets.
