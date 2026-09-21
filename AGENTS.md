# Project structure

Keep one package. Place changes with the responsibility they belong to:

- `src/app/`: screen composition, settings, session state and autosave.
- `src/game/`: browser-independent model, content, engine, selectors and save validation.
- `src/lab/`: playtest fixtures, observations, policies, recording and simulations.
- `src/platform/browser/`: browser storage, preferences and local history.
- `src/ui/`: feature folders for cards, combat, journey and stops; shared components
  and audio. GSAP/PixiJS belong in `combat/`; playtest UI belongs in `devtools/`.
- `tests/` mirrors these responsibilities. `scripts/` groups lab CLIs, studies,
  reports and browser checks. `docs/` holds guides; `experiments/` holds retained
  evidence; ignored `artifacts/` holds disposable output. Assets stay in `public/assets/`.

Keep game code independent of UI, browser APIs and the lab. The lab shares the
game engine; ordinary UI must not import lab or app modules. Put shared game
calculations in `game/selectors/`.

Start at `game/engine/resolve.ts` for rules, `app/useGameSession.ts` for committed
state, and `ui/combat/useActionPresentation.ts` for animation. Save committed
results before playback; animation must not determine gameplay. Preserve CSS
import order in `ui/styles/style.css`.

Run `bun run check` and `bun run build` after code changes. See
[architecture](docs/development/architecture.md) for details.

Add or edit image originals in `artwork/source/`, mirroring paths under
`public/assets/`. Starting `bun run dev` or `bun run build` exports changed
sources as WebP automatically. Do not edit generated images in `public/assets/`
or hand-edit `artwork/exports.json`. Commit sources, exports and the generated
registry together. `bun run check:images` rejects missing, stale or unmanaged
images. See [image workflow](docs/art/image-workflow.md) for exceptions and setup.

# Pre-release compatibility policy

The Last Ember has not been released. Breaking changes are acceptable.

- Do not add migrations, legacy-schema readers, compatibility shims, or fallback
  behavior solely to preserve old saves, settings, APIs, or experimental formats.
- Update code, schemas, callers, tests, and current documentation together. Old
  development data may become invalid; do not silently upgrade it.
- Add migration or backward-compatibility support only when the user explicitly
  requests it. Do not introduce save-preservation confirmation steps as a substitute.
- Keep validation of current data and handling of malformed input or unavailable
  storage. These are correctness requirements, not migration support.
- Explicit CLI experiment/control variants are not migrations. Keep them only
  for active comparisons, with explicit configuration rather than inferred legacy
  defaults. Archived experiment results need not load in current tools.
