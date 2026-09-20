# Autonomous card-game laboratory

## Scope and design foundation

This repository implements **The Last Ember, a solo deckbuilding adventure**, not
a two-player competitive card game. The laboratory preserves that identity. Its
matrix compares decks against encounters, and its ladder compares policies on
matched seeds. Starting-player advantage, opponent hidden hands, PvP counterspells,
and competitive deck win rates do not exist in these rules.

- Players enjoy the intended activity of sequencing a shared fellowship deck,
  answering visible enemy threats, and deciding when powerful magic is worth exposure.
  This is an inferred design promise, not a measurement of enjoyment.
- A player wins by defeating the final boss and lighting the beacon. Zero party
  health loses. Benchmark fights instead stop after defeating their fixed enemies.
- A player cannot do everything because energy, hand access, persistent health,
  and Dread consequences limit actions. Discard exhaustion reshuffles; it is not fatigue.
- The usual tension is immediate damage versus protection, and power now versus
  exposure at the enemy phase. Route recovery competes with permanent upgrades.
- Expected skill includes sequencing, target selection, threat prediction,
  resource management, deck construction, and timing threshold suppression.

## Architecture and machine decisions

`src/game/model.ts` defines `Run`, card-instance UIDs, discriminated scenes, and
`Action`. `src/game/content/` owns printed effects and enemy patterns.
`src/game/engine/resolve.ts` owns legality and all state transitions. `resolve` clones its
input, validates the action, applies ordered effects, and returns canonical state
plus presentation snapshots. Invalid actions leave input unchanged. A stored LCG
state supplies gameplay randomness. JSON plus the existing Zod save boundary
supports persistence. No browser, timer, or keyboard is required for rules.

All decisions already had action representations: travel, play/target, end turn,
reward/skip, camp rest/upgrade, event choice, merchant purchase/removal, and leave.
There are no mulligans, player-controlled enemy phases, reaction interrupts, or
discard-order decisions in the current rules.

The laboratory extends the existing `playtest-headless.ts`, fixed fixtures,
observation allowlist, belief planners, and isolated `control`/`candidate` modes.
It does not replace them or change adventure saves. `journeyLegalActions` enumerates
noncombat candidates and filters them through `resolve`. Combat actions use the
existing generator, with acceptance and purity checked against the engine in tests.

Policies receive public observations and legal actions, never the authoritative
Run. Observations exclude RNG, seed, allocator state and draw order. Unordered pile
composition and repeating enemy patterns are public in this game. Search creates
independently shuffled belief states from those observations. The journey policy
also gets only public route, scene, deck, resources, and relic information.

Analysis is separate from rules and policy. `laboratory.ts` runs and measures
benchmark fights; `laboratory-journey.ts` drives whole adventures;
`scripts/lab/lab.ts` provides CLI boundaries; `scripts/reports/lab-report.py` analyzes JSONL.
The historical test-only journey pilot remains available but is not used for the
new ladder because its input boundary accepts true state.

## Run the laboratory

Use Bun with installed repository dependencies and Python 3 for prose reports.
No new package dependency or service is needed. Commands run from the repository root.

```sh
# One autonomous fixed fight. Exact generated seed is demo:0.
bun scripts/lab/lab.ts simulate --games 1 --seed demo --deck exposed --encounter fury --bot search > /tmp/one.jsonl

# A complete adventure, using the normal starter deck and normal adventure rules.
bun scripts/lab/lab.ts journey --games 1 --seed journey --bot strategic

# Scales to 100, 1000, 10000 or more. Output is streamed, one result per line.
bun scripts/lab/lab.ts simulate --games 10000 --seed campaign --bot greedy --quiet > /tmp/results.jsonl

# --games is per deck/encounter/bot cell for suites, not total games.
bun scripts/lab/lab.ts suite --suite smoke --games 1 --seed smoke > /tmp/smoke.jsonl
bun scripts/lab/lab.ts suite --suite balance --games 100 --seed lab-baseline-v1 > /tmp/balance.jsonl
bun scripts/lab/lab.ts suite --suite stress --games 1120 --seed lab-stress-v1 > /tmp/stress.jsonl
bun scripts/lab/lab.ts suite --suite exploit --games 40 --seed lab-exploit-v1 > /tmp/exploit.jsonl
bun scripts/lab/lab.ts suite --suite regression --games 2 --seed regression > /tmp/regression.jsonl
bun scripts/lab/lab.ts suite --suite experiments --games 50 --seed lab-experiment-v1 > /tmp/experiments.jsonl

# Machine summary with per-cell Wilson intervals; human-readable descriptive report.
bun scripts/lab/lab.ts analyze < /tmp/balance.jsonl > /tmp/summary.json
python3 scripts/reports/lab-report.py /tmp/balance.jsonl > /tmp/report.md

# Full before/after true state, legal actions, and selected action. Never feed
# this debug export to a policy. Supply the exact seed, bot, fixture and rules.
bun scripts/lab/lab.ts replay --seed lab-baseline-v1:7 --deck quiet --encounter reinforce --bot search > /tmp/replay.json

# Reproduce the policy-only intervention and pair it against original Search.
bun scripts/lab/lab.ts suite --suite smoke --bot search-tempo --games 100 --seed lab-baseline-v1 > /tmp/tempo.jsonl
python3 scripts/reports/lab-report.py /tmp/balance.jsonl /tmp/tempo.jsonl --pair bot --control search --candidate search-tempo

# The experiments suite includes mixed-deck control/candidate pairs.
python3 scripts/reports/lab-report.py /tmp/experiments.jsonl --pair rules --control control --candidate candidate
python3 scripts/reports/lab-report.py /tmp/experiments.jsonl --pair variant --control base --candidate ablation

bun test
bun run build
```

`balance` has 36 cells, `stress` 9, `exploit` 27, and `experiments` 21.
Smoke/regression have 9. Regression runs every configured fight twice and compares
complete results. Regression tests also replay accepted actions through the engine.
No parallel flag is provided; sequential execution preserves straightforward seed
reproducibility. Independent CLI processes can run independent campaigns.

Benchmark deck choices are `quiet`, `exposed`, `defense`; encounter choices are
`fury`, `reinforce`, `ward`. The default rule is `control`, matching adventure combat.
`candidate` is the existing experimental rule that suppresses previously unlocked
threshold strength while Dread is below that threshold. Summons/block still happen
once. `--variant ablation` removes exposed generators or defense's shield attacks
by substituting strike; `--variant diagnostic-mixed` applies only to exposed and
adds concealment in fixed slots. These are diagnostic decks, not legal deckbuilding
changes made by a bot mid-game.

`--budget` sets speculative engine-call budget, default 256. Existing limits are
40 turns and 400 actions; API config allows up to 200 turns and 2000 actions.
Timeouts are censored results, not losses. Malformed CLI inputs exit nonzero.
Simulation failures print the complete configuration and error before stopping.
Raw output contains all traces and compact per-action telemetry, but full state
snapshots are only emitted by replay. Retain raw JSONL with the source revision.
Seed replay regenerates the policy line with the current code; historical trace
replay through `resolve` is the stronger check across policy revisions.

Journey mode uses the normal starter deck, progression rules and 2000-action cap.
Benchmark deck/encounter/rules flags do not configure the journey. It records the
complete action trace and run statistics, but does not yet collect the full combat
telemetry schema across every journey encounter. Reproduce journey batches by seed,
bot and budget; replay their recorded `Action[]` starting from `newRun(seed)`.

## Policies and their limits

| Bot | Decision rule |
|---|---|
| random | Deterministic pseudo-random choice among legal actions, including end. |
| greedy | Existing one-step offense heuristic, valuing damage, kills, energy and modest protection. |
| strategic | Existing three-action beam planner with threshold and defense evaluation. |
| search | Existing three-belief, bounded beam planner that projects the actual enemy phase. |
| search-tempo | Same search with health weight 1.5 instead of 3, isolated policy experiment. |
| burst | Alias for greedy's offense policy, not an independent reasoning algorithm. |
| resource | Plays affordable energy generators first, then follows greedy. |
| stall | Avoids damage cards, plays non-damage effects, then ends. A termination probe, not a win policy. |

Search is bounded, not optimal. Speculative draws are belief samples, not future
knowledge. The original planner policies retain their defaults and historical
results. The new tempo parameter does not alter the original Search policy.
Progression has one fixed public heuristic shared by all journey combat bots.
It is intentionally not a calibrated deck-construction agent.

To add a bot, extend `botSchema` and `selectAction`. Accept only Observation and
legal actions; do not pass in Run, seed-derived gameplay RNG, or detailed replays.
Add hidden-state invariance and replay tests, then compare held-out seeds.
To add a metric, derive it from accepted actions, accounting or ordered snapshots
in `simulate`, extend reporting, and add an independent arithmetic test. Never let
telemetry change policy decisions or rules.

## Measurement definitions and cautions

- Energy generated includes the opening 3, refills after surviving enemy phases,
  and explicit energy effects. Spent includes printed costs. Unused counts explicit
  ends, not leftover energy on a winning play.
- Draw counts include opening and repeated draws; retained cards are not new draws.
  Per-card held/playable counts are decision exposures, not unique turns or games.
- Damage received and blocked use actual enemy-effect snapshots. First interaction
  means first attack/drain, not a PvP response window. Block, target selection and
  kills are the game's main interaction proxies.
- Non-game signal means at least three consecutive pass-only turns or loss by turn
  2. It includes intentional random/stall passes. Forced-pass turns separately mean
  no legal card play was available at any decision of that completed turn.
- Repeated-state warnings intentionally omit some state and do not prove loops.
  Current free energy/draw generators exhaust; ordinary draw costs energy. Individual
  effects terminate. Arbitrary repeated turns have no engine-level termination proof.
- `comeback` in raw lab-1 telemetry means win after reaching <=20 HP. Reports label
  it as low-health survival, not a demonstrated comeback. The richer report separately
  uses HP/70 minus enemy HP/initial enemy HP, with +/-0.25 thresholds, for attrition
  and recovery proxies. That score omits hand, block, energy, intent and future draws.
- Wilson intervals apply to individual sampled-seed cells. Paired HP intervals use
  seed-cluster means so repeated encounters do not masquerade as independent seeds.
  Seeds are deterministic simulated cases, not independent human participants.
- Legal action counts do not establish meaningful choices. No calibrated action-value
  model or competitive-action entropy is claimed. Card play/draw win rates are biased
  by deck, state and policy selection; use ablations and replay before making changes.
- Computer runtime and turn counts do not measure human duration or fun.

## Protect and expand the existing mechanics

Protect delayed Dread thresholds, visible intentions, shared resources, order-sensitive
block-to-damage conversion, conditional high/low-Dread payoffs, exhaust-limited bursts,
and persistent-health recovery choices. These supply horizontal choices beyond raw
damage numbers and give existing decks different tactical patterns.

The current effect union, ordered effects, conditionals, per-hit bonuses, enemy
patterns, relic hooks, retain and exhaust support more combinations without a new
engine. They do not yet support attachments, positional combat, interrupts, arbitrary
triggers, transformations, or alternate victory conditions. Hundreds of cards would
need explicit timing/target contracts and automated redundancy tests, not a generic
scripting layer added speculatively. Particular expansion risks are free reusable
draw/energy loops, repeated per-hit relic amplification, retain filling the hand,
and encounter-reset healing making safe fights disproportionately valuable.

## Recorded campaign, lab-1

Executed 16,710 benchmark fights and 80 complete-journey attempts, separately from
unit tests, six selected detailed replays, and 18 twice-executed regression cases.
No campaign engine error, invariant failure, benchmark timeout, repeated-state
warning, or per-card draw-accounting mismatch occurred.

| Campaign | Games | Seed prefix and sample |
|---|---:|---|
| Baseline ladder | 3,600 | `lab-baseline-v1:0` through `:99`, 100 per 36 cells |
| Random stress | 10,080 | `lab-stress-v1:0` through `:1119`, 1,120 per 9 cells |
| Adversarial | 1,080 | `lab-exploit-v1:0` through `:39`, 40 per 27 cells |
| Rule/deck experiments | 1,050 | `lab-experiment-v1:0` through `:49`, 50 per 21 cells |
| Tempo policy intervention | 900 | Same 100 baseline seeds across 9 cells |
| Journeys | 80 | `lab-journey-v1:0` through `:19`, four combat bots |

Planning streams are `policy:<complete-game-seed>:<action-index>` for benchmark
fights, domain-separated from gameplay RNG. Match deck, encounter, seed and budget
when comparing policies. All benchmark experiments used budget 256. Adventure
progression policy was fixed while combat policies changed.

### Decisions matter, but benchmark victories saturate

| Policy | Benchmark wins / 900 | Mean final HP, including losses | Journey wins / 20 |
|---|---:|---:|---:|
| Random | 85 | 1.82 | not run |
| Greedy | 900 | 46.72 | 5 |
| Strategic | 900 | 51.51 | 16 |
| Search | 898 | 49.65 | 18 |
| Search-tempo, intervention | 900 | 48.99 | 18 |

The gap from random to purposeful play is large. Strategic preserves more health
than Greedy, and both planners substantially outperform Greedy on these full
journeys. Twenty seeds do not establish a reliable ranking between the planners.
Search is not uniformly stronger than Strategic. Fixed full-health fights are too
easy for victory alone to discriminate capable policies.

Search's deck-versus-encounter matrix, each cell 100 games:

| Deck | Fury | Reinforce | Ward |
|---|---|---|---|
| Quiet | 100 wins, HP 40.06 | 100 wins, HP 44.85 | 100 wins, HP 33.22 |
| Exposed | 100 wins, HP 56.43 | 98 wins, HP 26.79 | 100 wins, HP 45.93 |
| Defense | 100 wins, HP 68.51 | 100 wins, HP 66.89 | 100 wins, HP 64.21 |

A 100/100 cell has Wilson 95% interval approximately 96.3–100%, not certainty of
universal success. Exposed/reinforce's poor Search result is policy-dependent:
Strategic wins 100/100 at mean 45.09 HP. Do not label exposed structurally weak.

Among 2,700 capable-policy baseline fights, there were zero non-game signals or
forced-pass full turns. Mean generated/spent/unused energy was 17.65/16.27/0.42;
mean actual received/blocked damage was 23.30/47.99. First damage was on turn 1
at the median and turn 2 at p95. Every fixture's first enemy attack was turn 1.
Mean legal actions per decision was 4.74, which does not measure meaningful choice.
Fight turns had Q1/median/Q3 of 4/5/6, p95 8, and range 3–18. Actions had
Q1/median/Q3 of 17/22/26, p95 35, and range 10–64. These include losses and
describe machine-controlled benchmark fights, not whole-journey human pacing.

All four baseline non-game flags came from Random. The larger random stress run
had 1,085 wins, 8,995 losses, and 38 non-game flags. All 360 adversarial Stall fights
lost; the 360 Burst and 360 Resource fights all won. No arbitrary-state no-loop
theorem follows from these samples.

The attrition score found 100 capable-policy games with a deficit below -0.25,
of which 99 eventually won. This high recovery rate also exposes the score's limits:
low HP relative to enemy HP need not mean a strategically losing position. Do not
interpret it as proof of either healthy comebacks or weak snowballing.

### Investigation 1: short-horizon defense, major evaluation limitation

Observation: Search loses exposed/reinforce seeds `lab-baseline-v1:39` and `:46`,
while Greedy and Strategic win both. Quiet/reinforce `:7` finishes at 29 HP/turn 8
with Search, versus 55 HP/turn 5 with Strategic.

Replay diagnosis: Search spends heavily on immediate defense, delays kills, and
sometimes burns exhaust energy with no follow-up play. On exposed/reinforce `:39`
it ends turn 1 with two unused energy after playing Sacrifice. It remains at Dread
3 for most of the game, then raises Dread and dies on turn 12. This is a policy
horizon/value problem, not an engine violation or proof that defense is unhealthy.

Hypothesis: reducing immediate health preference lets damage prevent future phases.
Control was unchanged Search, intervention was health weight 3 -> 1.5, with identical
budget and seeds. Across 900 paired fights, tempo gained two wins and lost none,
shortened games by 0.633 turns, but reduced final HP by 0.668. Seed-cluster approximate
95% HP interval was [-1.245, -0.091]. HP improved/tied/worsened in 235/311/354 pairs.
The 20 paired journeys remained 18 wins each, with mean HP falling 43.80 -> 39.85.
Seed `:39` changes from loss/turn 12 to win/21 HP/turn 13, a rescue rather than a
uniformly faster strategy.

Decision: **reject as a universal replacement; retain as an experimental policy**.
Changing a weight does not repair the planning horizon. No game rule changed.
Preserve the original failure and intervention in regression tests.

### Investigation 2: defense payoff concentration, moderate design risk

Observation: defense ends all Search cells above 64 mean HP. Its block-to-damage
conversion may be doing most of the work, rather than defensive cards alone.

Control: base defense. Intervention: replace both Iron answer cards with Strike,
preserving slots/shuffle and everything else. Across 150 matched fights, both arms
won every fight, but the intervention cost 6.28 mean HP and added 6.287 turns.
Seed-cluster approximate HP interval was [-7.403, -5.157].

Replay `lab-experiment-v1:16`, defense/ward: control wins at 69 HP/turn 7; ablation
at 27 HP/turn 19. On turn 2, control uses Pass -> Pass -> Guard -> Rally -> Shield,
dealing 36 HP damage with the accumulated block. The ablation deals seven damage
with Strike and continues taking enemy phases. This is identifiable sequencing
value, not evidence that every defense card needs a nerf.

Decision: **reject removal/nerf based on these measurements; protect the conversion**.
Investigate dependence on finding the payoff during real deck construction. Ablation
changes several card properties and cannot identify a correct numeric nerf.

The separate exposed generator ablation also cost 6.30 mean HP across 150 pairs,
with approximate interval [-8.931, -3.669], but shortened fights by 0.447 turns under
Search. This mixed pacing effect is another warning about policy confounding.

### Investigation 3: Dread recovery has narrow coverage, moderate unresolved design issue

Observation: the original decks poorly expose recovery. Quiet does not raise its
own Dread, exposed cannot lower it, and defense has only a small reduction. Low use
of concealment in such fixtures cannot establish that concealment is badly designed.

Control: mixed exposed deck with ordinary permanent threshold strength.
Intervention: exactly the same deck with the existing candidate suppression rule.
Across 150 paired fights, all won under both rules. Candidate gained 0.280 mean HP,
approximate seed-cluster interval [0.053, 0.507], and added 0.033 turns. HP was
better/tied/worse in 12/134/4 pairs. Most fights did not produce a health difference.

Replay `lab-experiment-v1:9`, mixed exposed/ward, isolates the mechanism: both
policies select exactly the same complete action sequence. Turn 2 unlocks both
thresholds at Dread 9. Turn 3 lowers Dread to 5. Candidate loses 8 rather than 16 HP
that phase, then avoids another 3 HP on turn 4. Both win on turn 8, at 50 versus
39 HP. This is actual health saved, not merely pre-block suppression telemetry.

Decision: **investigate further; do not promote candidate into adventure**.
The mechanism works, but frequency and long-term opportunity costs are unresolved.
Keep high-Dread payoffs and one-shot threshold identity while testing recovery.

### Engine bugs, retained changes and remaining work

No reproducible engine bug was found. Existing timing/card tests plus the new
fuzz, zone corruption, observation isolation, legal-action acceptance, serialization,
CLI, report-pairing and replay regressions pass. Final verification: **171 tests,
34,475 assertions, zero failures**, plus typecheck and production build. The
18-case deterministic regression suite also passes. No visual game code changed.

Retained changes are the laboratory, public-only journey driver, metrics/reporting,
regression seeds, and optional tempo policy. Adventure numbers, rules, cards, routes,
and save format remain unchanged. No changes were pushed or published.

This iteration does not establish human fun, a calibrated meaningful-action metric,
optimal play, broad deck-construction balance, or termination for arbitrary card
sets. Journey telemetry is less detailed than benchmark telemetry. No adversarial
deck generator, MCTS/RL agent, generalized new-rule configuration system, or automated
code-editing outer loop was added. The reusable suite/report/replay commands support
another autonomous agent running the next investigation without a human player.

The single next experiment should evaluate a two-enemy-phase public-belief planner
against current Search on held-out full journeys, holding progression fixed. Test
whether delayed kill value and avoiding wasted exhaust energy improve survival
without the HP tradeoff caused by lowering the immediate-health weight. Improve
that decision-maker before tuning the game around its mistakes.

## Two-phase follow-up, horizon-v2

This follow-up tests the preceding recommendation, without changing any game rule
or the fixed progression policy. Predeclared held-out seeds are `lab-horizon-v2:0`
through `:49`. Four arms use the same 50 seeds: original Search at budget 256,
original Search at 4096, one-phase rollout at 4096, and two-phase rollout at 4096.
The primary outcome is journey victory. Secondary outcomes are final HP including
deaths at zero, actions, unused energy, and speculative engine calls. Do not retune
the policies on these seeds and then describe them as held out.

The new `rollout-one` and `search-two` policies evaluate every root legal action
over three independent public-belief states. Their continuation policy is the
unchanged one-step offense heuristic, receiving a fresh public observation after
each simulated transition. It can play the next turn's newly drawn cards. Both
use the same terminal utility and health weight 3. Only the number of enemy phases
in their rollout endpoint differs. Against original Search, both horizon and
continuation algorithm differ, which is why the one-phase ablation is required.

Every speculative `resolve` call counts against the budget, including greedy
continuation evaluations and an original-Search fallback capped at 256 calls.
Remaining calls are divided equally across root actions and samples. A root action
is scored only if all three samples reach the requested horizon or terminate.
Incomplete candidates are excluded; if none complete, the original action is used.
Incomplete-decision counts must accompany results because exclusion can bias the
remaining root choices. Defaults remain unchanged; use `--budget 4096` for these
rollout experiments. The lab accepts up to 8192; the historical headless CLI retains
its 256-call limit and frozen policy defaults.

Journey records now include compact combat decisions, speculative call totals,
incomplete-candidate counts, unused energy at explicit ends, and a generator-unused
upper bound. The latter is the sum of min(card-generated energy this turn, remaining
energy at end); it cannot establish that those generators were tactically wasted.
Exact draw streams, reward offers and routes may diverge after combat choices change.
Holding the progression policy fixed does not force identical progression actions.

```sh
bun scripts/lab/lab.ts journey --games 50 --seed lab-horizon-v2 --bot search --budget 256 > /tmp/horizon-search256.jsonl
bun scripts/lab/lab.ts journey --games 50 --seed lab-horizon-v2 --bot search --budget 4096 > /tmp/horizon-search4096.jsonl
bun scripts/lab/lab.ts journey --games 50 --seed lab-horizon-v2 --bot rollout-one --budget 4096 > /tmp/horizon-one.jsonl
bun scripts/lab/lab.ts journey --games 50 --seed lab-horizon-v2 --bot search-two --budget 4096 > /tmp/horizon-two.jsonl
python3 scripts/reports/lab-report.py --journeys /tmp/horizon-search256.jsonl /tmp/horizon-search4096.jsonl /tmp/horizon-one.jsonl /tmp/horizon-two.jsonl
bun test tests/lab/laboratory-horizon.test.ts
```

Tests independently verify a guarding sentinel followed by its 17-damage attack:
the second-turn policy plays a newly drawn 7-block card, producing exactly 10 health
lost. Omitting the second enemy phase or blindly passing it fails this test.
Budget tests include all continuation calls, and hidden draw-order/RNG mutations
must leave evaluations unchanged. Original Search regression expectations remain.

### Result: reject promotion of the two-phase rollout

All 200 journeys completed, with zero errors, timeouts or invariant failures.
Every rollout root completed all three belief samples. No incomplete-candidate
exclusion affected this campaign. Seeds were not used to retune either policy.

| Policy | Budget | Wins / journeys | Mean final HP, including deaths | Mean speculative calls |
|---|---:|---:|---:|---:|
| Original Search | 256 | 49/50 | 52.24 | 15,446 |
| Original Search | 4096 | 49/50 | 52.12 | 15,563 |
| One-phase rollout | 4096 | 44/50 | 45.14 | 34,574 |
| Two-phase rollout | 4096 | 40/50 | 32.08 | 81,328 |

Against Search/256, the two-phase policy lost ten seeds that Search won and rescued
one Search loss. Its paired HP difference was -20.16, approximate 95% interval
[-29.03, -11.29]. The exact discordant-win sign test gives p=0.0117, exploratory
and unadjusted for multiple comparisons. It used 5.27 times as many speculative
engine calls. Win Wilson 95% intervals are 89.5% to 99.6% for Search and 67.0% to
88.8% for two-phase. Fifty seeds do not establish precise general win rates.

The horizon-only comparison also failed to support promotion. Two-phase lost nine
one-phase wins and rescued five one-phase losses, with paired win p=0.4240. Mean
HP fell 13.06, paired interval [-22.64, -3.48]. Thus the win evidence does not
isolate a reliable horizon-only effect, although the health outcome deteriorated.
Both new policies also change continuation and tie-breaking relative to Search.

Unused energy increased from 0.78 per journey for Search to 8.80 for two-phase.
The generator-unused upper bound was 0.54 versus 0.56. These figures do not
support the proposed improvement in energy use. Larger Search budgets barely
changed actual computation because its beam depth and width remain fixed.

### Replay diagnosis: policy failures, not a reason to rebalance cards

Replayed all actions for seeds `lab-horizon-v2:4`, `:5` and `:13` under Search,
one-phase and two-phase. Each action matched engine-generated legal actions;
replayed final HP and outcomes matched the saved records. Public before/after
observations, legal choices and first-divergence evaluations are preserved in
`.amp/in/artifacts/horizon/replay-{4,5,13}.json`.

* Seed `:4`: two-phase predicts a two-turn kill in all three beliefs after opening
  with Hold the pass against a howling stag. Its score is 100,210 versus 66,803 for
  True shot. Actual replanning takes four turns and loses 4 HP; Search takes two
  turns without health loss. Two-phase eventually loses the journey, Search wins
  with 43 HP. The huge terminal bonus makes small sampled kill-frequency changes
  dominate ordinary damage/health values. This is a plausible policy weakness,
  not proof that this opening alone caused the final loss.
* Seed `:5`: two-phase rescues Search's only lost journey, finishing with 30 HP.
  Its first fight actually ends with 67 HP versus Search's 70 HP. Later decks,
  rewards and routes diverge, so this is not evidence that sacrificing 3 HP in
  the opening caused the rescue.
* Seed `:13`: two-phase loses to the Marshal after repeatedly passing on guard
  turns, including turns 2, 5 and 8 with all 3 energy. At turn 2, index 119, it
  scores passing at 0 and attacking roots at -31 or -38 under greedy continuation.
  It cannot choose a different continuation sequence for the same root action.
  Search instead opens with Ancient flame.

For the last case, an additional diagnostic held the **entire actual state fixed**
at index 119, including deck, health, relics and engine RNG. Each bot continued
only that fight using public observations and the same indexed policy seeds.
Search won with 41 HP in 48 actions; one-phase won with 16 HP in 47 actions;
two-phase died in 70 actions. The two-phase branch reproduces the recorded loss.
This isolates a combat-policy failure from progression differences, but does not
isolate which evaluator or continuation change would fix it. The full branches
are in `.amp/in/artifacts/horizon/marshal-counterfactual.json`.

Decision: **REJECT** either rollout as a replacement for Search. Retain both as
explicit experimental policies, the instrumentation and the diagnostic records.
Keep the original Search defaults and all game rules unchanged. No engine bug was
found. Do not weaken the Marshal or remove Dread consequences to accommodate this
bot. Protect the existing defense-to-damage sequencing and Dread tradeoffs.

Verification: `bun test` reports **175 pass, 0 fail, 34,636 assertions**;
`bun run build` passes typechecking and the production build. New tests cover
second-phase execution, future draw decisions, call budgets, hidden-information
isolation, matched seed/budget reporting, duplicate rejection and call accounting.

Campaign data and reports are under `.amp/in/artifacts/horizon/`. The initial
source hash for `laboratory.ts` precedes restoration of its API default budget
from 256 to the original 96. Every campaign arm supplies an explicit budget, so
that restoration cannot change these results. Final source hashes accompany the
archive. The planner and journey-driver hashes remained unchanged during runs.

To regenerate a single recorded journey, preserving its exact seed:

```sh
bun -e 'import {simulateJourney} from "./src/game/laboratory-journey"; console.log(JSON.stringify(simulateJourney("lab-horizon-v2:13", "search-two", 4096)))'
```

The next experiment should change **only the rollout continuation policy** from
one-step offense to bounded sequence search, keeping two phases, three beliefs and
the endpoint evaluator fixed. First test the saved Marshal state and both opening
examples, then compare against the frozen two-phase policy on fresh journey seeds
with matched compute budgets. This tests whether the rollout rejects useful root
actions because it assumes poor follow-up play. Terminal-utility calibration is
a separate hypothesis and should not change in that experiment.

## Autonomous follow-up: continuation, utility, rewards and exploit bounds

The follow-up evaluates three independent policy interventions and broadens engine
stress coverage. No game card, rule, reward offer, route or save format changes.
Defaults remain original Search and static progression. Experimental policies
are explicit CLI choices, not claims that they are stronger.

### Sequence continuation, lab-continuation-v3

Hypothesis: greedy follow-up play makes the two-phase rollout reject useful root
actions. `search-sequence` replaces only its continuation with public-belief
`planV2`, capped at 96 speculative calls per subsequent decision. The two enemy
phases, three root beliefs, health weight and terminal evaluator stay fixed.
Nested calls count toward the outer budget. A full continuation allowance must
fit before another simulated move begins; incomplete roots are not compared.

The saved Marshal checkpoint, `lab-horizon-v2:13`, action index 119, isolates the
effect without changing progression. Greedy two-phase died; sequence continuation
wins with 23 HP in 54 actions. Original Search wins with 41 HP in 48 actions.
Sequence also clears the saved stag opening with 70 HP in six actions, compared
with greedy rollout's 66 HP in 15 actions. It clears the raider opening with 67 HP.
These development cases justified a separate fresh campaign, not promotion.

Predeclared campaign: 20 identical seeds `lab-continuation-v3:0` through `:19` for
Search, `search-two` and `search-sequence`, each with a 32,768-call ceiling.
The lab budget cap was raised to support this experiment; defaults and the
historical headless CLI budget limit are unchanged.

| Policy | Wins / journeys | Mean final HP | Mean speculative calls |
|---|---:|---:|---:|
| Original Search | 20/20 | 55.95 | 14,572 |
| Greedy two-phase | 15/20 | 30.40 | 75,342 |
| Sequence two-phase | 20/20 | 46.05 | 674,334 |

Sequence rescues all five greedy-rollout losses with no new loss. Its paired HP
gain is 15.65, approximate 95% interval [3.00, 28.30]; paired win p=0.0625,
exploratory and unadjusted. Against original Search, however, it gains no wins,
loses 9.90 mean HP, paired interval [-19.28, -0.52], adds 22.35 actions and uses
46.27 times as many speculative calls. All roots completed, with no errors or
timeouts. A 20/20 sample still has a Wilson 95% lower win bound of only 83.9%.

Fresh replay `lab-continuation-v3:3` matches all three recorded trajectories.
Greedy two-phase dies to the Marshal on turn 21; sequence wins the journey with
40 HP, original Search with 61 HP. Sequence finishes the opening wolves with
68 HP versus greedy rollout's 67 HP, so that opening difference does not explain
the whole-journey rescue. The saved-state Marshal comparison above is stronger
evidence for the continuation mechanism than the aggregate journey result alone.

Decision: **keep as a diagnostic policy; reject default promotion**. The
continuation hypothesis has support, but improved reasoning inside this rollout
does not beat the simpler Search policy. Do not retune game balance around the
weak greedy continuation or spend more computation merely to make its win rate
match an already stronger baseline.

A separate fixed-state sensitivity check varied only the planner's belief seed,
12 times on each of the saved stag, Marshal and fresh wolf checkpoints. Original
Search chose the same card/target class 12/12 times at every checkpoint. Greedy
two-phase chose to pass at the Marshal 11/12 times. Sequence continuation chose
four different card classes at the stag and four at the Marshal. These selected
states do not estimate typical policy entropy, and distinct choices may have
similar value. They do show why variation in bot choices must not be attributed
automatically to the game's RNG. Raw counts are in `continuation/seed-sensitivity.json`.

### Terminal utility, lab-utility-v4

Hypothesis: the 100,000-point win jump lets small sampled kill-frequency changes
overwhelm health preservation. `search-material` changes only the two-phase root
endpoint's win valuation. A victory scores removed enemy HP, 18 per removed living
enemy, and three times health change, on the same scale as nonterminal states.
Defeat remains -100,000. Greedy continuation and all other rollout settings stay
fixed. This is independent of the sequence-continuation experiment.

Thirty fresh matched seeds, `lab-utility-v4:0` through `:29`, budget 4096:

| Policy | Wins / journeys | Mean final HP | Mean speculative calls |
|---|---:|---:|---:|
| Original Search | 30/30 | 56.37 | 15,070 |
| Greedy two-phase | 21/30 | 30.90 | 78,657 |
| Material two-phase | 26/30 | 48.43 | 80,545 |

Material rescued eight greedy-rollout losses and introduced three losses. Paired
HP improved 17.53, approximate 95% interval [7.07, 27.99]. The paired win sign-test
is p=0.2266, exploratory and unadjusted, so the win evidence is not conclusive.
All roots completed; there were no errors or timeouts. Original Search still won
all 30 and used about one fifth of the computation.

Both the saved stag and Marshal failure cases remain failures of this policy:
it wins the stag at 66 HP and loses to the Marshal. Fresh replays explain a more
useful distinction. On `lab-utility-v4:1`, index 5, material chooses Hold the pass
over the attack whose sampled kills receive 100,159 points. From that same actual
state, material wins the fight with 62 HP versus 53 for greedy two-phase.
On `:5`, index 56, material chooses Shared bread over an attack. Both win the fight,
at 59 versus 60 HP. Material later loses that journey, but the first divergent
fight is not enough to explain the final loss. Full checkpoint branches and root
evaluations are preserved under `.amp/in/artifacts/utility/`.

Decision: retain the material policy as a diagnostic alternative, **reject it as
the default**. Its improvement over a weak rollout does not establish superiority
over Search. Do not combine it with other changes and attribute the result to
terminal scoring alone.

### One Iron Answer reward, lab-shield-v5

Source inspection found that the static reward scorer rates Iron Answer by its
printed three damage, ignoring block conversion, and therefore skips it. The
starting journey deck already contains five block cards. The small intervention
`--progression shield-aware` takes an offered Iron Answer if the deck has none.
All subsequent scoring, shopping, upgrade selection and combat planning remain
unchanged. This tests a specific payoff preference, not general deck optimization.

Fifty matched seeds `lab-shield-v5:0` through `:49`, original Search at budget 256:

| Progression | Wins / journeys | Mean final HP | Mean action change |
|---|---:|---:|---:|
| Static | 47/50 | 48.70 | reference |
| One Iron Answer | 47/50 | 49.40 | -3.96 |

The candidate rescues two losses and introduces two others. Paired HP difference
is +0.70, approximate 95% interval [-5.79, 7.19]; paired win p=1.0. There is no
evidence for a universal priority rule. On seed `:14`, the first differing reward
takes Iron Answer instead of Shield-bearer; it later converts 15 block into an
18-damage lethal hit. Candidate wins at 56 HP where control loses. On seed `:0`,
it replaces A promise of home, first converts 8 block into 11 damage, and later
loses where control wins at 68 HP. Full action replays match recorded outcomes.
Neither final outcome can be attributed solely to that first play because decks,
draws and later offers diverge.

Decision: **reject universal priority as the default**, retain the explicit
experimental option. Protect defense-to-damage synergy and its opportunity cost.
Do not buff Iron Answer merely because one static bot undervalues it.

### Resource-chain stress covers the full current card pool

`scripts/lab/lab-chains.ts` constructs decks with every current card, one or three
copies, either all base or all upgraded, and a ten-card opening hand. Opponents
have artificially high HP so early kills do not hide long chains. A public-only
adversarial policy prioritizes energy, then draw, then seeded random legal plays.
These are deliberately constructed stress fixtures, not obtainable-deck balance
claims or examples of normal pacing.

10,000 opening-turn probes, 2,500 per copy/upgrade combination, played all 32 card
definitions without an invariant or bound violation. Observed chain lengths:

| Copies | Upgraded | Min / median / p95 / max plays | Peak observed energy |
|---|---|---|---:|
| 1 | No | 2 / 8 / 11 / 14 | 7 |
| 3 | No | 2 / 7 / 12 / 18 | 10 |
| 1 | Yes | 2 / 8 / 13 / 17 | 9 |
| 3 | Yes | 2 / 8 / 14 / 20 | 14 |

The longest observed chain is `lab-chains-v1:987`. It chains Spark, Sacrifice,
Scout and draw effects, then spends its finite energy. It is not an infinite
combo. Another 9,000 full-pool trajectories, 3,000 per enemy reaction, ran up to
ten turns. They exercised 416,300 legal actions and 64,408 enemy-phase transitions
without invariant or bound failures. Death or reaching the deliberate turn limit
is expected in these fixtures; neither is an engine error.

The bound follows from the current rules, rather than only from these samples.
Every energy-producing card exhausts. Every zero-cost draw card exhausts. There
is no exhausted-card retrieval, cost reduction or other energy source in these
relic-free fixtures. Paid plays therefore cannot exceed initial and per-turn
energy plus all finite generator energy. Free non-exhaust plays must come from
the initial hand, automatic draws or draws produced by those finite paid/exhaust
plays. The probe checks this conservative action bound at every transition.
Regression checks flag new energy sources or free draw cards that invalidate the
argument. New effect types, relics, retrieval and cost reduction require a fresh
proof. This does not prove that every full game terminates.

A directed cross-turn probe does find a deliberate stall. Five Shelters against
one wraith block every attack and cycle indefinitely without damage or reward
progress. `lab-stall-v1` remains at 70 HP after 200 turns and 800 actions. Replacing
one Shelter with Iron Answer, with the same public policy, wins on turn 3 at
70 HP in 11 actions. This is a **minor constructed non-game**, not an engine bug
or evidence that a normal obtainable deck locks the adventure. The all-defense
fixture lacks any winning action and gains nothing persistent by waiting.
Keep laboratory action/turn limits and label their results as censored. Do not
weaken defense or introduce fatigue solely to force this artificial deck to lose.
The paired traces are in `chains/stall.json` and the case is a regression test.

### Retained engineering improvements and limits

Speculative rules calls can now pass `{ captureFrames: false }`. They still update
logs, state and accounting identically; only animation snapshots are omitted.
Gameplay and actual telemetry transitions retain snapshots by default. Tests
compare full and compact results across legal/illegal actions, all benchmark
reactions and both rule variants, and a complete adventure. A sequence journey
regenerated byte-for-byte after the optimization. A six-round alternating
microbenchmark of 2,000 identical end transitions measured median 379.33 ms with
snapshots versus 92.83 ms without, about 4.09 times faster. This is not a general
whole-game speedup claim. The initial continuation campaign had already loaded
the snapshot-producing code; policy semantics were not changed mid-campaign.

The checkpoint CLI replays canonical recorded actions to an exact decision,
then continues only that fight with another public-information policy. It records
true checkpoint state for offline diagnosis, but never gives it to the policy.
It rejects ambiguous seeds across policy arms and distinguishes final-boss victory
from defeat. Journey and chain CLIs preserve full seed/configuration on failure.

A laboratory CLI bug was fixed: `journey --rules candidate` used to be silently
ignored. It now fails because that rules variant is benchmark-only. None of these
journey experiments used that flag. A non-default progression option on benchmark
commands also fails explicitly. No reproducible engine-rules bug was found.

### Reproduction commands

```sh
# Each loop produces one file per policy arm with matched seeds.
for bot in search search-two search-sequence; do
  bun scripts/lab/lab.ts journey --games 20 --seed lab-continuation-v3 --bot "$bot" --budget 32768 > "/tmp/v3-$bot.jsonl"
done
python3 scripts/reports/lab-report.py --journeys /tmp/v3-*.jsonl

for bot in search search-two search-material; do
  bun scripts/lab/lab.ts journey --games 30 --seed lab-utility-v4 --bot "$bot" --budget 4096 > "/tmp/v4-$bot.jsonl"
done
python3 scripts/reports/lab-report.py --journeys /tmp/v4-*.jsonl

for progression in static shield-aware; do
  bun scripts/lab/lab.ts journey --games 50 --seed lab-shield-v5 --bot search --budget 256 --progression "$progression" > "/tmp/v5-$progression.jsonl"
done
python3 scripts/reports/lab-report.py --journeys /tmp/v5-*.jsonl

# Reproduce the exact Marshal checkpoint from the previous campaign archive.
tar -xzf .amp/in/artifacts/horizon/campaign-jsonl.tar.gz -C /tmp horizon-two.jsonl
bun scripts/lab/lab-checkpoint.ts /tmp/horizon-two.jsonl lab-horizon-v2:13 119 search-sequence 32768 > /tmp/marshal-sequence.json

bun scripts/lab/lab-chains.ts --games 10000 --seed lab-chains-v1 > /tmp/chains.jsonl
for encounter in fury reinforce ward; do
  bun scripts/lab/lab-chains.ts --games 3000 --seed lab-pool-fuzz-v2 --turns 10 --encounter "$encounter" > "/tmp/chains-$encounter.jsonl"
done
jq -s '{n:length, maxActions:(map(.actions)|max), boundFailures:([.[] | select(.actions > .actionBound or .spent > .energyBound)] | length)}' /tmp/chains.jsonl
bun -e 'import {probeStall} from "./src/game/laboratory-chains"; for (const payoff of [false, true]) console.log(JSON.stringify(probeStall("lab-stall-v1", payoff)))'

bun test
bun run build
```

Evidence is retained under `.amp/in/artifacts/{continuation,utility,progression,chains}/`.
Archived JSONL contains action traces. The diagnostic files contain inspected
before/after states, choices, and legal actions. Source and data hashes identify
the local implementation and archived campaign inputs. Nothing was pushed or
published.

### Verification and practical stopping point

This pass completed 250 fresh matched journeys, 19,000 constructed stress probes,
the paired stall case, fixed-state sensitivity checks and inspected replays.
`bun test` reports **183 pass, 0 fail, 38,193 assertions**. `bun run build` passes
typechecking and the production build. Formatting and `git diff --check` pass.

The concrete hypotheses from the preceding replays have now been tested. No tested
policy justifies replacing original Search, and no result supports a card-number
or core-rule change. Retained improvements are faster speculative execution,
broader invariant/fuzz coverage, explicit experimental policies and reproducible
checkpoint analysis. This is a stopping point for evidence-backed small changes,
not a claim that every possible experiment or design question is exhausted.

Remaining uncertainty includes obtainable-deck diversity, contextual reward
valuation, stronger belief search, and the effect of future card mechanics on
loop bounds. Selected constructed states are not estimates of normal non-game
rates. These experiments do not measure human fun. The next worthwhile research
expansion would compare reward choices from identical offered-reward checkpoints
across multiple subsequent draws, rather than substituting another blanket card
priority or changing combat balance to compensate for policy mistakes.
