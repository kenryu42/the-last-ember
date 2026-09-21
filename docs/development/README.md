# Development

## Run and check

Use Bun 1.3.10. No database, backend, credentials, or external runtime asset service
is required. The starter's React/TypeScript/Vite/Bun architecture is retained.
Zod validates external data; local Fontsource packages supply the two typefaces.
CSS and the Web Animations API handle card and travel motion; GSAP and PixiJS render combat attacks. Web Audio supplies original synth
cues and a regional, phrase-based score.

```sh
bun install --frozen-lockfile
bun run dev
bun test
bun run check
bun run typecheck
bun run build
bun run preview
bun scripts/lab/simulate.ts                 # five reproducible policy-driven journeys
bun scripts/lab/simulate.ts your-seed
```

`typecheck` covers application code, tests, and verification scripts. `build` also
runs it. `dist/` is the production output; preview serves that output, not source.

`check` runs Oxfmt in check mode, import boundaries, TypeScript 7's native
typechecker, type-aware Oxlint, jscpd, Knip, and tests, in that order. It stops at the first
failure and does not fix or reformat files. CI runs this command before the build.
The existing TypeScript project covers `src/`, `tests/`, `scripts/`, and Vite configuration.

Run `bun run lint`, `bun run format:check`, `bun run check:duplicates`, or
`bun run check:unused` to inspect findings independently. `bun run lint:fix`
and `bun run format` explicitly write changes. Oxfmt replaces Prettier; import
sorting is disabled to preserve ordering. Generated experiment evidence and
asset files are excluded from formatting; Git-ignored build output is also skipped.

jscpd checks authored application code, tests, scripts, CSS, and HTML with a
0% duplication limit. Any detected duplication above that limit fails the check.
The command prints a compact clone report. Running jscpd with only `.jscpd.json`
also writes JSON to `artifacts/quality/duplication/`. Knip treats the app,
Bun tests, standalone scripts, and the retained browser probe as entry points;
Vite configuration is discovered by its Vite plugin. The two Fontsource packages
are exempt from unused-dependency checks because `src/ui/styles/base.css` loads
their WOFF2 files through CSS URLs. Findings in existing code
remain failures and require a separate cleanup task.

### Browser regression tools

Use the installed `agent-browser` with a stable session name. Start a journey through
the UI, dismiss or complete the introduction, then:

```sh
bun scripts/browser/browser-run.ts SESSION
```

The pilot chooses legal actions and drives rendered controls. It reads only this
game's saved state and compares each action with the deterministic engine. It never
writes state. Keep other automation out of the same session during the run.

`bun scripts/browser/fixtures.ts /tmp` writes labeled isolated combat, defeat, boss, shop,
and event saves. Import them through Settings in a separate browser session. These
are fixtures, not legal full runs, and do not substitute for the pilot or human play.
The combat fixture deliberately starts with ten cards and multiple enemies to stress
layout, blocking, multi-hit effects, Dread, and delayed reinforcement.
The gallery fixture contains all 64 base/improved card variants for asset and
inspection-layout checks; it is not a balanced playable deck.

## Architecture

See [Architecture and import boundaries](architecture.md) for ownership, the engine contract, and presentation timing.

See [structure refactor verification](structure-verification.md) for the baseline,
determinism comparison, browser checks and retained-evidence audit.

## Amp orbs

`.agents/setup` installs the pinned Bun version and locked dependencies.
`.agents/resume` performs readiness checks without restarting services.

```sh
.agents/setup
.agents/resume
amp orb services ensure
```

The declared `web` service listens on Amp's assigned port and survives pause/resume.
Use its exact printed portal URL. `PUBLIC_URL` supplies the allowed hostname; Vite
host validation is not disabled globally. For a supervised production preview:

```sh
bun run build
amp orb service start production --command 'bun run preview --host 0.0.0.0 --port "$PORT"' --portal --title 'The Last Ember'
```

This is an orb preview, not a public release deployment. The production preview
serves the last build, so rebuild after source changes. Preserve local work before
moving to another checkout; the remote starter does not contain this implementation.
