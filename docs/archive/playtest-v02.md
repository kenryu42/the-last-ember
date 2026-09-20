# The Last Ember v0.2 autonomous playtest

Human availability is not a gate. Run the automated checks and paired campaigns below, fix demonstrated failures, then proceed to the next scoped iteration. The owner can assess enjoyment and send feedback whenever available. Automated actions, turns and compute time do not establish human thought, fun, frustration, usability or pacing. Those remain unknown, without blocking engineering progress.

This benchmark is isolated. Adventure rules, normal saves, card/enemy numbers, rewards and routes remain unchanged. Candidate is an experimental Dread rule, not promoted into adventure by this campaign.

## Run one fight, a batch, or an agent session

Requires installed dependencies and Bun. Run from the repository root.

```sh
bun scripts/lab/playtest-cli.ts fight '{"rules":"control","fixture":{"deckId":"defense","variant":"base"},"encounterId":"ward","seed":"ember-v02-a","policy":"planner"}'

# Each input line is a complete fight config. Each output line is one result.
bun scripts/lab/playtest-cli.ts batch < /tmp/fights.jsonl > /tmp/results.jsonl

# Persistent JSON-line session for an external playtester agent.
bun scripts/lab/playtest-cli.ts protocol

# Frozen, staged campaign. Progress goes to stderr; one compact report to stdout.
bun scripts/studies/playtest-campaign.ts > /tmp/ember-v02-campaign.json
```

Config requires `rules: control|candidate`, `fixture: {deckId,variant}`, `encounterId: fury|reinforce|ward`, and a nonblank, unpadded seed of at most 80 characters. `variant: base` accepts quiet/exposed/defense; `ablation` accepts only exposed/defense; `diagnostic-mixed` accepts only exposed. Unknown fields and invalid combinations are errors, not silently corrected values.

Optional defaults are `policy: offense`, `planningSeed: belief-v1`, `maxTurns: 40`, `maxActions: 400`, and `searchBudget: 96`. Limits accept 1–200 turns, 1–2000 actions and 1–256 speculative engine calls per decision. Policies are `offense`, `defense`, `dread`, `planner`, and `planner-v2`. Use `searchBudget:256` for the documented v2 study. A turn budget allows actions on its last turn, then reports timeout if ending that turn starts another. Terminal victory/defeat takes precedence over exhausted budgets. Timeouts are censored fights, never losses or successes. Malformed configs/actions return `outcome: error`. Batch continues after each bad line and exits nonzero if any line failed.

Protocol requests, one JSON object per line:

```json
{"op":"start","config":{"rules":"candidate","fixture":{"deckId":"quiet","variant":"base"},"encounterId":"fury","seed":"ember-v02-a"}}
{"op":"observe"}
{"op":"legal"}
{"op":"step","action":{"type":"play","uid":13,"target":25}}
{"op":"step","action":{"type":"end"}}
{"op":"result"}
```

Use actual UIDs from `legalActions`, not the illustrative IDs above. Untargeted cards require `target:null`. Start/observe/step return `{ok:true,outcome,observation,legalActions}`. Legal returns the current canonical action list. Result returns `{ok:true,result}` including exact accepted action trace and telemetry. Invalid requests return an error without changing the current fight, action budget or telemetry. A successful start replaces the session. Invalid starts preserve it. Malformed JSON does not terminate the protocol.

Player observations are an explicit allowlist: health, energy, block, Dread, threshold states, hand/card definitions, sorted pile composition, public enemy state, repeating patterns and current intentions. They exclude fixture seed, engine RNG, ordered draw pile, future shuffle/reward state, route, logs and allocator state. Intents are current intentions, not a full enemy-phase projection. End-turn unlocks and an earlier Howl can change later attacks. Only result exports contain replay metadata; do not feed result exports back into an agent's decision context.

Replay a result by constructing its config in `HeadlessFight`, applying each `trace` action with `step`, then comparing `result()`. This uses the authoritative fixture and engine. No save import is needed. Output has explicit win/loss/timeout status, final health, actual player turns/actions/draws, kills before first enemy action, Dread events and authoritative telemetry. Automated decision/duration fields inherited from telemetry are zero, meaning unmeasured, not instant human decisions. Campaign runtime is compute cost only.

## Policies use public beliefs, not actual hidden state

Version `public-belief-v1` is frozen before held-out evaluation. All policies reconstruct a synthetic Run from the public observation and independently shuffle its sorted draw composition with `planningSeed:actionIndex`. They call the existing engine on that reconstruction. Neither the actual Run nor the fixture seed reaches policy selection. Hidden-order/RNG mutation tests must leave choices unchanged for the same observation and planning seed.

Offense values damage/kills and weights health/block at 0.4. Defense weights health/block at 3. Dread weights health/block at 1.5 and penalizes active or pending thresholds. All have the same energy, hand and Iron-answer synergy terms. These are competing heuristic objectives, not calibrated players. Rules mode affects authoritative predictions equally for all policies.

Planner uses Dread scoring with depth 3, beam width 4 and at most the configured number of engine calls per decision. It stops branches on end turn and replans after every actual action. Other policies score one action. Ties use stable legal-action order; very small budgets truncate that order. A single independent hidden-order sample is fair but noisy and can favor a lucky hypothetical draw. The planner is neither exhaustive nor optimal, and its one-sample evaluation does not estimate expected value. Multiple belief samples and multi-turn planning are useful future improvements, not prerequisites for this campaign.

## Fixed fixtures and paired campaign

All fresh fights start at Act II, 70/70 health, 3 energy, zero block/Dread, five cards from a shuffled 12-card deck, ten-card hand cap, unupgraded cards and no relics.

| Deck    | Exact card IDs                                                              |
| ------- | --------------------------------------------------------------------------- |
| quiet   | 2 needle, 2 arrow, 2 unseen, 2 guard; trail, silence, volley, bread         |
| exposed | 2 defiance, 2 cinder, 2 resolve, 2 guard; spark, sacrifice, remember, bread |
| defense | 2 shield, 2 bash, 2 pass, 2 guard; oath, rally, courage, bread              |

Fury is wraith/wraith at 35 health each; reinforce is sentinel/soldier at 46/38; ward is sentinel/sentinel at 46 each. Enemies start at strength 2 and step 0, in listed order. The three main encounters do not Howl.

Control permanently adds threshold strength after each one-shot end-turn trigger. Candidate unlocks at end turn and derives bonus strength at each actual attack while Dread is high enough. Fury is +2 at 4 and +3 at 8. Reinforce summons once at 4 and adds +3 at 8. Ward grants block once at 4 and adds +4 at 8. Suppression never reverses or repeats summons/block. Howl can reactivate an already-unlocked bonus for later enemies, but cannot unlock mid-phase.

The campaign predeclares `ember-v02-a` and `ember-v02-b` as opening seeds. Run all 3 decks × 3 encounters × 2 modes × 4 policies, 144 base fights. Then run the corresponding exposed/defense ablations, 96 fights. Evaluate held-out seeds `ember-v02-heldout-000` through `ember-v02-heldout-099`, 7200 base and 4800 ablation fights. Total is 12,240. Policy weights and budgets do not change after evaluation begins. Reuse the same seed and policy/planning budget for each control/candidate pair. Never compare one mode's idle pilot to another mode's capable pilot as balance evidence.

Ablations replace spark/sacrifice with strike in exposed, or both shield cards with strike in defense, before the same seeded shuffle. Preserve all other slots and resources. Report them separately. These replacements alter damage, Dread and exhaustion as well as their named mechanism, so they do not isolate one causal effect.

The compact campaign export reports each stage/variant/deck/encounter/policy cell, counts and paired candidate-minus-control deltas. Health over all fights includes losses at zero; survivor health is separately labeled. Turns/actions include losses and timeouts and are not human pacing. Counts divided by `n` give outcome rates. Deterministic seed runs are not independent humans; do not attach pseudo-precise confidence intervals. Up to four selected rule-difference pairs retain replay traces; regenerate other traces by config instead of storing thousands of logs.

## Crafted diagnostics stay separate from real fixture evidence

Run `bun test tests/lab/playtest.test.ts tests/lab/playtest-headless.test.ts`.

- Existing rules tests cover exact 4/8 boundaries, suppression/reactivation, one-shot summon/block, Howl ordering with locked and unlocked thresholds, Weak rounding, boss state, lethal interruption and actual draw-cap accounting. These are crafted rule states, not benchmark encounters.
- `crafted-chain` resolves spark → sacrifice → remember. Energy moves from 3 to 5 after paying for remember, Dread reaches 6, three cards are drawn, and both generators exhaust. Reusing a generator is illegal. This demonstrates a finite energy/draw line, not an infinite engine.
- `crafted-shield-line` has two energy, a guarding sentinel with 17 health, upgraded volley, pass and upgraded shield. One-step offense chooses the 14-damage volley; planner finds pass → shield for a 17-damage kill. This demonstrates a multi-action line, not standard-deck win-rate superiority.
- `crafted-heal-delay` has one energy, strike/bread, 60 health and a seven-health wolf about to Howl. Immediate lethal wins at 60; bread → end → strike wins on turn 2 at 65 with two Dread. Change only the wolf phase to attack and the wait leaves 56 health. Both modes have this incentive. This is a concrete local health-versus-turn tradeoff, not evidence that humans stall or that stalling always dominates.

`suppressedAttackDamage` counts only actual pre-block damage after Weak that would have been added if all unlocked threshold bonuses were active at that same instant. Hold Dread, boss health, base strength and prior actions fixed. It is not counterfactual health saved. Full paired fights can change card choices, draws consumed, enemy survival and later actions.

## Automated advancement gates

1. Run `bun test`, `bun run typecheck`, `bun run build`. Baseline before this work was 133 passing tests and 11,414 assertions. Preserve these and the headless isolation/replay/boundary tests. A failure triggers a scoped fix and rerun, not a request for owner time.
2. Finish opening coverage before interpreting held-out results. Engine errors or nondeterministic replays trigger fix/retest. Explicit timeouts remain reported evidence; inspect a replay and fix the pilot or mechanism if it demonstrates a loop. Do not hide them by extending budgets until everything wins.
3. Compare matched outcomes by policy and cell. If results disagree by pilot, retain that disagreement and prioritize a small replayable counterexample. Improve the pilot before tuning numbers based on its obvious mistake. If fixtures never exercise the changed rule, advance to a focused recovery fixture instead of declaring equivalence or waiting for people.
4. Keep candidate isolated until evidence supports the next rule decision. Proceed autonomously with the scoped structural test or fix indicated by evidence, then repeat paired checks. Human enjoyment/usability feedback can redirect that work whenever it arrives; it is not a release checklist item for this engineering iteration.

The normal title screen does not expose the benchmark. For development only, open the Vite dev server with `?benchmark=1` to reveal its entry. Production builds exclude the benchmark screen, even with that query parameter. The CLI remains available independently. The optional rendered smoke is `bun scripts/browser/playtest-browser.ts <local-dev-service-url>` after `amp orb services ensure`; it adds the opt-in parameter itself. It checks benchmark interactions and save isolation, not fun. Later route-health work should carry remaining health between encounters rather than extrapolating these full-health isolated fights.

## Recorded campaign findings

The frozen report is `experiments/playtest-v02/PLAYTEST_V02_RESULTS.json`: 12,240 policy fights in 704.66 seconds, 12,214 wins, 26 losses, zero timeouts/errors. The held-out base matrix alone has 7188 wins and 12 losses across 7200 fights. Exactly one of all 6120 paired fights changes final health: defense/fury/defense policy, `ember-v02-heldout-016`, 68 control versus 70 candidate. Outcomes are identical in every pair. This is poor coverage of recovery, not proof of rule equivalence. Quiet never generates Dread, exposed cannot reduce it, and defense has only courage's one-point reduction.

Policy and ablation findings are stronger than the original rule difference. In `ember-v02-a`, defense/ward's health-heavy policy ends at 45 health in eight turns versus offense/planner at 64 in five. Its trace discards Iron answer after spending energy on protection. Do not nerf defense cards to compensate for that pilot mistake. Across held-out cells, removing exposed's generators reduces mean final health by 0.71–19.22 and caps observed turn card plays at three instead of eight. Removing shield adds 2.57–9.02 mean turns, with health changes from +0.12 to −17.03. These ablations remove card roles and change exposure/exhaustion too; they do not identify a clean numeric tuning target.

## Mixed recovery follow-up

`diagnostic-mixed` is a CLI-only substitution of exposed's two guard with two unseen and its remember with silence. Exact deck: 2 defiance, 2 cinder, 2 resolve, 2 unseen, spark, sacrifice, silence, bread. It is not a fourth original archetype. Substitution preserves IDs, RNG and opening positions. Relative to exposed, it loses four total printed block across the two guard replacements, changes draw-three/+1 Dread into draw-one/−4 Dread, and gains two repeatable −2 Dread effects. Those are confounds when comparing decks. Compare rules within the same mixed fixture.

```sh
bun scripts/lab/playtest-cli.ts fight '{"rules":"candidate","fixture":{"deckId":"exposed","variant":"diagnostic-mixed"},"encounterId":"fury","seed":"ember-v02-recovery-005","policy":"offense"}'
bun scripts/studies/playtest-mixed-campaign.ts > /tmp/ember-v02-mixed.json
jq '.cells[] | {encounter,policy,control,candidate,pairedCandidateMinusControl}' experiments/playtest-v02/PLAYTEST_V02_MIXED_RESULTS.json
```

The follow-up predeclared `ember-v02-recovery-000` through `024`, all three encounters, four unchanged v1 policies and both rules: 600 policy fights. It also ran 600 cross-rule action replays, counted separately, not as additional policy samples. Budgets remained 40 turns, 400 actions, 96 speculative resolves and `belief-v1`. Runtime including replays was 38.04 seconds. `experiments/playtest-v02/PLAYTEST_V02_MIXED_RESULTS.json` retains all paired summaries and six selected trace pairs with first-choice audits.

Each rule won 297/300 and lost 3/300; no policy fight timed out or errored. Candidate reached Dread 4 in 297 fights and 8 in 142, unlocking them in 256 and 69 fights respectively. Forty-three fights suppressed a bonus, producing 58 suppression and 47 reactivation events. Suppressed pre-block damage totaled 173. Candidate improved final health in 28 pairs, worsened it in two, and matched it in 270; outcomes also match in all 300 pairs. Sixteen action traces differ. Mean health over all pairs rises by 0.42, not an estimate of a human benefit.

| Encounter / policy  | Control → candidate mean health | Control → candidate mean turns | Candidate fights suppressing |
| ------------------- | ------------------------------- | ------------------------------ | ---------------------------- |
| Fury / offense      | 49.80 → 50.48                   | 4.08 → 4.00                    | 6/25                         |
| Fury / defense      | 41.92 → 43.20                   | 5.52 → 5.52                    | 14/25                        |
| Fury / dread        | 47.56 → 48.16                   | 4.76 → 4.72                    | 4/25                         |
| Fury / planner      | 50.76 → 50.88                   | 4.36 → 4.32                    | 6/25                         |
| Reinforce / offense | 35.76 → 35.76                   | 6.20 → 6.20                    | 1/25                         |
| Reinforce / defense | 28.76 → 30.04                   | 8.72 → 8.68                    | 3/25                         |
| Reinforce / dread   | 40.28 → 40.52                   | 7.36 → 7.36                    | 2/25                         |
| Reinforce / planner | 40.56 → 40.92                   | 6.84 → 6.84                    | 6/25                         |
| Ward / offense      | 28.24 → 28.24                   | 6.96 → 6.96                    | 0/25                         |
| Ward / defense      | 25.24 → 25.68                   | 8.76 → 8.76                    | 1/25                         |
| Ward / dread        | 26.40 → 26.40                   | 8.68 → 8.68                    | 0/25                         |
| Ward / planner      | 31.60 → 31.60                   | 7.72 → 7.72                    | 0/25                         |

Concrete replayable findings:

- Fury/offense/`ember-v02-recovery-005` uses identical 19-action traces and wins on turn 4 at 41 → 43 health. End turn 1 unlocks at 4; unseen takes Dread 5 → 3 on turn 2; cinder reactivates on turn 4. Four suppressed pre-block damage yields only two extra final health. This is a reachable mixed-fixture recovery line, not a crafted state.
- Reinforce/defense/`ember-v02-recovery-011` ends at 22 → 35. Replaying the entire control sequence under candidate ends at 37, showing both a mechanical benefit and pilot-choice effects. At the first different choice, control plays resolve against a 17-damage attack while candidate attacks against a 14-damage intent. Both choices reproduce from public observations alone.
- Fury/offense/`ember-v02-recovery-023` ends at 44 health/6 turns versus 42/5. Candidate chooses silence rather than unseen on turn 4, then kills before the later bread play in control's sequence. The exact control trace under candidate wins at 46. This is a faster-versus-healthier pilot line, not candidate increasing damage on the same sequence.
- Fury/planner/`ember-v02-recovery-000` ends at 56/6 versus 53/5. At action index 16, control chooses unseen UID 19; candidate chooses bread UID 24. Each exact trace returns the same health under either rule. Hypothetical public-belief planning changes behavior, without an actual candidate damage penalty. A regression test pins both sequences and cross-rule outcomes.

All 600 cross-rule replays accepted their supplied actions without errors. Of those, 593 finish in victory, six in defeat and one ends with combat still running because the other policy's sequence is exhausted. That last result is prefix-censored, not a loss or a claimed win. Trace inequality includes length differences and is not a count of meaningful choices.

Recommendation after v1: **retain candidate for further structural testing; keep adventure unchanged**. Recovery has a demonstrated local benefit and remains conditional on unlocked strength and actual attacks. The one-sample, short-horizon pilots cannot settle optimal play or justify adoption from these small health deltas. The next bounded work is multiple public-belief samples plus end-phase evaluation, and targeted Ward-8 recovery coverage. Preserve v1 as a comparison, use new seeds, and stop once those gaps are answered. Do not retune cards, camps or health recovery from this campaign. Human feedback stays optional steering.

## Bounded v2 and Ward-8 follow-up completed

`planner-v2`, version `public-belief-phase-v2`, keeps three independently shuffled public-information beliefs. It averages the engine's actual projected end phase after each candidate line, including threshold unlocks, Howl ordering, Weak, drains and defeat. It searches up to three card actions with beam width three. Every simulated play and end phase counts toward the configured budget. Budgets below three fall back to end without speculative engine calls. The result method `planV2` exposes its engine-call count for tests.

V2 uses damage plus 18 per net kill and three times health change after the enemy phase, with terminal victory prioritized. It has no candidate-specific reward. Continuations must be legal across all three sampled hands, then the policy replans after the real action. This is conservative about uncertain draws and still short-sighted beyond the current enemy phase. It is not an optimal pilot. V1's policies, weights, default parameters, campaign enumeration and saved reports remain unchanged and selectable.

```sh
bun scripts/lab/playtest-cli.ts fight '{"rules":"candidate","fixture":{"deckId":"exposed","variant":"diagnostic-mixed"},"encounterId":"ward","seed":"ember-v02-phase-004","policy":"planner-v2","planningSeed":"phase-study","searchBudget":256}'
bun scripts/studies/playtest-phase-campaign.ts > /tmp/ember-v02-phase.json
jq '.ward8 | {fixedSequence,branches}' experiments/playtest-v02/PLAYTEST_V02_PHASE_RESULTS.json
```

The predeclared evaluation uses `ember-v02-phase-000` through `009`, exposed/base and diagnostic-mixed, all three encounters, v1 planner/v2 and both rules. Both planners get 256 calls, 40 turns, 400 actions and `phase-study` planning randomness. There are **240 fresh policy fights and 240 separately counted paired replays**. The report also labels 11 diagnostic executions separately: one Ward source fight, two fixed Ward replays, four continuation branches, two prior-adverse policy fights and their two replays. They are not additional held-out samples. Runtime for all of this was 91.64 seconds.

Fresh fights produced 238 wins and two losses, no timeout/error. Each rule has 119 wins and one loss. Of 120 matched pairs, 116 match both health and outcome, four improve health under candidate, and none worsen. All outcomes match. Of the v2 subset, 58/60 pairs match both health and outcome; two gain health. No rules difference appears in exposed/base. Paired replays finish with 237 wins, two losses and one prefix-running result, without illegal actions.

V2 is not uniformly stronger than v1. On exposed/base/reinforce, v1 averages 40.5 health and 5.6 turns, while v2 averages 24.8 and 11.3, under either rule. `ember-v02-phase-002` loses at zero health on turn 12 with v2 in both modes. These are pilot-objective/horizon limitations, not evidence that candidate increases damage. On mixed/fury, v2 averages 50.6 → 51.1 health; on mixed/reinforce 43.8 → 43.8; on mixed/ward 40.9 → 40.9. Ten seeds per cell are a bounded diagnostic, not population estimates. Do not keep optimizing the pilot until a preferred rule wins.

Ward-8 coverage now has both reachable scripted and genuine fresh-fight evidence:

- Reachable line: mixed/ward/defense/`ember-v02-recovery-011` unlocks Ward-8 at Dread 9 on turn 2. Unseen reduces 9 → 7 on turn 4. The exact 31-action sequence wins at 25 control versus 36 candidate health, with 12 suppressed pre-block damage and no repeated ward grant.
- Reachable continuation: replay the first 15 actions of that line, reaching turn 4, 51 health, two energy and Dread 9. V2 chooses unseen in both modes and wins at 44 → 48 health on turn 6. V1 starts with cinder and wins at 39 → 39. This is a shared reachable-state comparison, not a fresh-fight win-rate sample. The report retains the complete prefix and all continuation traces.
- Genuine fresh fight: mixed/ward/v1 planner/`ember-v02-phase-004` wins at 34 → 37 health on turn 7 with the same 28 actions. V2 does not trigger a realized Ward recovery benefit in this small fresh set. That does not erase the reachable line.
- Previously adverse mixed/fury/`ember-v02-recovery-000` now ends at 53 health on turn 5 with v2 under either rule; swapping complete sequences also gives 53. This is a recheck of a known case, not held-out evidence.

**Final rule recommendation: leave current Dread in adventure and retain candidate as an isolated experiment.** Candidate's reversible strength works and can buy health after recovery, including Ward-8. The original decks rarely use it, the mixed/planner studies do not change outcomes, and pilot sequence effects are larger than the observed typical rule benefit. That does not justify adding candidate's state complexity to adventure now. The requested coverage gaps are answered, so stop this bot-tuning workstream. Continue other scoped improvements without a human-testing gate; optional owner feedback can reopen the rule choice. No card, enemy, camp, persistent-health or adventure tuning was made here.
