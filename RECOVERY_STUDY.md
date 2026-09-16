# Recovery study, frozen v0.2 engine

Historical scope: these measurements and the reproduction hash below predate the
two-exit route topology. Rerunning the unchanged script on the new topology keeps
the crafted short-route diagnostics but changes generated adventures. The new
48-run sweep wins 8/6/6 at HP70 and 4/3/5 at HP45 for adaptive/rest/upgrade, with
zero timeouts. The original table and hash remain historical evidence, not current
expected output. Cards, recovery rules, policies and frozen benchmark reports were
not changed to recover the earlier scores.

## Decision

Leave rest, upgrades, and persistent health unchanged. This batch finds pressure-sensitive recovery choices, not a general downward spiral. Rest helps injured parties survive; upgrades sometimes prevent more damage than rest restores. A real healing-delay incentive exists, but this study does not establish frequent tedious play. Shared bread exhausts, so the demonstrated delay cannot farm healing repeatedly in one fight.

No gameplay files were edited by this assignment. The supervisor's 12 v0.2 files were copied first; that baseline passed 133 tests. Independent additions are `scripts/recovery-study.ts`, `tests/recovery-study.test.ts`, and this document. No CLI-worker files were changed, and nothing was pushed, published, or deployed.

## Frozen design and limits

- Eight seeds, declared before evaluation: `recovery-v03-1` through `recovery-v03-8`.
- All three existing fixture decks, quiet/exposed/defense, crossed with fury/reinforce/ward, at act 1 and starting health 70 or 45. No relics. These are crafted diagnostic encounters, not normal adventure openings.
- First fight, skip reward, legal travel to crafted camp, explicit rest or upgrade, legal travel to ordinary battle or elite. Upgrade targets are first unupgraded needle/cinder/shield respectively, or Shared bread. Rest restores 18 HP at maxHP 70, capped at 70. Deck, upgrades, remaining health and stats carry forward. Three-node route is crafted, not a generated full adventure.
- A separate follow-up stream, `${seed}/second/${pressure}`, sets RNG immediately before second travel. Equal-length decks therefore receive matched encounter and shuffle inputs even when first-fight actions consumed different RNG. No claim of identical random outcomes after action sequences diverge inside combat. Rewards are skipped so deck length stays fixed.
- Existing `tests/support/pilot.ts` greedy immediate-action scoring is the main policy. It does not search draw-pile order, but it resolves candidate cards, so scoring may indirectly inspect hidden draw outcomes through energy/block/threshold effects. It is not a strictly public-only solver and is not optimal planning.
- Competing `heal-first` policy plays bread before an available one-card lethal only if a one-card lethal remains immediately afterward. This is a narrow tactical check, not a second strong planner. All actions use authoritative `resolve` in adventure mode. No mixed-Dread comparison duplicates the CLI worker's study.
- 288 first-fight executions, four losses. Their outcomes are copied to six camp/pressure branches each, giving 1,728 branch rows: 1,465 two-fight wins, 239 second-fight losses, 24 first-loss/not-entered rows, zero timeouts. Branches and the two closely related policies are not independent samples. Each combat is bounded at 500 actions.
- Turns count each player turn including the winning turn and fatal enemy phase. They are not the engine's end-turn statistic. Aggregate HP includes deaths at zero. Turn averages include early deaths and must not be read as faster successful play. Runtime is not a measure of human pacing.

## Short-route outcomes

Greedy policy, 72 starting cases in every row. Wins are unconditional two-fight wins, not wins divided only by first-fight survivors. HP is mean final HP including deaths. Turns include both fights.

| Starting HP | Follow-up | Camp | First losses | Second losses | Wins / 72 | Final HP | Turns |
|---|---|---|---:|---:|---:|---:|---:|
| 70 | battle | rest | 0 | 0 | 72 | 52.28 | 10.33 |
| 70 | battle | primary | 0 | 1 | 71 | 42.92 | 9.79 |
| 70 | battle | bread | 0 | 1 | 71 | 42.01 | 10.32 |
| 70 | elite | rest | 0 | 2 | 70 | 39.86 | 11.46 |
| 70 | elite | primary | 0 | 10 | 62 | 31.06 | 10.88 |
| 70 | elite | bread | 0 | 10 | 62 | 29.35 | 11.18 |
| 45 | battle | rest | 2 | 0 | 70 | 36.61 | 10.00 |
| 45 | battle | primary | 2 | 11 | 59 | 22.65 | 9.21 |
| 45 | battle | bread | 2 | 11 | 59 | 22.67 | 9.68 |
| 45 | elite | rest | 2 | 11 | 59 | 24.65 | 10.72 |
| 45 | elite | primary | 2 | 30 | 40 | 15.39 | 9.99 |
| 45 | elite | bread | 2 | 33 | 37 | 15.26 | 10.15 |

Heal-first gives identical win counts except injured/battle/bread rises from 59 to 60. Its mean HP changes range from +0.07 to +0.57. This narrow alternative does not overturn the camp result. No run timed out under either policy.

First losses are seed 1 quiet/fury and seed 3 quiet/ward at HP45, under both policies. Excluding them would falsely present injured ordinary-battle rest as 100% overall success instead of 70/72. Injured starters survive the first fight in 70/72 cases per policy; rest then saves all of those against ordinary pressure, but only 59 against elite pressure. This supports rest as useful rather than routinely insufficient.

Rest can still lose ground. Among greedy rest survivors, final HP falls below pre-camp HP in 17/72 full-health ordinary, 48/70 full-health elite, 12/70 injured ordinary, and 23/59 injured elite cases. That is one rest-plus-fight interval, not evidence of inevitable cumulative decline across an adventure. High incoming pressure matters.

Across all 576 matched rest-versus-upgrade pairs per target, including both policies, rest alone wins 78 primary pairs and 83 bread pairs; upgrade alone wins none. Among joint survivors, primary upgrade produces higher final HP in 41 pairs and fewer follow-up turns in 223. Bread produces higher HP in 7 and fewer turns in 33. These one-fight endpoints underprice the upgrade's benefits in later encounters.

Representative seed 1 cases, greedy policy, tested as regressions:

- Quiet/reinforce, HP45: first win at 9 HP on turn 4. Rest gives 27 HP, then elite win at 7 HP on turn 4. Needle upgrade retains 9 HP, then loses on turn 2. This is a repeatable policy-level rescue, not proof the upgraded state is unwinnable.
- Exposed/fury, HP70: first win at 44 HP on turn 5. Rest gives 62 HP, then elite win at 26 HP on turn 7. Cinder upgrade starts at 44 HP and wins at 29 HP on turn 6. Upgrading can beat resting on both endpoints.
- Exposed/reinforce, HP70: first win at 11 HP on turn 7. Rest gives 29 HP, then elite loss on turn 3 under both policies. This is a diagnostic failure case for stronger tactical evaluation, not a reason to buff recovery. The supervisor reports much stronger policy counterexamples on related fixtures; those reports were not treated as verified measurements here.

## Legal full adventures

48 runs use `newRun` with seed suffix `/adventure`, unchanged generated routes/rewards/events/shops/relics/boss healing, the normal starter deck, starting HP70 or HP45, and the existing journey/combat pilot. HP45 is an experimental initial condition; every subsequent action is legal. There are no RNG resets. Camp policies are the existing adaptive rule, always rest, or always upgrade the highest-rated unupgraded card. Action bound is 3,000 per adventure.

| Starting HP | Camp policy | Wins / 8 | Losses | Mean final HP | Mean turns | Rest / upgrade actions |
|---|---|---:|---:|---:|---:|---:|
| 70 | adaptive | 8 | 0 | 37.875 | 40.25 | 10 / 30 |
| 70 | rest | 7 | 1 | 47.75 | 47.50 | 40 / 0 |
| 70 | upgrade | 7 | 1 | 35.00 | 36.25 | 0 / 38 |
| 45 | adaptive | 7 | 1 | 39.00 | 40.50 | 13 / 25 |
| 45 | rest | 6 | 2 | 18.25 | 41.625 | 36 / 0 |
| 45 | upgrade | 5 | 3 | 34.875 | 34.125 | 0 / 41 |

Zero timeouts. Adaptive uses both choices and wins 15/16, versus 13/16 always-rest and 12/16 always-upgrade. These are small policy-level comparisons. Routes are HP-sensitive, actions alter RNG consumption, and later encounters/rewards need not match across arms. They do not estimate a controlled causal camp effect or population win rate. Adventure victories provide counterevidence to a blanket downward-spiral diagnosis, not proof every recovery state is balanced.

## Reachable healing delay

The fixed sweep also probes up to 200 injured states with immediate lethal, stopping the probe search at its first qualifying delay. It found one after 122 probes. This is an existence search, not a prevalence estimate. The full JSON output includes the complete legal action prefix from the crafted opening, first-fight trace, state, and alternatives.

Seed 1, defense/fury, HP70, greedy first fight, rest, ordinary follow-up using `recovery-v03-1/second/battle`. First fight wins on turn 5 at 70 HP. In the second fight, after 14 greedy actions, turn 4 has HP68, block9, energy1, hand bash/shield/bread, and one living shade at 7 HP. Shield#13 targeting shade#28 wins immediately at HP68. Exhaustively enumerating every legal same-turn card continuation visits four states and finds no win above HP68.

Decline lethal with `end`: turn 5 begins at HP66. Then `bash#15 -> 28`, `bread#24 -> null`, `shield#14 -> 28` wins at HP70 on turn 5. One extra turn buys two final HP. The actions and exact state are regression-tested. This is reachable from the crafted two-fight fixture, not claimed to occur on a generated full adventure. It is bounded by bread's exhaust and HP cap.

A separate same-turn ordering case, seed 1 quiet/reinforce HP70, has `needle#13 -> 26` lethal at HP34 on turn 4. `bread#24`, then that lethal, ends at HP39 on the same turn. Healing-before-kill does not necessarily add turns.

Recommendation: retain this reachable delay regression and do not change bread based on a two-HP tradeoff alone. No structural recovery failure is established. If the supervisor adopts a strict design rule forbidding rewards for postponing lethal, one candidate is to grant unused bread's healing automatically at victory. It predicts HP70 for the immediate kill above, eliminating that incentive, but grants free healing without spending combat energy and weakens bread's tactical role. That is a separate balance decision, not a recommended fix from this evidence.

## Reproduction and verification

```sh
bun test tests/recovery-study.test.ts
bun test
bun run typecheck
bun run build
bun scripts/recovery-study.ts > /tmp/recovery-results.json
bun scripts/recovery-study.ts > /tmp/recovery-repeat.json
cmp /tmp/recovery-results.json /tmp/recovery-repeat.json
sha256sum /tmp/recovery-results.json
```

Final checks: targeted tests 5 pass / 0 fail / 35 assertions; full suite 138 pass / 0 fail / 11,449 assertions across 9 files. Typecheck and production build pass, with 125 modules transformed. `git diff --check` passes. No UI was changed by this diagnostic assignment.

The two independent complete executions produced identical JSON. SHA-256: `142b395aabc8fc220592d7ed02627762e2fe7e1d179b02151922cd8e5df0b933`. Raw rows, all aggregate groups, paired examples, complete healing traces, adventure outcomes and camp decisions are reproducible from the script rather than checked in as a second results artifact. Tests cover exact carryover and capped rest, upgrade UID, baseline immutability, divergent-first-RNG/matched-second inputs, first loss, explicit timeout, winning-turn accounting, upgrade counterexample, and reachable delay with exhaustive same-turn comparison.
