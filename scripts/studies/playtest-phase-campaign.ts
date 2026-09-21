import { HeadlessFight } from "../../src/lab/runner";
import { configSchema, POLICY_VERSION, PLANNER_V2_VERSION } from "../../src/lab/headless-config";
import { PLAYTEST_ENCOUNTERS } from "../../src/lab/fixtures/combat";

// Declared before evaluation. Do not retune either planner on these ten seeds.
const seeds = Array.from({ length: 10 }, (_, i) => `ember-v02-phase-${String(i).padStart(3, "0")}`);
const budget = {
  maxTurns: 40,
  maxActions: 400,
  searchBudget: 256,
  planningSeed: "phase-study",
};
type Result = ReturnType<HeadlessFight["result"]>;
function brief(r: Result) {
  return {
    outcome: r.outcome,
    finalHealth: r.finalHealth,
    turns: r.playerTurns,
    actions: r.actionCount,
    drawn: r.metrics.drawn,
    killsBeforeAction: r.metrics.killedBeforeFirstAction,
    unlocked8: r.dreadEvents.some((e) => e.at === 8 && e.event === "unlock"),
    suppressions: r.dreadEvents.filter((e) => e.event === "suppressed").length,
    reactivations: r.dreadEvents.filter((e) => e.event === "reactivate").length,
    suppressedPreBlockDamage: r.metrics.suppressedAttackDamage,
  };
}
function crossReplay(r: Result, rules: "control" | "candidate") {
  const fight = new HeadlessFight({ ...r.config, rules });
  for (const action of r.trace) {
    if (fight.outcome() !== "running") break;
    try {
      fight.step(action);
    } catch (error) {
      return { ...brief(fight.result()), error: String(error) };
    }
  }
  return brief(fight.result());
}
const started = performance.now();
const pairs = [];
const adverse: {
  config: Result["config"];
  control: Result["trace"];
  candidate: Result["trace"];
}[] = [];
for (const variant of ["base", "diagnostic-mixed"])
  for (const encounter of PLAYTEST_ENCOUNTERS)
    for (const policy of ["planner", "planner-v2"]) {
      for (const seed of seeds) {
        const config = configSchema.parse({
          rules: "control",
          fixture: { deckId: "exposed", variant },
          encounterId: encounter.id,
          policy,
          seed,
          ...budget,
        });
        const a = new HeadlessFight(config).auto();
        const b = new HeadlessFight({ ...config, rules: "candidate" }).auto();
        pairs.push({
          config,
          control: brief(a),
          candidate: brief(b),
          equalHealthAndOutcome: a.finalHealth === b.finalHealth && a.outcome === b.outcome,
          sameTrace: JSON.stringify(a.trace) === JSON.stringify(b.trace),
          controlUnderCandidate: crossReplay(a, "candidate"),
          candidateUnderControl: crossReplay(b, "control"),
        });
        if (
          (b.finalHealth < a.finalHealth || (a.outcome === "win" && b.outcome !== "win")) &&
          adverse.length < 4
        )
          adverse.push({ config, control: a.trace, candidate: b.trace });
      }
      process.stderr.write(
        `${variant}/${encounter.id}/${policy}: ${pairs.length * 2} policy fights\n`,
      );
    }

// Separate reachable-state diagnostic, NOT another fresh-fixture sample.
// The complete v1 defense line naturally unlocks Ward8 and then lowers Dread.
const wardConfig = configSchema.parse({
  rules: "candidate",
  fixture: { deckId: "exposed", variant: "diagnostic-mixed" },
  encounterId: "ward",
  seed: "ember-v02-recovery-011",
  policy: "defense",
});
const wardSource = new HeadlessFight(wardConfig).auto();
const suppressionIndex = wardSource.telemetry.findIndex((r) =>
  r.thresholdEvents.some((e) => e.at === 8 && e.event === "suppressed"),
);
if (suppressionIndex < 0) throw new Error("Ward8 source no longer reaches recovery");
const prefix = wardSource.trace.slice(0, suppressionIndex);
const wardBranches = [];
for (const rules of ["control", "candidate"] as const)
  for (const policy of ["planner", "planner-v2"] as const) {
    const fight = new HeadlessFight({
      ...wardConfig,
      ...budget,
      rules,
      policy,
    });
    prefix.forEach((action) => fight.step(action));
    const atRecovery = fight.view();
    const result = fight.auto();
    wardBranches.push({
      rules,
      policy,
      atRecovery,
      result: brief(result),
      continuation: result.trace.slice(prefix.length),
    });
  }
const wardFixed = [];
for (const rules of ["control", "candidate"] as const) {
  const fight = new HeadlessFight({ ...wardConfig, rules });
  wardSource.trace.forEach((action) => fight.step(action));
  wardFixed.push({ rules, result: brief(fight.result()) });
}

// Recheck the previously adverse v1 case with v2 without counting it as held-out.
const previousAdverse = [];
for (const rules of ["control", "candidate"] as const) {
  const config = configSchema.parse({
    ...wardConfig,
    ...budget,
    rules,
    encounterId: "fury",
    seed: "ember-v02-recovery-000",
    policy: "planner-v2",
  });
  const result = new HeadlessFight(config).auto();
  previousAdverse.push({
    rules,
    result: brief(result),
    trace: result.trace,
    otherRulesReplay: crossReplay(result, rules === "control" ? "candidate" : "control"),
  });
}

process.stdout.write(
  JSON.stringify({
    version: "v0.2-phase-followup-1",
    policyVersions: [POLICY_VERSION, PLANNER_V2_VERSION],
    seeds,
    budget,
    policyFights: pairs.length * 2,
    pairedReplays: pairs.length * 2,
    diagnosticCounts: {
      wardSource: 1,
      wardFixedReplays: 2,
      wardContinuationBranches: 4,
      priorAdversePolicyFights: 2,
      priorAdverseReplays: 2,
    },
    runtimeSeconds: (performance.now() - started) / 1000,
    pairs,
    adverse,
    ward8: {
      kind: "reachable-scripted-prefix",
      config: wardConfig,
      sourceTrace: wardSource.trace,
      prefix,
      fixedSequence: wardFixed,
      branches: wardBranches,
    },
    previousAdverse,
  }) + "\n",
);
