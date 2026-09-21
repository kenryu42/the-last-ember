# Early development verification

Historical measurements from before the structure refactor. See the development guide for current commands.

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
  See [docs/art/README.md](../art/README.md) and
  [docs/art/cards.md](../art/cards.md) for sources and mapping.
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

| Cards reviewed, by ID                                      | Distinction retained                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `strike`, `guard`                                          | Simple starter baselines. Both are excluded from reward and merchant offers; stronger acquired replacements are intentional progression.                                       |
| `arrow`, `flame`, `cinder`, `defiance`, `needle`, `double` | Draw versus raw damage, energy/Dread costs, opposite Dread payoff windows, and per-hit relic bonuses. Conditional and repeated damage cannot be reduced to one printed number. |
| `volley`, `inferno`                                        | Quiet area damage versus a larger area burst that attracts Dread.                                                                                                              |
| `pass`, `oath`, `ward`, `resolve`                          | Immediate defense with different exposure costs, retained defense, or defense scaling with existing Dread.                                                                     |
| `unseen`, `courage`, `home`                                | Free small retained defense versus paid concealment/Block and a larger two-energy retained package.                                                                            |
| `bash`, `shield`, `stand`                                  | Mixed attack/Block, payoff for previously built Block, or a larger high-Dread attack/defense commitment.                                                                       |
| `challenge`, `feint`                                       | Weak reduces incoming damage; Vulnerable amplifies subsequent attacks.                                                                                                         |
| `trail`, `scout`, `silence`, `remember`, `lantern`         | One-shot free draw versus repeatable paid draw, different concealment depths, and extra draw in exchange for exposure.                                                         |
| `rally`, `spark`, `sacrifice`                              | Safe small energy plus Block versus escalating energy/exposure bursts. Gaining Dread can help an existing payoff, so it is not universally a penalty.                          |
| `bread`, `sunrise`                                         | Cheaper heal-and-draw versus a larger single-card heal at higher energy/exposure cost.                                                                                         |

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
`bun scripts/browser/card-layout.ts` runs an isolated Chromium regression against the
production preview at port 4173, or a URL supplied as its first argument. It opens
every real camp and read-only comparison at 390×844 and 1280×900, measuring both
title-span and individual text-line bounds, including the nested upgrade mark.
It also checks card proportions, seal inset, art coverage, rule/footer separation
and reachable controls, then confirms that
only Shoulder the burden improves and the camp is consumed. It prints 256 checked
comparison faces and focused title bounds, and writes four screenshots under `/tmp`.
It also checks all 64 deck variants and a real ten-card hand at both widths for
proportions and text overflow. The hand checks inspect each face upright and verify
that every cost seal is exposed, no horizontal scrolling is needed, and keyboard
navigation reaches both ends of the fan.
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
