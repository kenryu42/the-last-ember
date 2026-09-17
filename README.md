# The Last Ember

A complete, local-first solo deckbuilding adventure. Mara, Eryn, and Aldren carry
the last living ember through a forest frontier, a fallen kingdom, and a mountain
pass. One shared deck, one health pool, and magic that attracts the dark.

## Autonomous playtesting

Run complete AI journeys, benchmark campaigns, stress/exploit suites, paired
experiments, and replay analysis without a human player. See [LABORATORY.md](LABORATORY.md)
for exact commands, policy boundaries, metric definitions, and measured findings.
Start with `bun scripts/lab.ts journey --games 1 --bot strategic --seed demo` or
`bun scripts/lab.ts suite --suite smoke --games 1`. The laboratory preserves the
solo game's rules; it does not invent PvP matchups or first-player statistics.

## Play

Start a journey, choose a reachable road, and read enemy intentions before playing
cards. Click a targeted card, then an enemy; Escape cancels. With only one living
enemy, the card targets it automatically. Other cards play on click. Tab and
Enter/Space work throughout. Larger hands scroll and have explicit
previous/more controls. Inspection is available for every pile, the permanent deck,
enemies, relics, and upgrades.

Hover a card's artwork or focus the card with the keyboard to see its full base or upgraded
painting. You can move onto the preview to inspect it; Escape dismisses it without
closing the underlying dialog. Clicking the card still performs its normal action.
The preview fits the viewport and uses the native browser Popover API.

Cards use the selected **Wayfarer** design: stitched leather, quiet parchment,
wax energy seals and mounted paintings. All names, costs, rules and keywords remain
live text. The common bookcloth back marks the face-down draw pile, with a subdued
empty state; clicking it still inspects the pile with order hidden. Upgraded art
and the title's `+` remain distinct. Hand previews are suspended during target
selection and action resolution so they cannot cover combat targets. The two
locally bundled material images total 480,668 bytes; sources are in
`ART_PROVENANCE.md`. No rules, saves or acquisition behavior changed for this design.

New journeys use **recurring Dread**: at turn end, 4–7 temporarily strengthens
the front enemy by 2; 8–10 strengthens all enemies by 3 and then loses 4 Dread.
Howls happen afterward. The opening battle of act two is an Escape: spend 1 energy and
discard a card to Work toward 4 Progress, at most twice per turn. Choose an
Ember bearer after drawing the first encounter's opening hand in each Act. That
bearer stays locked through the Act's fights, camps, shops, and reloads. Choose
again after a boss reward advances the Act. There is no pass action, cost, or
control, and every hero's cards remain playable. Bearer passives still reset each
turn and at the start of each fight.
New journeys start without a relic or a build-selection step. Ancient
flame has two upgrades at camps and upgrade events: Veiled Flame for concealment
or Wildfire for groups. New rewards include Break formation, a zero-energy attack
that converts all remaining Block into damage instead of preserving it, and
Fading strike, which lowers Dread before checking its precision damage bonus.
CLI benchmarks can explicitly select original rules for comparison.
See [IDENTITY_EXPERIMENT.md](IDENTITY_EXPERIMENT.md) for paired results, limitations,
and the evidence behind these small card experiments.

Play the current rules autonomously with
`bun scripts/lab.ts journey --rules recurring --prototype late-escape --relic shieldfire --progression exploratory --games 10 --bot search --seed demo`.
Record full paired campaigns with
`bun scripts/identity-campaign.ts late-escape identity-v1 10 shieldfire exploratory`;
omit the prefix to generate and record fresh entropy seeds. Labels `baseline`,
`recurring`, `escape` (6 Progress), and `escape-v2` (4 Progress) isolate earlier stages.
The archived `bearer-v2` label added the earlier encounter-level bearer rules; an
optional relic argument adds the starting-relic stage. Its bearer and passing
measurements are historical, not evidence for the current Act-locked rule.
The default progression policy remains `static`. `build-aware` tests acquiring
existing support; it does not alter reward eligibility or combat rules.
`continuation` preserves those acquisition rankings but compares Flame branches
through sampled combat continuations. It is an experimental evaluator, not an
optimal policy. `branches` retains the earlier 30-design reward pool;
`conversion` adds Break formation for 31 reward designs; `concealment` adds
Fading strike for 32. `exploratory` samples reward choices, including skip, with
independent seeded randomness; other progression decisions use `build-aware`.
`late-escape` moves the single Escape to act two's opening, after card rewards,
without changing its formation or target.
`exploratory` tests acquisition blind spots, not optimal deckbuilding, and does not alter
the game's offer generation. Compare constructed cards separately with
`bun scripts/block-study.ts <fresh-seed> concealment`.
`sampled` replaces only reward selection with four real combat trials per option,
including skip, using public deck/relic/health/act information and independent
fixed seeds. It requires recurring Dread and bearers. It costs up to 16 trial
fights per reward screen and is diagnostic, not the default policy. Trial outcomes
are recorded in `rewardEvaluations`; shop and camp rankings remain `build-aware`.

There are 18 stops over three acts: ordinary battles, optional elites, events,
merchants, camps, and three guardians. The game contains 34 base card designs,
two Ancient flame upgrade branches, 15 relics including three starter-only choices,
eight events, eight ordinary enemy types, three act-specific elite
formations, and three bosses with telegraphed phase changes. Victory lights the
beacon; defeat remembers the fellowship's attempt. Results and custom seeds support
replay without permanent stat grinding or unlock gates.

New routes give each road two distinct next-stop choices: upper → upper/middle,
middle → upper/lower, lower → middle/lower. No road has another road's choices
plus a free third option. The final column still leads directly to the guardian.
Saved routes retain their stored connections; newly generated acts use this topology.
Node contents and route RNG consumption are unchanged. Earlier journey and recovery
measurements below describe their historical topology, not current seeded outcomes.

**Progress saves after every committed action.** Continue restores the exact draw
order, rewards, stock, and RNG state. Settings → Export journey makes a portable
JSON backup; Restore validates it and requires explicit replacement confirmation.
Settings persist independently. Corrupt saves are not silently erased. Saves belong
to the browser origin: changing portal URLs, browsers, or devices requires export
and import. Private browsing or clearing site data can remove local progress.

## Run and check

Use Bun 1.3.10. No database, backend, credentials, or external runtime asset service
is required. The starter's React/TypeScript/Vite/Bun architecture is retained.
Zod validates external data; local Fontsource packages supply the two typefaces.
CSS and the Web Animations API handle motion; Web Audio supplies original synth
cues and a regional, phrase-based score. Prettier is development-only.

```sh
bun install --frozen-lockfile
bun run dev
bun test
bun run typecheck
bun run build
bun run preview
bun scripts/simulate.ts                 # five reproducible policy-driven journeys
bun scripts/simulate.ts your-seed
```

`typecheck` covers application code, tests, and verification scripts. `build` also
runs it. `dist/` is the production output; preview serves that output, not source.

### Browser regression tools

Use the installed `agent-browser` with a stable session name. Start a journey through
the UI, dismiss or complete the introduction, then:

```sh
bun scripts/browser-run.ts SESSION
```

The pilot chooses legal actions and drives rendered controls. It reads only this
game's saved state and compares each action with the deterministic engine. It never
writes state. Keep other automation out of the same session during the run.

`bun scripts/fixtures.ts /tmp` writes labeled isolated combat, defeat, boss, shop,
and event saves. Import them through Settings in a separate browser session. These
are fixtures, not legal full runs, and do not substitute for the pilot or human play.
The combat fixture deliberately starts with ten cards and multiple enemies to stress
layout, blocking, multi-hit effects, Dread, and delayed reinforcement.
The gallery fixture contains all 64 base/improved card variants for asset and
inspection-layout checks; it is not a balanced playable deck.

## Architecture and extension points

- `src/game/content.ts`: authoritative card effects/text, enemy intentions, relics,
  act descriptions, and event choices. Change numbers here, then update independent
  test expectations. Each card has a single upgrade; each effect states both values.
- `src/game/model.ts`: discriminated scenes/actions and Zod-derived persisted types.
- `src/game/engine.ts`: pure seeded rules. `resolve(run, action)` returns the next
  run and ordered presentation snapshots. Invalid actions leave the state untouched.
  All gameplay randomness consumes the stored LCG state; presentation adds none.
- `src/game/storage.ts`: save/settings boundaries and bounded local result history.
  This game is unreleased. Breaking changes are fine; do not add migrations or
  legacy compatibility unless the user explicitly requests them. See `AGENTS.md`.
- `src/App.tsx`: input lock, immediate canonical commit/autosave, then presentation.
  Timers never determine damage or turn order. Reloading during animation resumes
  the committed result. Reduced motion settles immediately.
- `src/ui/`: scene rendering, card/inspection components, local audio, responsive CSS.
- `src/ui/combat-effects.tsx`: presentation-only sword arcs, arrows, fireballs, and
  impacts. Geometry is measured once per effect. Damage snapshots and impact sounds
  arrive together; these effects never feed back into the engine.
- `src/ui/music.ts`: deterministic regional phrases and camp/combat/boss/Dread
  arrangements. `audio.ts` schedules them ahead on the audio clock, with separate
  voice limits and volume controls for music and effects.
- `tests/`: independent card arithmetic, thresholds, zones, ordering, relic hooks,
  shops/events, invalid actions, save validation, and seeded journey invariants.

Relic hooks are deliberately small: setup bonuses, damage modifiers before
Vulnerable, block/heal modifiers per effect, then encounter-win healing/gold.
Weak and Vulnerable lose one duration after that enemy's action. Block granted by
Dread survives the enemy phase; old enemy block clears before threshold resolution.
The Rules dialog is the player-facing contract. Keep its wording synchronized.

## Decisions and playtest findings

- Kept 70 starting health, three energy, 12 starter cards, and the fellowship's shared
  resources. No separate companion health or class restrictions were added.
- Camp healing is 25%, rounded up; clearing an act boss heals 20%. These make both
  healing and improving the deck plausible choices without full-healing every stop.
- Every act starts with a battle. An earlier browser run avoided too much combat;
  the revision preserves route choice but ensures the adventure has a tactical spine.
- Bosses gain attack at half health or below; the Hollow Beacon also punishes high Dread.
  High-Dread Defiance/Ember resolve, energy bursts, and quiet precision offer different
  reasons to accept or avoid thresholds. No claim of exhaustive balance is made.
- Added import/export and local result history rather than account/cloud systems.
  A ten-card layout check prompted explicit hand-scroll controls.
- Art uses the selected romantic-wilderness direction, with local painted sheets,
  consistent companion identities, and live readable rules over quiet card panels.
  Every card has separate base and improved illustrations, without introducing
  extra mechanical upgrade tiers. `CardDef.art` indexes one of 32 pairs: two pairs
  per sheet, base on the left and improved on the right. The inner art layer keeps
  the cell's 3:2 aspect ratio; its container crops it without exposing adjacent cells.
  See [ART_PROVENANCE.md](ART_PROVENANCE.md) and
  [CARD_ART_PROVENANCE.md](CARD_ART_PROVENANCE.md) for sources and mapping.
- Regional music uses forest plucks/flute, ruins bells/strings, and mountain
  wind/percussion. Four-measure variations and scene/Dread arrangements add motion
  without continuous high-intensity music. It remains synthesized, not orchestral.

### Card redundancy audit

Player feedback exposed an identity problem that the earlier correctness and
strategy checks did not cover. The audit compared all 32 cards at both tiers,
including cost, effect order, repeated hits, Retain/Exhaust, conditional payoffs,
and acquisition availability. Companion labels do not supply mechanical bonuses.

Two accidental collisions were corrected:

- **Hidden trail** previously duplicated Small courage's Block/Dread values at
  both tiers, with reversed effect order and no Retain. It now costs 0, lowers
  Dread by 1 or 2 when improved, draws one card, and Exhausts. Small courage keeps
  its bankable defense. Higher ground draws more cards without concealment;
  Quiet as snowfall costs energy for stronger, reusable concealment. Exhaust
  prevents reusing the same copy's free draw/concealment during this encounter;
  it still thins subsequent reshuffles after replacing itself immediately.
- **Shoulder the burden** previously became numerically identical to improved
  Borrowed fire: 2 energy for 2 Dread. Burden now grants 2/3 energy for 3 Dread at
  either tier; Borrowed fire remains 1/2 energy for 2 Dread. Both cost 0 and Exhaust.
  From 1 Dread with normal, unconsumed thresholds, improved Fire stays below the
  first threshold while improved Burden crosses it for one more energy. Quiet
  Bell, consumed thresholds, lethal turns, the Dread cap and high-Dread synergies
  change that marginal cost; Burden is not universally riskier. Its base is unchanged.

The remaining close comparisons have useful differences and were preserved:

| Cards reviewed, by ID | Distinction retained |
| --- | --- |
| `strike`, `guard` | Simple starter baselines. Both are excluded from reward and merchant offers; stronger acquired replacements are intentional progression. |
| `arrow`, `flame`, `cinder`, `defiance`, `needle`, `double` | Draw versus raw damage, energy/Dread costs, opposite Dread payoff windows, and per-hit relic bonuses. Conditional and repeated damage cannot be reduced to one printed number. |
| `volley`, `inferno` | Quiet area damage versus a larger area burst that attracts Dread. |
| `pass`, `oath`, `ward`, `resolve` | Immediate defense with different exposure costs, retained defense, or defense scaling with existing Dread. |
| `unseen`, `courage`, `home` | Free small retained defense versus paid concealment/Block and a larger two-energy retained package. |
| `bash`, `shield`, `stand` | Mixed attack/Block, payoff for previously built Block, or a larger high-Dread attack/defense commitment. |
| `challenge`, `feint` | Weak reduces incoming damage; Vulnerable amplifies subsequent attacks. |
| `trail`, `scout`, `silence`, `remember`, `lantern` | One-shot free draw versus repeatable paid draw, different concealment depths, and extra draw in exchange for exposure. |
| `rally`, `spark`, `sacrifice` | Safe small energy plus Block versus escalating energy/exposure bursts. Gaining Dread can help an existing payoff, so it is not universally a penalty. |
| `bread`, `sunrise` | Cheaper heal-and-draw versus a larger single-card heal at higher energy/exposure cost. |

No further same-tier, same-cost exact effect packages remain. A regression test
ignores names, artwork and keywords and normalizes the commuting Block/Dread/energy
effects to catch both reported collisions. It preserves conditional/draw/hit
ordering and hit multiplicity. This is a duplicate detector, not proof of balance
or of every possible strategic distinction.

Only two card definitions changed. Dread thresholds, boss timing, relics, rewards,
prices and the test pilot are unchanged. Card copies use the revised definitions.
The illustrations still fit the concealment and energy-burden roles and contain no
baked rules text. No new keyword was needed.

Verification after this audit: **94 tests, 10,481 assertions**, typecheck, production
build and fixture generation pass. The new focused tests failed on the old
definitions before the fixes. Five standard policy journeys still reach victory.
An animated browser run of `card-audit-1` matched 192 actions through all 18 stops,
used Trail seven times, and won at 38 health. A muted/reduced-motion run of
`card-audit-3` matched 149 actions, used improved Burden four times, and reached a
valid defeat at zero health. The animated run's browser error log was empty;
the reduced-motion session was unavailable for a later error-log check. Rendered reward
choices and Burden's upgrade comparison were inspected. These selected runs test
the changed cards and transitions, not human balance or archetype win rates.

### Wayfarer verification

After the card-frame/back implementation, **95 tests and 10,679 assertions** pass,
along with typecheck and production build. Chromium layout checks cover all 64
variants in the deck and a compact-hand CSS probe at desktop/narrow widths, plus
the real ten-card combat hand and 390px upgrade comparison. Screenshots of the
deck, combat and upgrade comparison were inspected. Names, rules and keywords do
not overlap in those checked states, but the initial checks missed long titles
in narrow comparisons; see QA-003 below. Art-only hover, hover
texture retention, draw-pile inspection and suppression of previews during target
selection were checked live. A first full-run attempt exposed a reopened preview
covering an enemy target; that interaction was fixed before replay.

The animated 1280×720 run `ember-mu28ok3h` matched 189 UI actions across all 18
stops and ended in a valid final-boss defeat. The muted/reduced-motion 390×844 run
`lantern` matched 217 actions across all 18 stops and won at 40 health. Both browser
error logs were empty. These are correctness and layout checks, not balance or
performance certification. No macOS/Safari testing was performed.

QA-003 subsequently exposed long-title overflow in the real narrow camp
comparison. Follow-up responsive polish keeps comparison cards at 230×326 with
a 48px header and an inset energy seal. Below 701px, the pair stacks vertically
instead of squeezing into tall, thin cards. Artwork follows its natural 3:2 ratio,
without letterbox gaps. All card faces and backs now use the same 230:326 ratio.
Ordinary faces are 200px wide and comparisons are 230px wide; headings, seals and
rules scale with the face width. Hands scroll instead of shrinking card widths,
and narrow deck grids use fewer columns. Names and upgrade marks remain complete
at every tested width. Rules are centered horizontally and vertically.
`bun scripts/card-layout.ts` runs an isolated Chromium regression against the
production preview at port 4173, or a URL supplied as its first argument. It opens
every real camp and read-only comparison at 390×844 and 1280×900, measuring both
title-span and individual text-line bounds, including the nested upgrade mark.
It also checks card proportions, seal inset, art coverage, rule/footer separation
and reachable controls, then confirms that
only Shoulder the burden improves and the camp is consumed. It prints 256 checked
comparison faces and focused title bounds, and writes four screenshots under `/tmp`.
It also checks all 64 deck variants and a real ten-card hand at both widths for
proportions and text overflow, including access to the first and last hand cards.
This regression reproduced overflow before the shared CSS fix. The narrow camp
and read-only screenshots, plus desktop equivalents, were inspected after it.

### Initial verification record

The stabilization suite passed **76 tests, 9,039 assertions**. TypeScript checking and
the production build passed. The tests include all base/upgraded card effects, all
event choices, all relic hooks, Dread boundaries and ordering, deferred summons,
terminal states, and save round-trips. Five seeded policy simulations reached
victory; this checks invariants and reachability, not human-quality balance.

A legal production-browser run with seed `lantern` completed all 18 stops in 217
verified actions: eight battles including the three bosses, 33 turns, 135 cards
played, 12 threshold activations, and 40 health remaining. It exercised elites,
events, shops, rest, upgrades, rewards, and act transitions. An earlier browser run
also reached victory before the pacing revision. Automation decides instantly:
its 122-second runtime is **not** a human run-duration estimate. The 25–45 minute
target remains unverified with human players.

A second legal journey, seed `home`, also reached victory with 51 health, 32 turns,
115 cards played, eight battles, and all 18 stops. Its driver was resumed after an
offscreen upgrade-card click; explicit scrolling now makes the driver handle long
deck dialogs. No save injection was used for either complete journey.

Separate browser fixtures verified all eight event screens, merchant removal,
fully/partially blocked hits, multi-target effects, Dread prevention and reinforcement,
and both endings. A fresh journey that only ended turns also reached defeat legally.
Reload/Continue preserved map and combat state; reloading during an attack preserved
the committed result. Rapid duplicate card and End Turn clicks spent/resolved once.
An unsupported import displayed an error without replacing the current save.
Keyboard Enter selected an attack; Escape canceled it. Muted play created no cue
oscillators, and reduced motion left no active animations. Screenshots were inspected
at 1440×900, 1280×720 (including ten-card scrolling), and narrower widths. The real
production portal loaded and started a journey with no failed asset requests or
application errors. Review screenshot/video use a labeled combat stress-test fixture.

Frame timing was measured separately from video capture in Linux orb Chromium,
1440×900 at device scale 2. A 4.5-second four-enemy sequence sampled 259 animation
frames: median 16.7 ms, p95 16.8 ms, three intervals above 33.4 ms, worst 150 ms.
This is mostly 60 Hz with occasional hitches, not a guarantee of stable 60 fps.
DOM sampling confirmed anticipation precedes impact and health updates at impact.
The headless recorder can undersample short CSS effects; video is illustrative,
not a substitute for frame-timing or rule checks.
The final production repeat sampled 81 busy-phase intervals after warmup: median
16.7 ms, p95 16.8 ms, one interval above 33.4 ms, worst 133.4 ms. The inspected
nine-second combat capture includes synchronized original audio; frame timing was
measured without recording overhead.

### Polish verification

The complete polished candidate passes **86 tests, 10,387 assertions**, TypeScript
checking, fixture generation, and production build. Save validation now rejects
stranded map progress, zero-health nonterminal scenes, mismatched encounter nodes,
and impossible final-act boss rewards. Legal committed journeys still round-trip.
Boss descriptions agree with the tested at-half-health phase boundary.

Another animated Chromium journey (`ember-mu1yiiuk`) completed all 18 stops in
237 checked UI actions, with 145 cards played, 43 turns, and victory at 16 health.
It covers the new effects and regional score; the subsequent card-art integration
was separately checked across all 64 variants. All 16 sheets decoded at 1536×1024
and produced 64 unique image/crop combinations in the actual deck inspector.
Desktop and 390px-wide improvement comparisons were inspected for correct crops,
readable rules, reachable controls, and overflow.

Single-enemy duplicate clicks committed one card/cost/discard. Twin arrows showed
two separate impact popups and health transitions of 40→36→32. Muted capture was
digital silence; reduced-motion play had no active animations and correct results.
Recorded forest, ruins, and mountain phrases were reviewed for variation and
continuity. A ten-second scheduler check observed 48 note starts across 11 clock
seconds, rather than repeatedly restarting the first beat.

Final non-recording timing at 1440×900, device scale 2: 338 sampled frames, median
16.7 ms, p95 33.3 ms, worst 66.6 ms. The 159 effect-active frames had the same
median/p95 and two intervals over 33.5 ms. This is mostly 60 Hz with occasional
30 Hz frames/hitches in software-rendered orb Chromium, not a locked-60-fps claim.
The inspected combat video is illustrative: headless screencasting substantially
reduces frame delivery, so it is not the performance measurement.

**Limitations:** no macOS/Safari hardware was available. Chromium checks do not prove
Safari compatibility or contemporary Mac performance. Narrow windows are supported,
but desktop is the primary target. Music uses synthesized instruments rather than
recorded orchestral performances. Listening reviews and automated journeys are not
a substitute for human balance and pacing tests.
The provisional title has not undergone a trademark search. No game release was
pushed, published, or deployed to external infrastructure.

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
