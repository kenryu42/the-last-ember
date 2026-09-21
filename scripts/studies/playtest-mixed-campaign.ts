import { HeadlessFight } from "../../src/lab/runner";
import { chooseAction } from "../../src/lab/policies/planner";
import { configSchema, POLICY_VERSION, policySchema } from "../../src/lab/headless-config";
import { PLAYTEST_ENCOUNTERS } from "../../src/lab/fixtures/combat";

// Follow-up declared after the original campaign. Policies remain frozen.
const seeds = Array.from(
  { length: 25 },
  (_, i) => `ember-v02-recovery-${String(i).padStart(3, "0")}`,
);
const budget = {
  planningSeed: "belief-v1",
  maxTurns: 40,
  maxActions: 400,
  searchBudget: 96,
};
type Result = ReturnType<HeadlessFight["result"]>;
function summary(rows: Result[]) {
  const mean = (f: (r: Result) => number) => rows.reduce((n, r) => n + f(r), 0) / rows.length;
  const survivors = rows.filter((r) => r.outcome === "win");
  const events = (event: string) =>
    rows.reduce((n, r) => n + r.dreadEvents.filter((e) => e.event === event).length, 0);
  return {
    n: rows.length,
    wins: survivors.length,
    losses: rows.filter((r) => r.outcome === "loss").length,
    timeouts: rows.filter((r) => r.outcome === "timeout").length,
    healthAll: mean((r) => r.finalHealth),
    healthSurvivors: survivors.length
      ? survivors.reduce((n, r) => n + r.finalHealth, 0) / survivors.length
      : null,
    turns: mean((r) => r.playerTurns),
    actions: mean((r) => r.actionCount),
    draws: mean((r) => r.metrics.drawn),
    killedBeforeFirstAction: rows.reduce((n, r) => n + r.metrics.killedBeforeFirstAction, 0),
    reached4: rows.filter((r) => r.telemetry.some((a) => Math.max(a.dreadStart, a.dreadEnd) >= 4))
      .length,
    reached8: rows.filter((r) => r.telemetry.some((a) => Math.max(a.dreadStart, a.dreadEnd) >= 8))
      .length,
    unlocked4: rows.filter((r) => r.dreadEvents.some((e) => e.at === 4 && e.event === "unlock"))
      .length,
    unlocked8: rows.filter((r) => r.dreadEvents.some((e) => e.at === 8 && e.event === "unlock"))
      .length,
    suppressions: events("suppressed"),
    reactivations: events("reactivate"),
    fightsWithSuppression: rows.filter((r) => r.dreadEvents.some((e) => e.event === "suppressed"))
      .length,
    suppressedPreBlockDamage: rows.reduce((n, r) => n + r.metrics.suppressedAttackDamage, 0),
  };
}
function crossReplay(result: Result, rules: "control" | "candidate") {
  const fight = new HeadlessFight({ ...result.config, rules });
  for (const action of result.trace) {
    if (fight.outcome() !== "running") break;
    // A different terminal result is valid. An invalid action is reported, not skipped.
    try {
      fight.step(action);
    } catch (error) {
      return {
        status: "illegal-prefix",
        error: String(error),
        ...brief(fight.result()),
      };
    }
  }
  return {
    status:
      fight.result().actionCount === result.actionCount ? "complete-sequence" : "terminal-prefix",
    ...brief(fight.result()),
  };
}
function brief(r: Result) {
  return {
    outcome: r.outcome,
    finalHealth: r.finalHealth,
    playerTurns: r.playerTurns,
    actionCount: r.actionCount,
  };
}
function divergence(control: Result, candidate: Result) {
  const index = control.trace.findIndex(
    (a, i) => JSON.stringify(a) !== JSON.stringify(candidate.trace[i]),
  );
  // A terminal prefix length difference is not a differing decision.
  if (index < 0 || candidate.trace[index] === undefined) return null;
  const left = new HeadlessFight(control.config),
    right = new HeadlessFight(candidate.config);
  for (const action of control.trace.slice(0, index)) {
    left.step(action);
    right.step(action);
  }
  const a = left.view().observation,
    b = right.view().observation;
  const planningSeed = `${budget.planningSeed}:${index}`;
  const auditedControl = chooseAction(a, control.config.policy, planningSeed, budget.searchBudget);
  const auditedCandidate = chooseAction(
    b,
    candidate.config.policy,
    planningSeed,
    budget.searchBudget,
  );
  if (
    JSON.stringify(auditedControl) !== JSON.stringify(control.trace[index]) ||
    JSON.stringify(auditedCandidate) !== JSON.stringify(candidate.trace[index])
  )
    throw new Error("Public-choice audit failed");
  const compact = (o: typeof a) =>
    o.kind !== "combat"
      ? o
      : {
          hp: o.hp,
          turn: o.turn,
          energy: o.energy,
          block: o.block,
          dread: o.dread,
          hand: o.hand,
          thresholds: o.thresholds,
          enemies: o.enemies.map(({ uid, hp, block, strength, intent }) => ({
            uid,
            hp,
            block,
            strength,
            intent,
          })),
        };
  return {
    index,
    control: { observation: compact(a), action: auditedControl },
    candidate: { observation: compact(b), action: auditedCandidate },
    audit: "choices reproduced from public observations only",
  };
}

const start = performance.now();
const cells = [];
type ExampleFight = Pick<
  Result,
  "config" | "outcome" | "finalHealth" | "playerTurns" | "actionCount" | "trace"
>;
const examples: {
  encounter: string;
  policy: string;
  seed: string;
  control: ExampleFight;
  candidate: ExampleFight;
  firstDivergence: ReturnType<typeof divergence>;
  controlUnderCandidate: ReturnType<typeof crossReplay>;
  candidateUnderControl: ReturnType<typeof crossReplay>;
}[] = [];
for (const encounter of PLAYTEST_ENCOUNTERS)
  for (const policy of policySchema.options) {
    const control: Result[] = [],
      candidate: Result[] = [];
    const pairs = [];
    for (const seed of seeds) {
      const common = {
        fixture: { deckId: "exposed", variant: "diagnostic-mixed" },
        encounterId: encounter.id,
        seed,
        policy,
        ...budget,
      };
      const a = new HeadlessFight(configSchema.parse({ ...common, rules: "control" })).auto();
      const b = new HeadlessFight(configSchema.parse({ ...common, rules: "candidate" })).auto();
      control.push(a);
      candidate.push(b);
      const differentTrace = JSON.stringify(a.trace) !== JSON.stringify(b.trace);
      const controlUnderCandidate = crossReplay(a, "candidate");
      const candidateUnderControl = crossReplay(b, "control");
      pairs.push({
        seed,
        control: brief(a),
        candidate: brief(b),
        differentTrace,
        controlUnderCandidate,
        candidateUnderControl,
      });
      if (
        examples.length < 6 &&
        b.metrics.suppressedAttackDamage > 0 &&
        !examples.some((e) => e.encounter === encounter.id && e.policy === policy)
      ) {
        examples.push({
          encounter: encounter.id,
          policy,
          seed,
          control: { config: a.config, ...brief(a), trace: a.trace },
          candidate: { config: b.config, ...brief(b), trace: b.trace },
          firstDivergence: differentTrace ? divergence(a, b) : null,
          controlUnderCandidate,
          candidateUnderControl,
        });
      }
    }
    const delta = (f: (r: Result) => number) =>
      candidate.reduce((n, r, i) => n + f(r) - f(control[i] ?? r), 0) / seeds.length;
    cells.push({
      encounter: encounter.id,
      policy,
      control: summary(control),
      candidate: summary(candidate),
      pairedCandidateMinusControl: {
        health: delta((r) => r.finalHealth),
        turns: delta((r) => r.playerTurns),
        actions: delta((r) => r.actionCount),
        betterHealth: pairs.filter((p) => p.candidate.finalHealth > p.control.finalHealth).length,
        worseHealth: pairs.filter((p) => p.candidate.finalHealth < p.control.finalHealth).length,
        differentTraces: pairs.filter((p) => p.differentTrace).length,
      },
      pairs,
    });
    process.stderr.write(
      `${encounter.id}/${policy}: ${cells.length * seeds.length * 2} policy fights\n`,
    );
  }
process.stdout.write(
  JSON.stringify({
    version: "v0.2-mixed-followup-1",
    policyVersion: POLICY_VERSION,
    seeds,
    budget,
    policyFights: 600,
    sharedActionReplays: 600,
    runtimeSeconds: (performance.now() - start) / 1000,
    definition:
      "Exposed slots: guard->unseen twice, remember->silence once. Original fixture matrix unchanged.",
    replayDefinition:
      "Replay the exact other-mode actions until their sequence ends, terminal outcome, or invalid action. Running means prefix-censored, not victory. Never substitute actions.",
    cells,
    examples,
  }) + "\n",
);
