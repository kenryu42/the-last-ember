# Identity experiment: recurring risk, Escape, bearer, and builds

The results below are retained in `experiments/identity/`. Current study scripts
write new runs to `artifacts/identity/`; pass those files explicitly to reports
when rerunning a study. See [evidence handling](../../experiments/README.md).

> **Current bearer rule:** Choose the Ember bearer after drawing the first
> encounter's opening hand in each Act. The choice remains locked through fights,
> camps, shops, and reloads until a boss reward advances the Act. There is no
> pass action, cost, or control. All cards remain playable, and passive use resets
> each turn and fight. Bearer and passing results below measured the retired
> encounter-level rules and are historical findings, not current-rule evidence.
> The obsolete `bearer-study.ts` and `coal-followup.ts` commands have been removed;
> their archived results remain under `experiments/identity/`.

Act-lock verification: **251 tests pass**, including a full journey replay that
round-trips saves after every action, rejects bearer changes while locked, and
checks exactly one choice in each Act. Reward/upgrade continuations retain the
locked bearer rather than choosing again in their sampled fights.
`experiments/identity/act-bearer-smoke.jsonl` records 15 current-rule CLI journeys:
five strategic and five conservative runs share seeds `act-bearer:0..4`; five
search runs use a freshly generated seed prefix recorded in the file. All 15
won, each with three bearer choices, with no errors or timeouts. Mean final HP
was 62.8, 48.8, and 65.6 respectively. This is a regression smoke test, not a
paired balance comparison with the retired passing rules. Browser checks cover
the lock label, no pass controls, reload persistence, a later fight, and choosing
again after the Act I boss reward advances to Act II.

## Implemented and deliberately deferred

New browser journeys use recurring Fury on the existing 0–10 Dread scale,
one Escape encounter at the opening of act two (4 Progress), and the three prototype Ember abilities.
Work costs 1 energy and a discarded card, twice per turn; it never plays the card.
Completion goes through the existing single reward transition, including automatic
completion when danger is gone and reusable cards guarantee the remaining Work.
Normal encounters remain kill-all. Fury is a local enemy-phase modifier, checked
before Howls; recurring combat has no fired-threshold history.

The core engine owns these actions and resolution ordering. The shared action
schema, JSON observations, legal actions, planners, browser, and save validation
support objectives and bearer timing. Spell tags are explicit. Quiet bell is
excluded from recurring relic offers. Explicit original-rule control/candidate
benchmarks remain for paired comparisons, not save compatibility.

The starting-relic experiment remains available to CLI runs.
Following user feedback, normal new journeys now start with no relic and no
vessel-selection step. Ancient flame's camp upgrade offers Veiled Flame and Wildfire.
The latter are upgrade variants, not new reward designs. Upgrade events now offer
the same branch choice, with a saved pending selection and one-time event cost.
A subsequent single-card experiment adds
Break formation to new-journey rewards; earlier controls retain their old pool.
The next experiment adds Fading strike, an offensive concealment option, and
tests acquisition with both random rewards and sampled combat evaluations.

Other objectives and Dread responses, multiplayer, separate hero health, and
large card-pool expansion were not added. Existing base cards were not rebalanced.
Escape's target changed from 6 to 4 after its first comparison. Its later
placement now permits acquired cards and upgrades to participate.

## Verification

- `bun test`: **245 pass, 0 fail**, 23 files. The original regression corpus remains.
- `bun run build`: typecheck and production build pass.
- `git diff --check`: clean.
- Added 62 deterministic/scenario/integration cases covering Dread boundaries,
  exclusive major response/relief, repeated temporary Fury, Weak/Drain/Howl order,
  Work costs/limits/no effects, live-enemy completion and one reward, bearer timing,
  one-use passives, single-hit AoE empowerment, save round trips, and fair starting
  bearer search budgets, relic limits and reset, crossing boundaries, discount
  legality, branch effects and identity, and build-aware acquisition. CLI
  subprocess and public planner tests complete encounters.
- Browser actions exercised starting choice, two Work actions, the disabled third
  Work, Mara's 10-Block Shelter, next-turn pass, and Aldren's 23-damage Ancient flame.
  The resulting Dread 5 displayed wolf Attack 12, including minor Fury. Desktop
  and 390px layouts were rendered and inspected; new controls remain accessible
  through vertical scrolling and cause no horizontal overflow.
  The starting-relic chooser and discounted Spell cost were also rendered and
  exercised. Both branch choices have readable desktop and vertically scrolling
  narrow layouts. Card-art previews are disabled on branch-choice buttons so
  they cannot obscure the other choice. CLI journey playback with branches,
  Black Lantern, and build-aware search won at 42 HP in 215 actions.
  Follow-up checks cover pending event upgrades across reload, one-time costs,
  invalid saves, branch-policy isolation, Block spending before damage, upgrades,
  targeting, Work exclusion, and reward eligibility. Browser play spent 10 Block
  for 14 damage at zero energy, moving Break formation to discard once. New card
  and event-choice screenshots were inspected; the event also works at 390px.
  Fading strike checks cover both sides of its precision boundary, Eryn/Coal
  ordering and activation limits, upgrades, Work, targeting, save round-trips,
  seeded acquisition, and reward evaluation isolation. Browser play confirmed
  Dread 7 to 3, wolf HP 24 to 14, and one Coal activation. Base, upgrade, and
  narrow Chromium layouts were inspected. Camp confirmation saved the upgrade.

## Autonomous campaigns

Every main stage used five profiles: `resource` (aggressive generators),
`conservative` (Dread heuristic), `search` (health-weighted phase search),
`search-tempo` (lower health weight), and `strategic` (general beam search).
Each used ten named seeds `identity-v1:0..9` and ten fresh-entropy seeds with
prefix `b999ce26-d554-4063-928c-c7f439f3aa08`, replayed across stages.
These are 20 unique seeds per stage, not 100 independent seeds.

| Stage                           | Full journey wins/runs | Constructed fight wins/runs | Timeouts |
| ------------------------------- | ---------------------: | --------------------------: | -------: |
| Original baseline               |                 70/100 |                     899/900 |        0 |
| A: recurring Fury               |                 81/100 |                     900/900 |        0 |
| B: Escape target 6              |                 80/100 |                   1200/1200 |        0 |
| B: Escape target 4              |                 80/100 |                   1200/1200 |        0 |
| C: bearer, first planner        |                  48/50 |                     600/600 |        0 |
| C: bearer, fair starting search |                 94/100 |                   1200/1200 |        0 |

Constructed fights use three existing decks and three formations; B/C add Escape.
The first bearer campaign used only the ten named seeds. An additional 20
mixed-deck Fury diagnostic fights won 20/20 but still chose Mara throughout.
This checkpoint totals **550 full journeys and 6,020 standalone fights**.
Later stages below bring the recorded total to **1,450 journeys, 10,268 standalone
fights, and 456 bearer counterfactual continuations**. No human input was used.

Journey wins by profile (out of 20 each):

| Rules                      | Resource | Conservative | Health search | Fast search | General |
| -------------------------- | -------: | -----------: | ------------: | ----------: | ------: |
| Original                   |        0 |           13 |            20 |          19 |      18 |
| Recurring                  |        6 |           15 |            20 |          20 |      20 |
| + Escape 4                 |        5 |           17 |            19 |          20 |      19 |
| + Bearer, corrected search |       14 |           20 |            20 |          20 |      20 |

### A: recurring consequences are real; difficulty fell

Baseline journeys contained **379 end turns after both historical responses had
fired**; standalone fights contained 553. Those turns could no longer trigger
standard consequences. Recurring journeys instead resolved **1,303 minor and
367 major responses**, with 1,468 total Dread relief. Card plays crossed below
the minor boundary 288 times, versus 228 in baseline. These are observed state
transitions, not proof the policy intentionally paid to avoid a response.

High-Dread play remains viable, but the generator-first profile did not dominate.
The existing energy generators Exhaust; repeated relief does not reset them.
No infinite action loop or permanent Fury accumulation appeared. Recurring fights
averaged 5.10 turns versus baseline 5.52. The higher win rate is confounded by
replacing permanent escalation, reinforcements, and wards with temporary Fury;
it is not evidence that the new game is better balanced.

### B: a smaller objective changes actual plans

At target 6, only **27/100** journey openings finished through Work with enemies
alive. At target 4, **77/100** did. Standalone Escape completions through Work rose
from **126/300 to 208/300**. Work turns taking damage fell from 278 to 204 in those
standalone slices. Both clearing danger and escaping remain observed plans;
neither always Work twice nor always kill-all describes the campaign.

Manual trace review, quiet deck, `identity-v1:0`, target 4:

- Health search blocks with Shelter/Walk unseen, discards Trail for Progress,
  later kills the crow, and escapes on turn 4 at **70 HP** with the wolf alive.
- Fast search opens with Volley, Shelter, and Trail, then kills both enemies on
  turn 2 at **61 HP**, automatically completing the remaining mission.
- Adding Mara lets health search Work twice on turn 2 and escape on turn 3 at
  **67 HP**. The same cards now buy different combinations of time and health.

These are bounded policies' chosen lines, not exhaustive proofs of optimality.
Target 6 exposed an objective-pressure problem; tuning only its target avoided
simultaneously changing card power, enemy stats, and reward composition.

### Historical C: encounter bearers and passing

The first planner shared its beam allowance across bearer branches, biasing
early choices. Starting-bearer phase search now grants equal continuation budgets;
a regression test reaches Aldren's profitable Spell line at both 96 and 256 calls.
Recorded old `bearer` outputs retain the earlier policy and should not be
regenerated as though they were the corrected `bearer-v2` result.

Corrected journeys chose **Mara 481, Aldren 217, Eryn 1** at encounter starts;
they passed **124 times** (63 to Mara, 45 to Aldren, 16 to Eryn). Bearer effects
accounted for **5,049 Block, 2,444 extra actual HP damage, and 40 extra Dread
reduction**. Standalone decks started Mara 1,030 times and Aldren 170 times,
never Eryn, with 60 passes. Objective Work wins were 216/300, versus 208/300
without bearers. Passing neither every turn nor never occurred universally.

**Inference:** Eryn competes poorly with unconditional Block and threat removal;
starting at zero Dread also gives her little opening value. Limited planning
depth, equal-score tie order, narrow deck fixtures, and insufficient concealment
pressure remain alternative explanations. The mixed-deck check did not resolve
them. Ability correctness is tested, but three-way strategic balance is not proven.
This prompted a controlled recovery experiment before starting relics.

### Historical C follow-up: pass-window recovery states

The retired bearer recovery study compared three forced bearer choices from 22
observed high-Dread pass windows and 16 constructed recovery states. Budgets 256
and 4,096, each at two health weights, produced **456 complete continuations**,
with no timeouts.
Eryn was never uniquely best in the observed sample. At budget 4,096 in the
constructed sample, Mara was uniquely best in 17 comparisons, Eryn in 8, Aldren
in 4, with 3 ties. The same initial states, pass costs, and public observations
were used for each alternative.

This establishes a useful state-dependent Eryn function, not frequent natural
access to it. Bearer values stayed unchanged. Starting relics were the next
experiment because Coal explicitly tests whether an existing concealment engine
can make those states useful without adding cards.

### D: relics change plans; Lantern is strong and Coal needs support

Each relic received **100 full journeys and 1,200 fixed-deck fights**, using the
same 20 seeds and five combat profiles as C. A second acquisition-policy experiment
added 100 journeys per relic without changing rules, offers, or combat policies.
All fixed-deck fights won and no run timed out.

| Relic / acquisition policy  | Wins / 100 | Total turn ends | Mean final HP | Coal activations | Escape finishes through Work |
| --------------------------- | ---------: | --------------: | ------------: | ---------------: | ---------------------------: |
| None / static, C control    |         94 |           2,922 |         46.47 |                0 |                           77 |
| Shieldfire / static         |         96 |           2,975 |         53.05 |                0 |                           75 |
| Hushed Coal / static        |         90 |           2,933 |         46.25 |               92 |                           77 |
| Black Lantern / static      |        100 |           2,365 |         57.88 |                0 |                           99 |
| Shieldfire / build-aware    |         99 |           2,822 |         59.77 |                0 |                           75 |
| Hushed Coal / build-aware   |         93 |           3,123 |         50.40 |              145 |                           77 |
| Black Lantern / build-aware |         99 |           1,996 |         53.14 |                0 |                           99 |

Shieldfire retained 7,335 Block in the static journeys. Lantern activated 1,649
times, increased major responses from 399 to 569, and freed energy for escape.
Coal increased passes to Eryn from 16 to 42 in static journeys. This is a
measured bearer/relic interaction, though Eryn remains uncommon overall.

Fixed rankings never acquired Silence or Iron answer. The optional `build-aware`
policy adds value to one missing substantial Dread reducer for Coal or one
Block-conversion card for Shieldfire, and estimates Lantern's discount when
rating Spells. It selected Silence on 16 of 62 offers and Iron answer 52 times.
Coal activations rose to 145 while major responses fell from 378 to 291.
These are arbitrary, inspectable policy weights, not an optimal acquisition model.
Route scoring was unchanged, so these campaigns do not establish relic-specific
route preferences.

**Inference:** Lantern has broad immediate value; Coal has a setup and acquisition
burden. Lantern is not universally best on both tempo and health: build-aware
Shieldfire preserved more final HP. The experiment does not yet justify a blanket
Lantern nerf or a new concealment card. All prototype relic numbers remain intact.

### Optional branches: different jobs, with an acquisition-policy limitation

The branch campaign added **300 paired journeys**, 100 per relic with build-aware
acquisition. Wins stayed 99/93/99 for Shieldfire/Coal/Lantern. Total turn ends
changed from 2,822/3,123/1,996 to 2,823/3,121/2,312. No timeouts occurred.
Veiled Flame was selected 141 times and played 1,102 times. Wildfire was never
selected: current acquisition scoring counts its all-enemy hit like a single hit.
That is a policy limitation, not evidence that the card is weak. Random-upgrade
events still create the historical upgrade and are visible in the traces.

`flame-study.ts` therefore compared all three upgrades in constructed decks:
solo/group/Escape, Dread 0/6/9, all three initial bearers, no relic or each starting
relic, and two seeds, one fresh entropy seed. **648 fights won, zero timed out.**
The fixed first bearer can pass normally on subsequent turns. The recorded
`turns` value counts turn ends, including zero when the opening turn wins.

In 72 paired comparisons per formation:

- Solo: Veiled Flame was faster in 34 cases and slower in none; it preserved more
  HP in 16 cases, less in 1, with 55 health ties.
- Groups: Wildfire was faster in 48 cases and slower in none. Veiled Flame
  preserved more HP in 47 cases, Wildfire in 18, with 7 ties.
- Escape: Veiled Flame preserved more HP in 32 cases, Wildfire in 28, with 12
  ties. Veiled was faster in 17 cases, Wildfire in 14, with 41 tempo ties.

Manual trace comparison, `flame-branches-v1`, Mara, Dread 0, no relic: against a
group, Veiled finishes at 65 HP after four turn ends versus Wildfire at 54 HP
after three. In Escape, Veiled finishes at 68 HP after one turn end versus
Wildfire at 70 HP after three. These lines demonstrate competing tempo/health
plans; bounded search does not prove them optimal. The old 24-damage upgrade
often performs better than either, so the branches are not power-neutral buffs.
In that Escape pair, Veiled kills both enemies for automatic completion. The
Wildfire line instead discards Wildfire for Work on its opening and final turns,
while playing another copy in between. The card's value changes with the mission.

## Card-pool decision

The initial phases contained **32 unique designs**, **30 reward-eligible designs**,
and a **12-card starter deck with 8 unique designs**. Steady blade and Shelter
are starter-only for ordinary offers. Upgrades and duplicate copies are not
additional designs. Heroes do not restrict rewards or play. Ordinary rewards
sample three designs from the common pool; skipping remains available.

The pool already supplies defense/Block conversion (Iron answer), concealment
and precision (Walk unseen, Silence, Through the leaves), high-Dread payoffs
(Defiance, Face the darkness), draw, and exhausting energy conversion. Iron
answer is a single explicit Block-to-damage payoff: that is a possible support
gap, not evidence that an expansion is needed. Existing utility cards bridge
these strategies; the constructed fixtures and normal rewards were tested
separately.

Corrected bearer journeys selected **523** rewards and skipped **76**. Last stand
was selected on 62/62 offers, Cinder lance 55/75, and Hold the pass 54/66. The
progression policy uses fixed card rankings, so these rates mainly reveal policy
bias and cannot establish player preference or weak alternatives. Acquisition
and final decks are recorded. The later build-aware experiment demonstrates
acquisition of existing support, but does not establish human discoverability.
Those phases added no reward designs. The follow-up below adds one provisional
Block-conversion alternative. That checkpoint had **33 base designs** and
two Flame upgrade variants, with **31 reward-eligible designs**. Fading strike
raises the current totals to **34 base designs** and **32 reward-eligible designs**.
CLI experiment configuration selects its pool. The starter deck is unchanged, and no hero restriction
or module system was introduced.

## Evidence, limits, and smallest next experiment

`experiments/identity/*.jsonl.gz` retain full before/after states, card ordering,
intentions' source state, piles, routes, rewards, relics, final decks and bearer
accounting. `metrics.json`, `relic-metrics.json`, `build-aware-metrics.json`, and
`branch-metrics.json` aggregate the stage archives with `scripts/reports/identity-report.py`.
The JSON summaries beside each archive contain stage/policy outcomes. The separate
`bearer-recovery.json` and `flame-branches.jsonl.gz` retain constructed initial states
and action traces. Rerun the latter with its recorded entropy seed
`bab1b876-72d7-474f-a266-321d7952a786` to reproduce this comparison.

The report measures Dread changes between committed actions (net/clamped changes,
not uncapped generation). Old standalone logs lack final combat snapshots on
winning plays, so terminal Block/Dread effect totals are explicitly incomplete.
Ending with at most 6 enemy HP is only a cleanup proxy; inevitability is not
computed. Search uses public state and sampled draw orders, not hidden-order
knowledge. Policies share heuristics; Progress's heuristic value is provisional.
Paired seeds do not guarantee identical late-run offers after different actions
consume RNG. Simulations do not measure enjoyment or human discoverability.
The first named-seed relic archives predate a telemetry-only energy-accounting
fix for Coal. Their before/after states and activation counts remain usable;
their aggregate generated-energy totals should not be used for exact comparisons.

## Follow-up: evaluate alternatives before increasing power

The user played and approved the prior slice, then requested further experiments.
The following work adds **360 journeys, 2,400 Escape fights, 576 constructed card
fights, and 480 bearer counterfactual continuations**. Internal branch evaluation
rollouts are additional planning work, not independent journey samples.

### Branch policy and event consistency

The opt-in `continuation` acquisition policy keeps build-aware reward, route,
and upgrade priorities. Once a Flame upgrade is selected, both branches receive
four sampled current-act combat continuations: two ordinary, one elite, one boss.
It uses the actual acquired deck, relics and health, but not the live RNG or hidden
draw order. Each action receives budget 96; completed fights are ranked by
victory, then 3 × remaining HP minus turn ends. The mix and utility are provisional.
The full trial outcomes are retained in each journey's `branchEvaluations`.

Across 240 journeys, five combat profiles used four named held-out seeds
`identity-followup-v1:0..3` and four fresh-entropy seeds with prefix
`db1346d9-93ce-4150-97f7-91f82878abbb`, paired across three relics and two policies.
Shieldfire and Coal results were identical between policies, with 40/40 and
35/40 wins; those runs did not upgrade Flame. Lantern changed from 39/40 wins,
2,223 total final HP, 978 turn ends, and 59 Veiled upgrades to 38/40 wins,
2,138 HP, 992 turn ends, 32 Veiled and 25 Wildfire upgrades. Its 456 sampled
evaluation fights all completed successfully.

This fixes the area-damage blind spot but does not prove a better journey policy.
Four sampled fights can mispredict the actual route. Keep the old evaluator as
the control; do not tune Wildfire to maximize one agent's score. A regression
test confirms the first changed decision is the branch of the same upgrade,
not a different camp/rest/upgrade priority.

Event-selected Flame now asks for a branch through the same `upgrade` action.
The event cost and random selection happen once, the pending choice survives
save/reload, and leaving or repeating the event is rejected until it is resolved.
Unbranched CLI controls use the numerical upgrade.

### Historical Coal and Eryn pass-window follow-up

The corrected study replays 100 earlier Coal journeys and 40 held-out journeys.
Earlier runs contain 1,477 Dread 4+ pass windows, 142 Coal activations, and 55
concealment selections on 102 offer screens containing support. Held-out runs
contain 529 windows, 57 activations, and 21 selections on 52 such screens.

One natural recovery window per journey compares every bearer at budget 256;
ten windows per cohort also use 4,096. Eryn is uniquely best in 5/100 earlier
windows and 1/40 held-out windows, but improves over keeping the current bearer
in 20/100 and 5/40. The deeper samples did not change the best-bearer sets.
Eryn remains situational. These samples do not support a broad buff or another
concealment card, and do not prove that every recovery window is equally useful.

The first diagnostic incorrectly charged every completed continuation the full
12-turn horizon. The corrected script uses actual turn ends, common planning
seeds, terminal effect snapshots, and records action traces. Only the corrected
`coal-followup.json` and `coal-heldout.json` results are used here.

### Escape target 5 weakens the intended contrast

`escape-followup.ts` compares Work-first, combat-first defense, combat-first
offense, and health-weighted search. It uses three constructed decks, four relic
conditions, targets 4/5, 24 held-out seeds and one freshly generated seed.
All 2,400 fights completed successfully. Surviving enemies after escape carry
no utility penalty; comparisons use outcome, HP, and turn ends only.

With Lantern at target 4, rushing averages 62.81 HP and one turn end, versus
65.91 HP and 1.84 turn ends for combat-first offense. Rush dominates that policy
in 19/75 pairs, loses in 15/75, and the rest tie or trade HP against tempo.
Without a relic, rushing averages 62.96 HP and the same one turn end. Lantern
therefore does not explain the rush. At target 5, Lantern rushing falls to
60.55 HP and two turn ends; combat-first offense dominates it in 54/75 pairs.
**Keep target 4 and the relic values.** Raising the target would favor clearing
enemies again rather than strengthen competing plans.

### One card tests preserving versus spending Block

**Break formation:** 0 energy; lose all Block, then deal 4 plus the Block lost
to one enemy. Its upgrade raises the base to 7. It is neither a Spell nor a
Block-gaining effect; Work discards it without consuming Block. It reuses Iron
answer's artwork while the design remains provisional.

Hypothesis: Iron answer is the only explicit Block-to-damage payoff. A functional
alternative should offer a different resource conversion, not another scaling
attack that preserves defense. Break formation trades Block for energy, allowing
an attack plus Work or another card. Shieldfire makes the lost defense relevant
beyond the current enemy phase. Existing cards remain unchanged.

Before reward testing, 576 constructed fights paired one Iron answer with one
Break formation in identical slots across three decks, Fury/Escape, four relic
conditions, two health weights, five named seeds and one fresh seed
`59f2c17e-45cd-4841-a6e4-10c44b8a9122`. All won with no timeout. Of 288 pairs,
Break formation preserved more HP in 61, Iron answer in 118, with 109 ties;
tempo favored Break formation in 57, Iron answer in 59, with 172 ties.
In Escape, Break formation was played 55 times and discarded for Work 145 times.
This is a situational alternative, not an upgrade over Iron answer.

The subsequent 120 journeys reuse the eight follow-up seeds, five policies and
three relics with `continuation` acquisition. Shieldfire selected the card on
10/17 reward offers and bought three copies; 13/40 final decks contained it.
It was played 88 times, spending 959 Block, including 59 plays with positive Block.
Coal and Lantern policies selected none on 23 and 28 offers, respectively.
The acquisition heuristic values missing Block conversion specifically for
Shieldfire, so this does not establish that the card is useless elsewhere.

Wins were Shieldfire 39/40, Coal 39/40, Lantern 40/40. Pool growth changes shuffle
RNG consumption and later offers; the improvements for policies that never took
the card demonstrate why these win rates cannot be attributed to card power.
`--prototype conversion` reproduces this single-card pool in the CLI.

### Decision and remaining limits

Retain the single provisional card and the upgrade-consistency fix. Keep existing
bearer, relic, enemy and Dread numbers. The target-5 tuning experiment was rejected
on evidence. No larger batch, new resource, new hero restriction, or multiplayer
was introduced. Revisit card values if wider acquired-deck comparisons show that
spending Block is nearly always inferior, or if a policy-independent free-attack
loop appears. No such loop appeared in these runs.

The user approved the earlier playable slice. Long-term discovery and enjoyment
are not established by that approval or by simulation. Further experiments should
address a measured failure, rather than grow the pool simply because work can
continue.

## Offensive concealment and acquisition experiments

### Fading strike bridges recovery and attacking without a new rule

The catalogue already supplies defensive concealment and separate precision
attacks. This experiment tests one offensive bridge: **Fading strike**, 1 energy,
lower Dread by 2, then deal 4 damage, or 10 at Dread 3 or less. The upgrade deals
7/13 while retaining the same recovery. It is not a Spell and does not Exhaust.
Its printed effects use existing engine ordering. At Dread 5 it enables its own
precision; at 6 it does not. Eryn can extend that range to 7, also enabling Coal.
Work discards it without lowering Dread. No existing card or relic was retuned.

`block-study.ts <seed> concealment` compares identical slots containing Fading
strike, Through the leaves, or Quiet as snowfall. Five fixed seeds and fresh
`14aed60e-fd7d-4c24-924f-3c3c498cd965`, three constructed decks, Fury/Escape,
four relic conditions, and two health weights produce **864 fights**, all won
without timeouts. The trace includes committed action states and accounting.

| Comparator         | Fading higher HP | Comparator higher HP | HP ties | Fading faster | Comparator faster | Turn ties |
| ------------------ | ---------------: | -------------------: | ------: | ------------: | ----------------: | --------: |
| Through the leaves |               70 |                   53 |     165 |            39 |                72 |       177 |
| Quiet as snowfall  |               68 |                   45 |     175 |            86 |                13 |       189 |

These are 288 paired cases per comparator, not independent human playtests.
Fading strike was played 334 times and discarded for Work 147 times. Of its
plays, 177 began at zero Dread; its flexible attack matters more often than its
recovery in these short fights. Keep it provisional, not a proven recovery engine.
The specialists retain cases where they outperform it.

### Removing acquisition bonuses exposes usable hybrid cards

The new `exploratory` progression policy samples each ordinary card offer or
skip with equal probability using an independent seeded stream. All other
progression decisions retain build-aware rankings. This deliberately weak policy
tests acquisition separately from combat use; it does not change player rewards.

Compared `conversion` and `concealment`, build-aware and exploratory acquisition,
three relics, five combat profiles, and eight equivalent seeds: four
`concealment-v1` seeds and four fresh-prefix
`91e30aec-38cb-4b49-abc3-6074271d2247` seeds. **480 journeys** completed without
timeouts. Full traces and normal offers are in the matching compressed archives.

| Pool / acquisition        | Shieldfire wins / 40 | Coal wins / 40 | Lantern wins / 40 |
| ------------------------- | -------------------: | -------------: | ----------------: |
| Conversion / build-aware  |                   38 |             37 |                40 |
| Conversion / exploratory  |                   39 |             37 |                38 |
| Concealment / build-aware |                   38 |             39 |                38 |
| Concealment / exploratory |                   36 |             36 |                40 |

In the conversion control, random rewards acquired Break formation in Coal and
Lantern decks: 3 selections on 21 offers and 8 on 20, respectively. Combat bots
played it 23 and 37 times, with positive Block on 10 and 30 plays. The prior
absence outside Shieldfire was therefore partly an acquisition-policy artifact.
This establishes use, not that each acquisition beat skipping.

In the expanded pool, build-aware selected Fading strike on **0/56 offers**.
The heuristic counts its base damage but ignores the precision bonus. Random
rewards selected it on **12/53 offers**, producing 12 final decks and **75 plays**.
Twenty-six plays crossed from above Dread 3 into the low band; one activated Eryn.
Recorded nonterminal plays removed 108 Dread, a lower bound because terminal
scenes do not retain combat Dread. No repeatable energy loop or timeout appeared.

Pool size changes subsequent RNG consumption, so differences in journey outcomes
cannot be attributed to Fading strike. Even the policy that never acquired it
has changed results. Skip remains available. Starter copies, upgrade variants,
and reward designs remain separate: 34 base designs, two Flame variants, 32
eligible designs in new journeys, and the unchanged 12-card/eight-design starter.

At this checkpoint, Escape occurred before any card reward. Consequently, normal acquired
cards have no opportunity to be Worked; the Work counts above come from the
constructed experiment. A later placement of the single objective is a separate
encounter experiment, not a reason to add more objective-specific cards now.

### Combat-based reward evaluation and a rejected damage increase

`--progression sampled` evaluates each offered card and skipping through four
engine fights at search budget 96, using independent fixed seeds and public
deck/relic/health/act data. It shares the existing Flame-branch trial implementation;
the extraction passed the branch regression tests before adding reward behavior.
No hidden future draws or live RNG are consulted. Skip wins utility ties.
Other progression decisions remain build-aware. Trial utility is 10,000 for a
win or −10,000 otherwise, plus 3 × remaining HP minus turn ends. This is an
experimental preference, not a game rule.

Thirty journeys, the five combat profiles, all three relics, and the `:0` seed
from each earlier prefix produced 2,736 internal trial fights with no timeouts.
Of these, 2,687 won. The same 30-journey subset gives:

| Relic         | Build-aware wins / HP / turn ends | Sampled wins / HP / turn ends |
| ------------- | --------------------------------- | ----------------------------- |
| Shieldfire    | 9 / 447 / 259                     | 10 / 552 / 314                |
| Hushed Coal   | 9 / 438 / 322                     | 9 / 427 / 328                 |
| Black Lantern | 9 / 565 / 245                     | 9 / 499 / 263                 |

Sampled is opt-in, not a replacement for the control. It fixed conditional-effect
blindness without proving a better general deckbuilder. It selected Break formation
once for Shieldfire and three times for Lantern, but no Fading strikes on 30 offers.
Fading beat skip on five of those offers, but another offered card scored higher.
On the other 25, its sampled utility was below skipping. This contradicts any claim
that its low acquisition rate is only a crude-ranking problem.

`fading-tuning.ts` reran those exact saved offers at base damage 4, 5, and 6,
with all other parameters fixed. All baseline scores matched the saved scores.
Each setting ran 480 fights, **1,440 total**, without timeouts:

| Base damage | Beats skipping / 30 | Best offer / 30 |
| ----------- | ------------------: | --------------: |
| 4           |                   5 |               0 |
| 5           |                   8 |               0 |
| 6           |                   6 |               2 |

Retain **4/10 damage** for now. The non-monotonic result reflects the bounded
planner and its changed sequences; it does not show that extra damage is harmful
under optimal play. Raising damage to win two offer screens would overfit this
small evaluator sample. The constructed comparisons establish a distinct role,
but acquired-deck value remains a weakness to investigate rather than conceal.

### Moving the single Escape lets acquired decks meet the objective

`late-escape` moves only the placement to act two, row zero. That row always
contains normal battles; no boss is replaced, no route is regenerated differently,
and the existing wolf/crow formation and target 4 stay unchanged. Browser journeys
now use the later placement.
Normal act scaling still applies: each non-boss enemy gains 6 HP and 2 strength
in act two. This comparison therefore tests later placement with existing act
scaling, not placement with frozen enemy stats. No bespoke enemy buffs were added.

Sixty additional journeys compared against the matching 60-run subset of the
earlier exploratory cohort, two seeds per prefix, three relics and five profiles:

| Metric                            | Opening Escape | Act-two Escape |
| --------------------------------- | -------------: | -------------: |
| Journey wins                      |          55/60 |          53/60 |
| Objective completions             |          60/60 |          60/60 |
| Escaped with enemies alive        |             43 |             55 |
| Cleared enemies before completing |             17 |              5 |
| Work actions                      |            204 |            230 |
| Acquired-card plays in objective  |              0 |             51 |
| Upgraded-card plays in objective  |              0 |             29 |
| Objective turn ends               |            101 |             89 |
| Objective damage taken            |            249 |            326 |

All runs terminated. Mean objective damage rose from 4.15 to 5.43; mean turn ends
fell from 1.68 to 1.48. This supports a faster, less health-preserving mission plan
remaining possible after deck growth. It does not isolate the cause of whole-run
win changes, since moving the first encounter changes subsequent rewards and RNG.

No acquired cards were discarded for Work. Inspection found that observations
sort cards by UID and strict planner ties keep earlier actions; low-ID starter
cards can therefore be selected without a strategic judgment about their value.
Do not describe this count as proof that the agents deliberately preserved every
acquired card. The legal action list includes Work for all cards. The 51 acquired
plays are real, but the discarded-card mix still needs an order-bias-controlled
policy comparison. This limitation does not prevent moving the objective later.

Current decisions: retain Fading strike provisionally and the later objective,
keep all existing card/relic/bearer numbers, retain the two diagnostic acquisition
policies, and add no further cards. Review the pool again when order-controlled,
deeper acquired-deck comparisons establish a consistent missing function or show
that the new hybrid is routinely inferior. Broader objectives, multiplayer, new
resources and formal expansions remain deferred. These simulations do not establish
enjoyment or long-term discovery.

Reproduce aggregate metrics with `concealment-report.py` and
`escape-placement-report.py`, passing the recorded fresh prefix. They write
`concealment-metrics.json` and `escape-placement-metrics.json`; the tuning archive
retains every reward context, parameter value, and trial result.
The browser confirmed new-game `escapeAct: 1`, resumed an actual act-two campaign
checkpoint, and advanced Work from 0/4 to 1/4 for one energy. A screenshot of this
state was inspected alongside the new card's base, upgrade, and narrow layouts.
