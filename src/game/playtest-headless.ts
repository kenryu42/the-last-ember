import { z } from "zod";
import { cardDef, enemyDef, needsTarget } from "./content";
import {
  intention,
  newRun,
  resolve,
  shuffle,
  thresholdStrength,
} from "./engine";
import { createPlaytestRun } from "./playtest-fixtures";
import {
  beginRecord,
  recordAction,
  summarize,
  thresholdState,
} from "./playtest";
import type { TestRules } from "./playtest";
import type { Card, Run } from "./model";

const seedSchema = z
  .string()
  .min(1)
  .max(80)
  .refine((s) => s.trim() === s);
export const policySchema = z.enum(["offense", "defense", "dread", "planner"]);
// Preserve the v1 enumeration used by the frozen campaign scripts.
export const allPolicySchema = z.union([policySchema, z.literal("planner-v2")]);
export type Policy = z.infer<typeof allPolicySchema>;
export const POLICY_VERSION = "public-belief-v1";
export const PLANNER_V2_VERSION = "public-belief-phase-v2";
const fixtureSchema = z.discriminatedUnion("variant", [
  z.strictObject({
    variant: z.literal("base"),
    deckId: z.enum(["quiet", "exposed", "defense"]),
  }),
  z.strictObject({
    variant: z.literal("ablation"),
    deckId: z.enum(["exposed", "defense"]),
  }),
  z.strictObject({
    variant: z.literal("diagnostic-mixed"),
    deckId: z.literal("exposed"),
  }),
]);
export const configSchema = z.strictObject({
  rules: z.enum(["control", "candidate"]),
  fixture: fixtureSchema,
  encounterId: z.enum(["fury", "reinforce", "ward"]),
  seed: seedSchema,
  policy: allPolicySchema.default("offense"),
  planningSeed: seedSchema.default("belief-v1"),
  maxTurns: z.number().int().min(1).max(200).default(40),
  maxActions: z.number().int().min(1).max(2000).default(400),
  searchBudget: z.number().int().min(1).max(256).default(96),
});
export type HeadlessConfig = z.infer<typeof configSchema>;
export const combatActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("end") }),
  z.strictObject({
    type: z.literal("play"),
    uid: z.number().int().nonnegative(),
    target: z.number().int().nonnegative().nullable(),
  }),
]);
export type CombatAction = z.infer<typeof combatActionSchema>;

export function createHeadlessRun(
  config: Pick<HeadlessConfig, "fixture" | "seed" | "encounterId">,
): Run {
  const fixture =
    config.fixture.variant === "diagnostic-mixed"
      ? ({ deckId: "exposed", variant: "base" } as const)
      : config.fixture;
  const run = createPlaytestRun({
    ...fixture,
    seed: config.seed,
    encounterId: config.encounterId,
  });
  if (
    config.fixture.variant === "diagnostic-mixed" &&
    run.scene.kind === "combat"
  ) {
    // Slot-preserving substitution commutes with shuffle/draw. No RNG consumed.
    for (const card of [...run.deck, ...run.scene.hand, ...run.scene.draw]) {
      if (card.def === "guard") card.def = "unseen";
      else if (card.def === "remember") card.def = "silence";
    }
  }
  return run;
}

// Explicit allowlist. No run seed, RNG, nextId, route, log, reward or ordered draw pile.
// Sorting every pile also prevents insertion order becoming a hidden-order side channel.
const sorted = (cards: Card[]) =>
  cards.map((c) => ({ ...c })).sort((a, b) => a.uid - b.uid);
export function observe(run: Run, rules: TestRules) {
  const common = {
    rules,
    hp: run.hp,
    maxHp: run.maxHp,
    act: run.act,
    relics: [...run.relics],
  };
  const c = run.scene;
  if (c.kind !== "combat") return { ...common, kind: "terminal" as const };
  return {
    ...common,
    kind: "combat" as const,
    turn: c.turn,
    energy: c.energy,
    block: c.block,
    dread: c.dread,
    reaction: c.reaction,
    fired: [...c.fired],
    hand: sorted(c.hand),
    drawComposition: sorted(c.draw),
    discard: sorted(c.discard),
    exhaust: sorted(c.exhaust),
    enemies: c.enemies.map((enemy) => ({
      ...enemy,
      pattern: structuredClone(enemyDef(enemy.def).pattern),
      intent: {
        ...intention(
          enemy,
          c,
          rules === "candidate" ? thresholdStrength(run, c) : 0,
        ),
      },
    })),
    thresholds: thresholdState(run, c, rules),
    cards: sorted(c.hand).map((card) => ({
      uid: card.uid,
      definition: structuredClone(cardDef(card.def)),
    })),
  };
}
export type Observation = ReturnType<typeof observe>;
export function legalActions(o: Observation): CombatAction[] {
  if (o.kind !== "combat") return [];
  const actions: CombatAction[] = [];
  for (const card of o.hand) {
    const def = cardDef(card.def);
    if (def.cost > o.energy) continue;
    if (needsTarget(def)) {
      for (const enemy of o.enemies)
        if (enemy.hp > 0)
          actions.push({ type: "play", uid: card.uid, target: enemy.uid });
    } else actions.push({ type: "play", uid: card.uid, target: null });
  }
  actions.push({ type: "end" });
  return actions;
}

// Build from the observation alone. Even speculative end/draw resolves use this
// independent belief RNG, never the fixture seed or actual engine state.
function belief(
  o: Extract<Observation, { kind: "combat" }>,
  seed: string,
): Run {
  const run = newRun(seed);
  run.hp = o.hp;
  run.maxHp = o.maxHp;
  run.act = o.act;
  run.relics = [...o.relics];
  run.deck = [...o.hand, ...o.drawComposition, ...o.discard, ...o.exhaust].map(
    (c) => ({ ...c }),
  );
  run.nextId =
    Math.max(0, ...run.deck.map((c) => c.uid), ...o.enemies.map((e) => e.uid)) +
    1;
  run.scene = {
    kind: "combat",
    encounter: "Public belief",
    type: "battle",
    turn: o.turn,
    energy: o.energy,
    block: o.block,
    dread: o.dread,
    reaction: o.reaction,
    fired: [...o.fired],
    hand: sorted(o.hand),
    draw: shuffle(run, sorted(o.drawComposition)),
    discard: sorted(o.discard),
    exhaust: sorted(o.exhaust),
    log: [],
    enemies: o.enemies.map(
      ({ pattern: _pattern, intent: _intent, ...enemy }) => ({ ...enemy }),
    ),
  };
  return run;
}

function score(
  run: Run,
  start: Extract<Observation, { kind: "combat" }>,
  policy: Policy,
) {
  if (run.scene.kind === "ending")
    return run.scene.won ? 100000 + run.hp : -100000;
  const o = observe(run, start.rules);
  if (o.kind !== "combat") return -100000;
  const healthWeight =
    policy === "offense" ? 0.4 : policy === "defense" ? 3 : 1.5;
  const damage =
    start.enemies.reduce((n, e) => n + e.hp, 0) -
    o.enemies.reduce((n, e) => n + e.hp, 0);
  const kills =
    start.enemies.filter((e) => e.hp > 0).length -
    o.enemies.filter((e) => e.hp > 0).length;
  const incoming = o.enemies
    .filter((e) => e.hp > 0 && e.joinsOn <= o.turn)
    .reduce(
      (n, e) =>
        n +
        (e.intent.kind === "attack" || e.intent.kind === "drain"
          ? e.intent.amount
          : 0),
      0,
    );
  const sameTurn = o.turn === start.turn;
  // Block beyond the current threat has value only with an affordable Iron answer.
  const shieldReady = o.hand.some(
    (c) => c.def === "shield" && o.energy >= cardDef(c.def).cost,
  );
  const blockValue =
    Math.min(o.block, incoming) * healthWeight +
    (shieldReady ? o.block * 0.8 : 0);
  const dreadPenalty =
    policy === "dread" || policy === "planner"
      ? o.thresholds.reduce(
          (n, t) => n + (o.dread >= t.at ? (t.state === "locked" ? 7 : 4) : 0),
          0,
        )
      : 0;
  return (
    damage +
    kills * 15 +
    (o.hp - start.hp) * healthWeight +
    (sameTurn ? blockValue + o.energy * 3 + o.hand.length * 0.8 : -8) -
    dreadPenalty
  );
}

export function chooseAction(
  o: Observation,
  policy: Policy,
  planningSeed: string,
  budget: number,
): CombatAction {
  if (policy === "planner-v2") return planV2(o, planningSeed, budget).action;
  if (o.kind !== "combat") throw new Error("No combat decision available");
  const root = belief(o, planningSeed);
  let best: CombatAction = { type: "end" };
  let bestScore = -Infinity;
  let used = 0;
  let frontier: { run: Run; first: CombatAction | null }[] = [
    { run: root, first: null },
  ];
  const depth = policy === "planner" ? 3 : 1;
  for (let d = 0; d < depth && used < budget; d++) {
    const next: { run: Run; first: CombatAction; score: number }[] = [];
    for (const node of frontier) {
      for (const action of legalActions(observe(node.run, o.rules))) {
        if (used >= budget) break;
        used++;
        const result = resolve(node.run, action, o.rules, {
          captureFrames: false,
        });
        if (result.error) throw new Error(result.error);
        const first = node.first ?? action;
        const value = score(result.run, o, policy) - d * 0.01;
        if (value > bestScore) {
          bestScore = value;
          best = first;
        }
        if (action.type !== "end" && result.run.scene.kind === "combat")
          next.push({ run: result.run, first, score: value });
      }
    }
    frontier = next.sort((a, b) => b.score - a.score).slice(0, 4);
  }
  return best;
}

// Score the actual projected enemy phase, including thresholds, Howl order,
// drains and defeat. No copied combat arithmetic or actual hidden state.
function phaseScore(
  run: Run,
  start: Extract<Observation, { kind: "combat" }>,
  healthWeight: number,
  winUtility: "terminal" | "material" = "terminal",
) {
  if (run.scene.kind === "ending") {
    if (!run.scene.won) return -100000;
    // In the material experiment, winning removes the remaining enemy HP and
    // threats on the same scale as nonterminal states. Death remains prohibitive.
    return winUtility === "material"
      ? start.enemies.reduce((n, e) => n + e.hp + (e.hp > 0 ? 18 : 0), 0) +
          healthWeight * (run.hp - start.hp)
      : 100000 + run.hp * healthWeight;
  }
  if (run.scene.kind !== "combat") throw new Error("Unexpected planning scene");
  return (
    start.enemies.reduce((n, e) => n + e.hp, 0) -
    run.scene.enemies.reduce((n, e) => n + e.hp, 0) +
    18 *
      (start.enemies.filter((e) => e.hp > 0).length -
        run.scene.enemies.filter((e) => e.hp > 0).length) +
    healthWeight * (run.hp - start.hp)
  );
}

export function planV2(
  o: Observation,
  planningSeed: string,
  budget: number,
  healthWeight = 3,
) {
  if (o.kind !== "combat") throw new Error("No combat decision available");
  const samples = 3;
  const roots = Array.from({ length: samples }, (_, i) =>
    belief(o, `${planningSeed}:sample:${i}`),
  );
  let frontier: { runs: Run[]; first: CombatAction | null }[] = [
    { runs: roots, first: null },
  ];
  let used = 0;
  let best: CombatAction = { type: "end" };
  let bestScore = -Infinity;
  for (let depth = 0; depth < 3 && used < budget; depth++) {
    const next: { runs: Run[]; first: CombatAction; value: number }[] = [];
    for (const node of frontier) {
      const firstRun = node.runs[0];
      if (!firstRun) throw new Error("Empty belief set");
      // Only common legal continuations are shared across sampled worlds.
      // Replan after actual draws; never act on a sample-only card ID.
      const legal = legalActions(observe(firstRun, o.rules)).filter((action) =>
        node.runs.every((run) =>
          legalActions(observe(run, o.rules)).some(
            (other) => JSON.stringify(other) === JSON.stringify(action),
          ),
        ),
      );
      for (const action of legal) {
        const required = samples * (action.type === "end" ? 1 : 2);
        if (used + required > budget) continue;
        const runs: Run[] = [];
        let value = 0;
        for (const run of node.runs) {
          const played = resolve(run, action, o.rules, {
            captureFrames: false,
          });
          used++;
          if (played.error) throw new Error(played.error);
          runs.push(played.run);
          let phase = played.run;
          if (action.type !== "end" && phase.scene.kind === "combat") {
            const ended = resolve(phase, { type: "end" }, o.rules, {
              captureFrames: false,
            });
            used++;
            if (ended.error) throw new Error(ended.error);
            phase = ended.run;
          }
          value += phaseScore(phase, o, healthWeight) / samples;
        }
        value -= depth * 0.01;
        const first = node.first ?? action;
        if (value > bestScore) {
          best = first;
          bestScore = value;
        }
        if (
          action.type !== "end" &&
          runs.every((run) => run.scene.kind === "combat")
        )
          next.push({ runs, first, value });
      }
    }
    frontier = next.sort((a, b) => b.value - a.value).slice(0, 3);
  }
  return { action: best, engineCalls: used, samples, value: bestScore };
}

// Experimental root-action rollouts. Continuations receive a fresh public
// observation after each simulated draw, never the real deck order.
export function planHorizon(
  o: Observation,
  planningSeed: string,
  budget: number,
  phases: 1 | 2,
  continuation: "offense" | "sequence" = "offense",
  winUtility: "terminal" | "material" = "terminal",
) {
  if (o.kind !== "combat") throw new Error("No combat decision available");
  const fallback = planV2(o, planningSeed, Math.min(256, budget));
  const actions = legalActions(o);
  const samples = 3;
  const quota = Math.floor(
    (budget - fallback.engineCalls) / (actions.length * samples),
  );
  const roots = Array.from({ length: samples }, (_, i) =>
    belief(o, `${planningSeed}:sample:${i}`),
  );
  let engineCalls = fallback.engineCalls;
  let completedCandidates = 0;
  let best = fallback.action;
  let bestValue = -Infinity;
  const evaluations: {
    action: CombatAction;
    value: number | null;
    completedSamples: number;
  }[] = [];
  for (const action of actions) {
    let total = 0,
      completedSamples = 0;
    for (const [sample, root] of roots.entries()) {
      if (quota < 1) continue;
      const initial = resolve(root, action, o.rules, { captureFrames: false });
      if (initial.error) throw new Error(initial.error);
      let run = initial.run;
      let used = 1,
        steps = 0;
      while (run.scene.kind === "combat" && run.scene.turn < o.turn + phases) {
        const observation = observe(run, o.rules);
        const width = legalActions(observation).length;
        const continuationBudget = continuation === "sequence" ? 96 : width;
        // Reserve the full continuation allowance plus its chosen transition.
        // Count actual calls; equal quotas prevent action-order starvation.
        if (used + continuationBudget + 1 > quota) break;
        const seed = `${planningSeed}:roll:${sample}:${steps}`;
        const plan =
          continuation === "sequence"
            ? planV2(observation, seed, continuationBudget)
            : null;
        const next =
          plan?.action ?? chooseAction(observation, "offense", seed, width);
        const result = resolve(run, next, o.rules, { captureFrames: false });
        if (result.error) throw new Error(result.error);
        run = result.run;
        used += (plan?.engineCalls ?? width) + 1;
        steps++;
      }
      engineCalls += used;
      if (run.scene.kind !== "combat" || run.scene.turn >= o.turn + phases) {
        completedSamples++;
        total += phaseScore(run, o, 3, winUtility);
      }
    }
    const value = completedSamples === samples ? total / samples : null;
    evaluations.push({ action, value, completedSamples });
    // Never compare partial and complete horizons. Keep the original planner if
    // the budget cannot fully evaluate any root action across all beliefs.
    if (value !== null) {
      completedCandidates++;
      if (value > bestValue) {
        bestValue = value;
        best = action;
      }
    }
  }
  return {
    action: best,
    engineCalls,
    completedCandidates,
    candidates: actions.length,
    evaluations,
    phases,
  };
}

export class HeadlessFight {
  private run: Run;
  private record;
  private trace: CombatAction[] = [];
  private readonly policyVersion: string;
  constructor(readonly config: HeadlessConfig) {
    this.policyVersion =
      config.policy === "planner-v2" ? PLANNER_V2_VERSION : POLICY_VERSION;
    this.run = createHeadlessRun(config);
    this.record = beginRecord(
      {
        ...config,
        ...config.fixture,
        // Telemetry arithmetic only uses rules. Export the actual diagnostic
        // variant via result.config without extending the UI's variant schema.
        variant:
          config.fixture.variant === "diagnostic-mixed"
            ? "base"
            : config.fixture.variant,
        player: `${config.policy}/${this.policyVersion}`,
      },
      this.run,
    );
    // Automated results must remain byte deterministic and must not pose as human timing.
    this.record.startedAt = "automated";
  }
  outcome(): "win" | "loss" | "timeout" | "running" {
    if (this.run.scene.kind === "ending")
      return this.run.scene.won ? "win" : "loss";
    if (
      this.trace.length >= this.config.maxActions ||
      (this.run.scene.kind === "combat" &&
        this.run.scene.turn > this.config.maxTurns)
    )
      return "timeout";
    return "running";
  }
  view() {
    const observation = observe(this.run, this.config.rules);
    return {
      outcome: this.outcome(),
      observation,
      legalActions:
        this.outcome() === "running" ? legalActions(observation) : [],
    };
  }
  step(input: unknown) {
    const action = combatActionSchema.parse(input);
    if (this.outcome() !== "running")
      throw new Error("Fight is terminal or budget exhausted");
    if (
      !legalActions(observe(this.run, this.config.rules)).some(
        (a) => JSON.stringify(a) === JSON.stringify(action),
      )
    )
      throw new Error("Illegal action");
    const result = resolve(this.run, action, this.config.rules);
    if (result.error) throw new Error(result.error);
    this.record = recordAction(this.record, this.run, action, result, 0, 0);
    this.run = result.run;
    this.trace.push(action);
    return this.view();
  }
  auto() {
    while (this.outcome() === "running")
      this.step(
        chooseAction(
          observe(this.run, this.config.rules),
          this.config.policy,
          `${this.config.planningSeed}:${this.trace.length}`,
          this.config.searchBudget,
        ),
      );
    return this.result();
  }
  result() {
    const metrics = summarize(this.record);
    return {
      config: this.config,
      policyVersion: this.policyVersion,
      outcome: this.outcome(),
      finalHealth: this.run.hp,
      playerTurns:
        this.record.result?.playerTurns ??
        this.record.actions.at(-1)?.turn ??
        1,
      actionCount: this.trace.length,
      metrics,
      dreadEvents: this.record.actions.flatMap((a) => a.thresholdEvents),
      // Replay output is separate from observations and is never sent to policies.
      trace: structuredClone(this.trace),
      telemetry: structuredClone(this.record.actions),
    };
  }
}

const commandSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("start"), config: configSchema }),
  z.strictObject({ op: z.literal("observe") }),
  z.strictObject({ op: z.literal("legal") }),
  z.strictObject({ op: z.literal("step"), action: combatActionSchema }),
  z.strictObject({ op: z.literal("result") }),
]);
export class PlaytestProtocol {
  private fight: HeadlessFight | null = null;
  handle(input: unknown): unknown {
    try {
      const command = commandSchema.parse(input);
      if (command.op === "start") {
        const next = new HeadlessFight(command.config);
        this.fight = next;
        return { ok: true, ...next.view() };
      }
      if (!this.fight) throw new Error("Start a fight first");
      switch (command.op) {
        case "observe":
          return { ok: true, ...this.fight.view() };
        case "legal":
          return { ok: true, legalActions: this.fight.view().legalActions };
        case "step":
          return { ok: true, ...this.fight.step(command.action) };
        case "result":
          return { ok: true, result: this.fight.result() };
      }
    } catch (error) {
      return {
        ok: false,
        outcome: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
