# Structure refactor verification

Verified on September 21, 2026 against the pre-refactor commit `7de3762`.
The existing GSAP/PixiJS implementation was retained.

## Automated checks

- Baseline: 290 tests, 95,463 assertions, typecheck and production build passed.
- Refactor: 295 tests, 95,469 assertions passed with Bun 1.3.10. Typechecking and
  import-boundary checks passed. Frozen installation changed no dependencies.
- The production build passed. Inspection of rendered bundle modules found zero
  laboratory or development playtest modules. The existing PixiJS chunk warning
  remains, at approximately 703 kB before gzip. No bundle-size reduction is claimed.
- Twelve journeys spanning original and current recurring-Dread rules produced
  identical SHA-256 fingerprints for their initial state and every action,
  resolved state, presentation frame and accounting record before and after the
  refactor. Seeds were `structure-baseline`, `lantern`, `briar`, `warmth`, `beacon`
  and `home` in each rules mode.
- The nine-cell laboratory smoke suite and its Python report completed. A new
  five-policy identity campaign completed and its report consumed the generated
  traces from `artifacts/identity/`.
- All 188 existing retained evidence files remained byte-identical, including
  the three result files moved into `experiments/playtest-v02/`.
- CSS selectors and declarations remain in their original order. Local Markdown
  links resolve. Browser fixture generation and Python report compilation passed.

## Browser checks

Chromium checks used a production preview in an isolated browser session.
Desktop combat and a 390-pixel-wide viewport were visually inspected.

- New journey, Act bearer selection, crossroads and battle introduction rendered.
- Reload restored the saved pending introduction and committed combat state.
- Two immediate clicks on the same card committed one action and one energy cost.
- Saving completed while the attack was still animating and input remained locked.
  Reload during that animation preserved the exact committed state.
- Gameplay speed and mute settings persisted. Save import used the settings UI.
- Targeting a specific enemy applied both hits of Twin arrows. Escape cancelled
  target selection without changing the save. Arrow-key hand navigation worked.
- PixiJS created its combat canvas. Reduced motion removed it and settled end turn
  immediately. The narrow viewport had no horizontal document overflow.
- Pile inspection opened and Escape dismissed it. No browser errors were reported.
- The development-only benchmark loaded through `?benchmark=1` and started a fight.

Logs, screenshots, generated saves and fingerprint output are disposable local
files under `artifacts/refactor/`. These checks do not claim Safari coverage or
new performance measurements. CI repeats frozen installation, the boundary check,
typecheck, all tests and the production build with Bun 1.3.10.
