import type { LabConfig } from "./config";
import { selectAction } from "./policies/selection";
import { cardDef, value } from "../game/content/cards";
import { cardCost } from "../game/selectors/combat";
import { resolve } from "../game/engine/resolve";
import { runSchema } from "../game/model";
import type { Run, CombatAction } from "../game/model";
import { createHeadlessRun } from "./fixtures/headless";
import { legalActions } from "./legal-actions";
import { observe } from "./observation";

const LAB_VERSION = "lab-1";

export function assertInvariants(run: Run) {
  runSchema.parse(run);
  if (run.hp > run.maxHp) throw new Error("Health above cap");
  const deck = new Map(run.deck.map((c) => [c.uid, c]));
  if (deck.size !== run.deck.length) throw new Error("Duplicate deck UID");
  if (run.scene.kind !== "combat") return;
  const c = run.scene;
  if (run.hp <= 0 || c.hand.length > 10) throw new Error("Invalid live combat");
  const zones = [...c.hand, ...c.draw, ...c.discard, ...c.exhaust];
  if (zones.length !== deck.size || new Set(zones.map((c) => c.uid)).size !== deck.size)
    throw new Error("Zone conservation failed");
  for (const card of zones) {
    const original = deck.get(card.uid);
    if (!original || original.def !== card.def || original.upgraded !== card.upgraded)
      throw new Error("Zone identity changed");
  }
  const ids = [...zones.map((c) => c.uid), ...c.enemies.map((e) => e.uid)];
  if (new Set(ids).size !== ids.length || ids.some((id) => id >= run.nextId))
    throw new Error("Invalid entity allocation");
  if (
    new Set(c.fired).size !== (c.fired?.length ?? 0) ||
    c.fired?.some((t) => ![4, 8, 5, 9].includes(t)) ||
    (c.dreadResponse !== undefined && c.fired !== undefined)
  )
    throw new Error("Invalid threshold history");
  if (c.enemies.some((e) => e.hp > e.maxHp)) throw new Error("Enemy health above cap");
}

function snapshot(run: Run) {
  const c = run.scene;
  return {
    hp: run.hp,
    turn: c.kind === "combat" ? c.turn : null,
    hand: c.kind === "combat" ? c.hand.length : 0,
    energy: c.kind === "combat" ? c.energy : 0,
    dread: c.kind === "combat" ? c.dread : 0,
    enemyHp: c.kind === "combat" ? c.enemies.reduce((n, e) => n + e.hp, 0) : 0,
  };
}

export function simulate(config: LabConfig, detailed = false) {
  let run = createHeadlessRun(config);
  const history = [];
  const trace: CombatAction[] = [];
  const replay = [];
  const cards: Record<
    string,
    {
      drawn: number;
      playable: number;
      held: number;
      played: number;
      discarded: number;
      turnTotal: number;
    }
  > = {};
  for (const card of run.deck)
    cards[card.def] ??= {
      drawn: 0,
      playable: 0,
      held: 0,
      played: 0,
      discarded: 0,
      turnTotal: 0,
    };
  let generated = 3,
    spent = 0,
    drawn = 5,
    unused = 0,
    damageTaken = 0,
    blocked = 0;
  let forcedPassTurns = 0,
    passOnlyTurns = 0,
    playsThisTurn = 0,
    opportunitiesThisTurn = 0;
  let maxPassStreak = 0,
    passStreak = 0,
    minHp = run.hp;
  let firstDamage: number | null = null,
    firstInteraction: number | null = null;
  let outcome: "win" | "loss" | "timeout" = "timeout";
  const states = new Set<string>();
  let repeatedState = false;
  assertInvariants(run);
  if (run.scene.kind === "combat")
    for (const card of run.scene.hand) {
      const row = cards[card.def];
      if (row) row.drawn++;
    }
  while (
    run.scene.kind === "combat" &&
    trace.length < config.maxActions &&
    run.scene.turn <= config.maxTurns
  ) {
    const c = run.scene;
    const before = snapshot(run);
    const observation = observe(run, config.rules);
    const legal = legalActions(observation);
    const action = selectAction(
      observation,
      legal,
      config.bot,
      `${config.planningSeed}:${trace.length}`,
      config.searchBudget,
    );
    if (!legal.some((a) => JSON.stringify(a) === JSON.stringify(action)))
      throw new Error("Policy selected illegal action");
    const playable = new Set(legal.flatMap((a) => (a.type === "play" ? [a.uid] : [])));
    opportunitiesThisTurn += playable.size;
    for (const card of c.hand) {
      const row = cards[card.def];
      if (row) {
        row.held++;
        if (playable.has(card.uid)) row.playable++;
      }
    }
    const played = action.type === "play" ? c.hand.find((x) => x.uid === action.uid) : undefined;
    if (action.type === "work") spent++;
    if (played) {
      const def = cardDef(played.def);
      spent += cardCost(run, c, def);
      generated += def.effects.reduce(
        (n, e) => n + (e.kind === "energy" ? value(e, played.upgraded) : 0),
        0,
      );
      const row = cards[played.def];
      if (row) {
        row.played++;
        row.turnTotal += c.turn;
      }
      playsThisTurn++;
    }
    if (action.type === "end") {
      unused += c.energy;
      if (!playsThisTurn) {
        passOnlyTurns++;
        passStreak++;
      } else passStreak = 0;
      maxPassStreak = Math.max(maxPassStreak, passStreak);
      if (!opportunitiesThisTurn) forcedPassTurns++;
      playsThisTurn = opportunitiesThisTurn = 0;
      for (const card of c.hand) {
        const row = cards[card.def];
        if (row && !cardDef(card.def).retain) row.discarded++;
      }
    }
    const result = resolve(run, action, config.rules);
    if (result.error) throw new Error(result.error);
    assertInvariants(result.run);
    // Use effect snapshots for exact draws, including reshuffles and terminal card effects.
    let previous = run;
    for (const frame of result.frames) {
      if (frame.run.scene.kind === "combat" && previous.scene.kind === "combat") {
        if (frame.run.scene.relicTurn?.coalUsed && !previous.scene.relicTurn?.coalUsed) generated++;
        const old = new Set(previous.scene.hand.map((x) => x.uid));
        for (const card of frame.run.scene.hand)
          if (!old.has(card.uid)) {
            const row = cards[card.def];
            if (row) row.drawn++;
          }
        if (frame.cue === "enemy") {
          damageTaken += Math.max(0, previous.hp - frame.run.hp);
          blocked += Math.max(0, previous.scene.block - frame.run.scene.block);
          firstInteraction ??= c.turn;
        }
      }
      previous = frame.run;
    }
    drawn += result.accounting.drawn;
    if (action.type === "end" && result.run.scene.kind === "combat") generated += 3;
    if (result.run.stats.damage > run.stats.damage) firstDamage ??= c.turn;
    minHp = Math.min(minHp, result.run.hp);
    history.push({
      ...before,
      legal: legal.length,
      playable: playable.size,
      action: action.type,
      card: played?.def ?? null,
      hpAfter: result.run.hp,
    });
    if (detailed)
      replay.push({
        before: run,
        legal,
        selected: action,
        after: result.run,
        accounting: result.accounting,
      });
    trace.push(action);
    run = result.run;
    // Exclude counters, logs and RNG from repetition signal. This is a warning, not proof of a loop.
    if (action.type === "end" && run.scene.kind === "combat") {
      const key = JSON.stringify([
        run.hp,
        run.scene.dread,
        run.scene.hand.map((c) => c.def).sort(),
        run.scene.exhaust.map((c) => c.def).sort(),
        run.scene.enemies.map((e) => [e.def, e.hp, e.strength, e.step % 12]),
      ]);
      if (states.has(key)) repeatedState = true;
      states.add(key);
    }
  }
  if (run.scene.kind === "ending") outcome = run.scene.won ? "win" : "loss";
  return {
    version: LAB_VERSION,
    config,
    outcome,
    finalHealth: run.hp,
    turns: history.at(-1)?.turn ?? 1,
    actions: trace.length,
    generated,
    spent,
    unused,
    drawn,
    damage: run.stats.damage,
    damageTaken,
    blocked,
    minHp,
    firstDamage,
    firstInteraction,
    forcedPassTurns,
    passOnlyTurns,
    maxPassStreak,
    repeatedState,
    nonGameSignal: maxPassStreak >= 3 || (outcome === "loss" && (history.at(-1)?.turn ?? 1) <= 2),
    comeback: outcome === "win" && minHp <= 20,
    cards,
    history,
    trace,
    replay,
  };
}
type LabResult = ReturnType<typeof simulate>;

export function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? null;
  return {
    min: q(0),
    p25: q(0.25),
    median: q(0.5),
    p75: q(0.75),
    p95: q(0.95),
    max: q(1),
  };
}
type ReportRow = Pick<
  LabResult,
  | "config"
  | "outcome"
  | "finalHealth"
  | "turns"
  | "actions"
  | "nonGameSignal"
  | "comeback"
  | "repeatedState"
  | "spent"
  | "generated"
  | "unused"
  | "blocked"
  | "forcedPassTurns"
> & { history: { legal: number }[] };
export function summarizeLab(results: ReportRow[]) {
  const cells = new Map<string, ReportRow[]>();
  for (const r of results) {
    const key = [
      r.config.bot,
      r.config.fixture.deckId,
      r.config.fixture.variant,
      r.config.encounterId,
      r.config.rules,
    ].join("/");
    const rows = cells.get(key) ?? [];
    rows.push(r);
    cells.set(key, rows);
  }
  return [...cells].map(([cell, rows]) => {
    const n = rows.length,
      wins = rows.filter((r) => r.outcome === "win").length;
    const p = wins / n,
      z = 1.96,
      denominator = 1 + (z * z) / n;
    const center = (p + (z * z) / (2 * n)) / denominator;
    const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
    const mean = (f: (r: ReportRow) => number) => rows.reduce((n, r) => n + f(r), 0) / n;
    return {
      cell,
      n,
      wins,
      winRate: p,
      wilson95: [center - margin, center + margin],
      losses: rows.filter((r) => r.outcome === "loss").length,
      timeouts: rows.filter((r) => r.outcome === "timeout").length,
      health: mean((r) => r.finalHealth),
      turns: distribution(rows.map((r) => r.turns ?? 1)),
      actions: distribution(rows.map((r) => r.actions)),
      nonGameSignals: rows.filter((r) => r.nonGameSignal).length,
      lowHealthWins: rows.filter((r) => r.comeback).length,
      repeatedStates: rows.filter((r) => r.repeatedState).length,
      spent: mean((r) => r.spent),
      generated: mean((r) => r.generated),
      unused: mean((r) => r.unused),
      blocked: mean((r) => r.blocked),
      forcedPassTurns: mean((r) => r.forcedPassTurns),
      legalActions: mean(
        (r) => r.history.reduce((n, h) => n + h.legal, 0) / Math.max(1, r.actions),
      ),
      examples: [
        ...new Set([
          rows.reduce((a, b) => (a.finalHealth < b.finalHealth ? a : b)).config.seed,
          rows.reduce((a, b) => ((a.turns ?? 0) > (b.turns ?? 0) ? a : b)).config.seed,
          rows[0]?.config.seed,
        ]),
      ],
    };
  });
}
