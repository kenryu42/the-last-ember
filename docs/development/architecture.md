# Architecture

The Last Ember is one React/TypeScript/Vite package. Runtime assets keep their
existing URLs under `public/assets/`. This refactor changes ownership and file
locations, not game rules, balance, save formats, or dependencies.

## Ownership

| Directory | Responsibility |
| --- | --- |
| `src/app/` | Screen composition, settings, canonical game session, input lock and autosave |
| `src/game/content/` | Cards, enemies, relics, world and event definitions |
| `src/game/engine/` | Seeded RNG, run creation, combat and journey actions |
| `src/game/selectors/` | Shared calculations for UI and laboratory consumers |
| `src/game/validation/` | Pure parsing and consistency checks for current saves |
| `src/lab/` | Restricted observations, legal actions, policies, recording and simulations |
| `src/platform/browser/` | Browser saves, settings, sound preference and result history |
| `src/ui/` | Cards, combat, journey, stops, shared components and audio |
| `src/ui/devtools/` | Development-only, lazily loaded playtest interface |

The game imports only game modules and Zod. The laboratory imports the game and
its own modules. Browser persistence imports game validation. Application code
composes UI, browser persistence and game modules. Ordinary UI components cannot
import the laboratory or application modules. `bun run check:boundaries` enforces
these directions, including type-only and dynamic imports, and checks for ambient
browser APIs in game and laboratory code.

## Engine contract

`src/game/engine/resolve.ts` is the action coordinator. `resolve(run, action)`
clones the input and returns the committed run, ordered presentation snapshots,
accounting and an error if the action was invalid. Invalid actions return the
original input without partial mutation. Combat and journey handlers receive the
same resolution context; they do not create their own frame queues or RNGs.

Gameplay randomness uses the stored RNG through `engine/rng.ts`. Content stays
independent of the engine. `model.ts` remains one module for the discriminated
actions, scenes and Zod-derived persisted types. No migrations or old-schema
readers are present. See [the compatibility policy](../../AGENTS.md).

`selectors/dread.ts` owns the shared threshold display calculation. UI components
and laboratory recording both use it without importing each other.

## Saving and presentation

`app/useGameSession.ts` owns the canonical run, action resolution, input lock,
autosave and ending history. It commits and saves the engine result before calling
the presentation hook. Travel commits the destination and pending battle
introduction before the approach animation begins. Reloading cannot reroll it.

`ui/combat/useActionPresentation.ts` plays already-resolved snapshots, card flights,
discard/deal sequences and sound cues. It owns the visual run, feedback stage,
acting card and action speed. Timers never calculate damage or consume RNG.
The session unlocks input when playback settles; reduced motion skips playback.
GSAP timelines and PixiJS rendering remain inside `ui/combat/`, including their
existing lazy loading and cleanup. No rendering library is imported by the engine.

`app/useSettings.ts` persists settings and applies audio and motion preferences.
`SettingsPanel` handles the settings and save import/export controls. Card
inspection owns its local comparison selection. `App` composes screens and panels.

## Laboratory information boundary

`lab/observation.ts` explicitly selects public information and sorts piles. It
omits the seed, RNG state, next ID, route, log, rewards and ordered draw pile.
Policies in `lab/policies/` accept that observation. Simulation uses the same
engine as the browser, and policy randomness stays independent of gameplay RNG.
Fixture construction, configuration, protocol handling and recording are separate
from observation and policy selection.

## Styles, scripts and evidence

`ui/styles/style.css` is the ordered CSS entry point. Feature styles live beside
their components. Global foundations, shared motion and mixed responsive overrides
remain in `ui/styles/`. The import sequence preserves the previous cascade; do not
move late responsive overrides ahead of the rules they override.

Scripts run from the repository root. `scripts/lab/` contains CLI entry points,
`scripts/studies/` contains experiment orchestration, `scripts/reports/` contains
Python reports, and `scripts/browser/` contains rendered verification tools.
`tests/` mirrors game, laboratory, UI and browser persistence responsibilities.
Typechecking covers `src/`, `tests/`, `scripts/` and Vite configuration.

Retained evidence is versioned under `experiments/`. New disposable study output
goes under ignored `artifacts/identity/`; CLI JSONL output can be redirected into
`artifacts/`. Historical documents live in `docs/archive/`. They are evidence of
earlier versions, not current acceptance results.
