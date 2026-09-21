import { cardDef, needsTarget } from "../../src/game/content/cards";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import type { Action, Run } from "../../src/game/model";
import {
  createPlaytestRun,
  PLAYTEST_DECKS,
  PLAYTEST_ENCOUNTERS,
} from "../../src/lab/fixtures/combat";
import { cardRating, combatAction, journeyAction } from "../../tests/support/pilot";

// Frozen before evaluation. No seed filtering or balance changes.
export const SEEDS = Array.from({ length: 8 }, (_, i) => `recovery-v03-${i + 1}`);
export const CAMPS = ["rest", "primary", "bread"] as const;
export const POLICIES = ["greedy", "heal-first"] as const;
type Policy = (typeof POLICIES)[number];
type Camp = (typeof CAMPS)[number];
type Deck = (typeof PLAYTEST_DECKS)[number]["id"];
type Outcome = "win" | "loss" | "timeout";

export function step(run: Run, action: Action): Run {
  const result = resolve(run, action);
  if (result.error) throw new Error(result.error);
  return result.run;
}

function winningAction(run: Run): Action | null {
  if (run.scene.kind !== "combat") return null;
  for (const card of run.scene.hand) {
    if (cardDef(card.def).cost > run.scene.energy) continue;
    const targets = needsTarget(cardDef(card.def))
      ? run.scene.enemies.filter((e) => e.hp > 0).map((e) => e.uid)
      : [null];
    for (const target of targets) {
      const action: Action = { type: "play", uid: card.uid, target };
      if (resolve(run, action).run.scene.kind === "reward") return action;
    }
  }
  return null;
}

function policyAction(run: Run, policy: Policy): Action {
  if (
    policy === "heal-first" &&
    run.hp < run.maxHp &&
    winningAction(run) &&
    run.scene.kind === "combat"
  ) {
    const bread = run.scene.hand.find((c) => c.def === "bread");
    if (bread && cardDef(bread.def).cost <= run.scene.energy) {
      const action: Action = { type: "play", uid: bread.uid, target: null };
      // Only reorder healing when a lethal remains available this turn.
      if (winningAction(step(run, action))) return action;
    }
  }
  return combatAction(run);
}

export function fight(
  input: Run,
  policy: Policy = "greedy",
  limit = 500,
  observe?: (run: Run, trace: string[]) => void,
) {
  let run = input;
  let turns = 0;
  const trace: string[] = [];
  for (let n = 0; n < limit && run.scene.kind === "combat"; n++) {
    turns = run.scene.turn; // Includes winning turn and fatal enemy phase.
    observe?.(run, trace);
    const action = policyAction(run, policy);
    trace.push(describe(run, action));
    run = step(run, action);
  }
  const outcome: Outcome =
    run.scene.kind === "combat"
      ? "timeout"
      : run.scene.kind === "ending" && !run.scene.won
        ? "loss"
        : "win";
  return { run, outcome, turns, trace };
}

function describe(run: Run, action: Action): string {
  if (run.scene.kind !== "combat") return action.type;
  const card = action.type === "play" ? run.scene.hand.find((c) => c.uid === action.uid) : null;
  return `t${run.scene.turn} hp${run.hp} ${card ? `${card.def}${card.upgraded ? "+" : ""}#${card.uid}` : action.type}${action.type === "play" ? ` -> ${action.target}` : ""}`;
}

export function shortStart(
  seed: string,
  deck: Deck,
  encounter: (typeof PLAYTEST_ENCOUNTERS)[number]["id"],
  hp: number,
  pressure: "battle" | "elite" = "battle",
) {
  const run = createPlaytestRun({ seed, deckId: deck, encounterId: encounter });
  run.hp = hp;
  run.route = [
    { id: "first", row: 0, lane: 1, kind: "battle", links: ["camp"] },
    { id: "camp", row: 1, lane: 1, kind: "camp", links: ["second"] },
    { id: "second", row: 2, lane: 1, kind: pressure, links: [] },
  ];
  run.location = "first";
  run.visited = ["first"];
  return run;
}

export function campAction(run: Run, camp: Camp, deck: Deck): Action {
  if (camp === "rest") return { type: "rest" };
  const id =
    camp === "bread" ? "bread" : { quiet: "needle", exposed: "cinder", defense: "shield" }[deck];
  const card = run.deck.find((c) => c.def === id && !c.upgraded);
  if (!card) throw new Error(`Missing upgrade target ${id}`);
  return { type: "upgrade", uid: card.uid };
}

export function followup(
  first: Run,
  camp: Camp,
  deck: Deck,
  pressure: "battle" | "elite",
  stream: string,
) {
  let run = step(first, { type: "reward", card: null });
  run = step(run, { type: "travel", node: "camp" });
  run = step(run, campAction(run, camp, deck));
  const campHp = run.hp;
  run = step(run, { type: "leave" });
  // Experimental intervention, not a legal full-adventure continuation.
  // Equal deck lengths and explicit stream give equal encounter and shuffle inputs.
  run.rng = newRun(stream).rng;
  run.route = run.route.map((n) => (n.id === "second" ? { ...n, kind: pressure } : n));
  run = step(run, { type: "travel", node: "second" });
  return { run, campHp };
}

type Row = {
  seed: string;
  deck: Deck;
  encounter: string;
  hp: number;
  policy: Policy;
  camp: Camp;
  pressure: string;
  first: Outcome;
  firstHp: number;
  firstTurns: number;
  second: Outcome | "not-entered";
  campHp: number | null;
  finalHp: number;
  secondTurns: number;
  secondEnemies: string[];
  secondRng: number | null;
};

function summarize(rows: Row[]) {
  return {
    n: rows.length,
    firstLoss: rows.filter((r) => r.first === "loss").length,
    firstTimeout: rows.filter((r) => r.first === "timeout").length,
    secondLoss: rows.filter((r) => r.second === "loss").length,
    secondTimeout: rows.filter((r) => r.second === "timeout").length,
    wins: rows.filter((r) => r.second === "win").length,
    // Unconditional endpoint includes deaths at zero. Timeouts remain explicit unknowns.
    meanFinalHp: rows.reduce((n, r) => n + r.finalHp, 0) / rows.length,
    meanTurns: rows.reduce((n, r) => n + r.firstTurns + r.secondTurns, 0) / rows.length,
    restNetLoss: rows.filter(
      (r) => r.camp === "rest" && r.second === "win" && r.finalHp < r.firstHp,
    ).length,
  };
}

export function study() {
  const rows: Row[] = [];
  let healingTrace: object | null = null;
  let sameTurnTrace: object | null = null;
  let probes = 0;
  const observe = (run: Run, prefix: string[], context: object) => {
    const lethal = winningAction(run);
    if (!lethal || run.hp >= run.maxHp || run.scene.kind !== "combat") return;
    const fast = step(run, lethal);
    if (!sameTurnTrace) {
      const heal = policyAction(run, "heal-first");
      const healed = step(run, heal);
      const finish = winningAction(healed);
      if (healed.hp > fast.hp && finish)
        sameTurnTrace = {
          context,
          prefix: [...prefix],
          fast: describe(run, lethal),
          fastHp: fast.hp,
          alternative: [describe(run, heal), describe(healed, finish)],
          alternativeHp: step(healed, finish).hp,
        };
    }
    if (healingTrace || probes >= 200) return;
    probes++;
    // A bounded tactical counterexample search, not a policy or outcome campaign.
    // Decline an available kill, take one enemy phase, then resume heal-first.
    const delayed = step(run, { type: "end" });
    if (delayed.scene.kind !== "combat") return;
    const result = fight(delayed, "heal-first", 30);
    if (result.outcome === "win" && result.run.hp > fast.hp && result.turns <= run.scene.turn + 2) {
      healingTrace = {
        context,
        prefix: [...prefix],
        state: {
          turn: run.scene.turn,
          hp: run.hp,
          block: run.scene.block,
          energy: run.scene.energy,
          hand: run.scene.hand.map((c) => c.def),
          enemies: run.scene.enemies,
        },
        fast: describe(run, lethal),
        fastHp: fast.hp,
        fastTurns: run.scene.turn,
        delayed: [describe(run, { type: "end" }), ...result.trace],
        delayedHp: result.run.hp,
        delayedTurns: result.turns,
      };
    }
  };
  for (const seed of SEEDS)
    for (const deck of PLAYTEST_DECKS)
      for (const encounter of PLAYTEST_ENCOUNTERS)
        for (const hp of [70, 45])
          for (const policy of POLICIES) {
            const context = {
              seed,
              deck: deck.id,
              encounter: encounter.id,
              hp,
              policy,
            };
            const first = fight(shortStart(seed, deck.id, encounter.id, hp), policy, 500, (r, t) =>
              observe(r, t, { ...context, phase: 1 }),
            );
            for (const pressure of ["battle", "elite"] as const)
              for (const camp of CAMPS) {
                const base = {
                  ...context,
                  camp,
                  pressure,
                  first: first.outcome,
                  firstHp: first.run.hp,
                  firstTurns: first.turns,
                };
                if (first.outcome !== "win") {
                  rows.push({
                    ...base,
                    second: "not-entered",
                    campHp: null,
                    finalHp: first.run.hp,
                    secondTurns: 0,
                    secondEnemies: [],
                    secondRng: null,
                  });
                  continue;
                }
                const next = followup(
                  first.run,
                  camp,
                  deck.id,
                  pressure,
                  `${seed}/second/${pressure}`,
                );
                if (next.run.scene.kind !== "combat") throw new Error("Missing follow-up combat");
                const second = fight(next.run, policy, 500, (r, t) =>
                  observe(r, t, {
                    ...context,
                    camp,
                    pressure,
                    phase: 2,
                    firstTrace: first.trace,
                  }),
                );
                rows.push({
                  ...base,
                  second: second.outcome,
                  campHp: next.campHp,
                  finalHp: second.run.hp,
                  secondTurns: second.turns,
                  secondEnemies: next.run.scene.enemies.map((e) => e.def),
                  secondRng: next.run.rng,
                });
              }
          }
  const groups = [];
  for (const hp of [70, 45])
    for (const policy of POLICIES)
      for (const pressure of ["battle", "elite"])
        for (const camp of CAMPS)
          groups.push({
            hp,
            policy,
            pressure,
            camp,
            ...summarize(
              rows.filter(
                (r) =>
                  r.hp === hp && r.policy === policy && r.pressure === pressure && r.camp === camp,
              ),
            ),
          });
  const paired = [];
  for (const upgrade of ["primary", "bread"] as const) {
    let restOnly = 0,
      upgradeOnly = 0,
      upgradeHigherHp = 0,
      upgradeFaster = 0;
    const examples: Row[] = [];
    for (const rest of rows.filter((r) => r.camp === "rest")) {
      const other = rows.find(
        (r) =>
          r.seed === rest.seed &&
          r.deck === rest.deck &&
          r.encounter === rest.encounter &&
          r.hp === rest.hp &&
          r.policy === rest.policy &&
          r.pressure === rest.pressure &&
          r.camp === upgrade,
      );
      if (!other) throw new Error("Missing paired row");
      if (rest.second === "win" && other.second !== "win") {
        restOnly++;
        if (examples.length < 2) examples.push(rest, other);
      }
      if (other.second === "win" && rest.second !== "win") upgradeOnly++;
      if (other.second === "win" && rest.second === "win") {
        if (other.finalHp > rest.finalHp) upgradeHigherHp++;
        if (other.secondTurns < rest.secondTurns) upgradeFaster++;
      }
    }
    paired.push({
      upgrade,
      restOnly,
      upgradeOnly,
      upgradeHigherHp,
      upgradeFaster,
      examples,
    });
  }
  return {
    seeds: SEEDS,
    groups,
    paired,
    healingTrace,
    sameTurnTrace,
    probes,
    rows,
  };
}

export function adventures() {
  const rows = [];
  for (const seed of SEEDS)
    for (const hp of [70, 45])
      for (const camp of ["adaptive", "rest", "upgrade"] as const) {
        let run = newRun(`${seed}/adventure`);
        run.hp = hp;
        let turns = 0,
          rests = 0,
          upgrades = 0,
          actions = 0;
        const camps = [];
        for (; actions < 3000 && run.scene.kind !== "ending"; actions++) {
          let action = journeyAction(run);
          if (run.scene.kind === "camp" && !run.scene.used) {
            if (camp === "rest") action = { type: "rest" };
            if (camp === "upgrade") {
              const card = run.deck
                .filter((c) => !c.upgraded)
                .sort((a, b) => cardRating(b.def) - cardRating(a.def))[0];
              action = card ? { type: "upgrade", uid: card.uid } : { type: "rest" };
            }
            if (action.type === "rest") rests++;
            if (action.type === "upgrade") upgrades++;
            camps.push({ act: run.act, hp: run.hp, action });
          }
          const before = run;
          run = step(run, action);
          if (
            before.scene.kind === "combat" &&
            (run.scene.kind !== "combat" || run.scene.turn !== before.scene.turn)
          )
            turns++;
        }
        rows.push({
          seed,
          hp,
          camp,
          outcome: run.scene.kind === "ending" ? (run.scene.won ? "win" : "loss") : "timeout",
          finalHp: run.hp,
          battles: run.stats.battles,
          turns,
          rests,
          upgrades,
          camps,
        });
      }
  return rows;
}

if (import.meta.main)
  console.log(JSON.stringify({ short: study(), adventures: adventures() }, null, 2));
