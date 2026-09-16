import {
  HeadlessFight,
  POLICY_VERSION,
  configSchema,
  policySchema,
} from "../src/game/playtest-headless";
import {
  PLAYTEST_DECKS,
  PLAYTEST_ENCOUNTERS,
} from "../src/game/playtest-fixtures";

// Frozen before the first campaign. Held-out seeds are not policy development inputs.
const stages = [
  { id: "opening", seeds: ["ember-v02-a", "ember-v02-b"] },
  {
    id: "held-out",
    seeds: Array.from(
      { length: 100 },
      (_, i) => `ember-v02-heldout-${String(i).padStart(3, "0")}`,
    ),
  },
];
const budget = {
  maxTurns: 40,
  maxActions: 400,
  searchBudget: 96,
  planningSeed: "belief-v1",
};
type Result = ReturnType<HeadlessFight["result"]>;
function totals(results: Result[]) {
  const wins = results.filter((r) => r.outcome === "win");
  const mean = (rows: Result[], f: (r: Result) => number) =>
    rows.length ? rows.reduce((n, r) => n + f(r), 0) / rows.length : null;
  return {
    n: results.length,
    wins: wins.length,
    losses: results.filter((r) => r.outcome === "loss").length,
    timeouts: results.filter((r) => r.outcome === "timeout").length,
    meanHealthAll: mean(results, (r) => r.finalHealth),
    meanHealthSurvivors: mean(wins, (r) => r.finalHealth),
    meanTurns: mean(results, (r) => r.playerTurns),
    meanActions: mean(results, (r) => r.actionCount),
    meanDraws: mean(results, (r) => r.metrics.drawn),
    killedBeforeFirstAction: results.reduce(
      (n, r) => n + r.metrics.killedBeforeFirstAction,
      0,
    ),
    suppressedPreBlockDamage: results.reduce(
      (n, r) => n + r.metrics.suppressedAttackDamage,
      0,
    ),
    dreadEvents: {
      unlock: results.reduce(
        (n, r) => n + r.dreadEvents.filter((e) => e.event === "unlock").length,
        0,
      ),
      suppressed: results.reduce(
        (n, r) =>
          n + r.dreadEvents.filter((e) => e.event === "suppressed").length,
        0,
      ),
      reactivate: results.reduce(
        (n, r) =>
          n + r.dreadEvents.filter((e) => e.event === "reactivate").length,
        0,
      ),
    },
    maxTurnCards: Math.max(...results.map((r) => r.metrics.largestTurnCards)),
  };
}
const started = performance.now();
const cells = [];
const examples: { reason: string; control: Result; candidate: Result }[] = [];
let fights = 0;
for (const stage of stages) {
  for (const variant of ["base", "ablation"]) {
    for (const deck of PLAYTEST_DECKS) {
      if (variant === "ablation" && deck.id === "quiet") continue;
      for (const encounter of PLAYTEST_ENCOUNTERS) {
        for (const policy of policySchema.options) {
          const control: Result[] = [],
            candidate: Result[] = [];
          for (const seed of stage.seeds) {
            for (const rules of ["control", "candidate"]) {
              const config = configSchema.parse({
                rules,
                fixture: { variant, deckId: deck.id },
                encounterId: encounter.id,
                seed,
                policy,
                ...budget,
              });
              const result = new HeadlessFight(config).auto();
              (rules === "control" ? control : candidate).push(result);
              fights++;
            }
            const a = control.at(-1),
              b = candidate.at(-1);
            if (
              a &&
              b &&
              a.finalHealth !== b.finalHealth &&
              examples.length < 4 &&
              !examples.some(
                (e) =>
                  e.control.config.fixture.deckId === deck.id &&
                  e.control.config.policy === policy,
              )
            )
              examples.push({
                reason:
                  "Matched rules pair with unequal final health; not a fixed-action counterfactual",
                control: a,
                candidate: b,
              });
          }
          const delta = (f: (r: Result) => number) =>
            candidate.reduce((n, r, i) => n + f(r) - f(control[i] ?? r), 0) /
            candidate.length;
          cells.push({
            stage: stage.id,
            variant,
            deck: deck.id,
            encounter: encounter.id,
            policy,
            control: totals(control),
            candidate: totals(candidate),
            pairedCandidateMinusControl: {
              wins: delta((r) => Number(r.outcome === "win")),
              healthAll: delta((r) => r.finalHealth),
              turns: delta((r) => r.playerTurns),
              actions: delta((r) => r.actionCount),
              betterHealth: candidate.filter(
                (r, i) =>
                  r.finalHealth > (control[i]?.finalHealth ?? r.finalHealth),
              ).length,
              worseHealth: candidate.filter(
                (r, i) =>
                  r.finalHealth < (control[i]?.finalHealth ?? r.finalHealth),
              ).length,
            },
          });
          process.stderr.write(
            `${stage.id}/${variant}/${deck.id}/${encounter.id}/${policy}: ${fights} fights\n`,
          );
        }
      }
    }
  }
}
// Keep aggregate evidence and four replayable pairs, not thousands of raw action logs.
process.stdout.write(
  JSON.stringify({
    version: "v0.2-automated-1",
    policyVersion: POLICY_VERSION,
    budget,
    stages,
    fights,
    runtimeSeconds: (performance.now() - started) / 1000,
    cells,
    examples: examples.map(({ reason, control, candidate }) => ({
      reason,
      control: {
        config: control.config,
        outcome: control.outcome,
        finalHealth: control.finalHealth,
        trace: control.trace,
      },
      candidate: {
        config: candidate.config,
        outcome: candidate.outcome,
        finalHealth: candidate.finalHealth,
        trace: candidate.trace,
      },
    })),
  }) + "\n",
);
