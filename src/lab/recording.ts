import { cardDef } from "../game/content/cards";
import { dreadResponse } from "../game/selectors/intentions";
import { resolve } from "../game/engine/resolve";
import type { Action, Resolution, Run } from "../game/model";
import type { TestRules, TestConfig } from "./config";
import { thresholdState } from "../game/selectors/dread";
export function projectPhase(run: Run, mode: TestRules) {
  return resolve(run, { type: "end" }, mode);
}

interface ActionRecord {
  turn: number;
  action: "play" | "end" | "work" | "bearer";
  ember?: Resolution["accounting"]["ember"];
  card: string | null;
  target: number | null;
  drawn: number;
  played: number;
  damage: number;
  unusedEnergy: number | null;
  unplayed: string[];
  retained: string[];
  dreadStart: number;
  dreadEnd: number;
  thresholdEvents: { at: number; event: string; dread: number }[];
  suppressedAttackDamage: number;
  killedBeforeFirstAction: number;
  decisionMs: number;
}
export interface FightRecord {
  version: "0.2";
  config: TestConfig;
  startedAt: string;
  initialDrawn: number;
  initialDread: number;
  actions: ActionRecord[];
  result: null | {
    outcome: "win" | "loss";
    finalHealth: number;
    playerTurns: number;
    durationMs: number;
  };
}
export function beginRecord(config: TestConfig, run: Run): FightRecord {
  return {
    version: "0.2",
    config: { ...config },
    startedAt: new Date().toISOString(),
    initialDrawn: run.scene.kind === "combat" ? run.scene.hand.length : 0,
    initialDread: run.scene.kind === "combat" ? run.scene.dread : 0,
    actions: [],
    result: null,
  };
}
export function recordAction(
  record: FightRecord,
  before: Run,
  action: Action,
  result: Resolution,
  decisionMs: number,
  durationMs: number,
): FightRecord {
  if (
    before.scene.kind !== "combat" ||
    result.error ||
    (action.type !== "play" &&
      action.type !== "end" &&
      action.type !== "work" &&
      action.type !== "bearer")
  )
    return record;
  const c = before.scene;
  let previous = c;
  const thresholdEvents: ActionRecord["thresholdEvents"] = [];
  if (record.config.rules === "recurring" && action.type === "end") {
    const response = dreadResponse(c);
    if (response.band !== "none")
      thresholdEvents.push({
        at: response.band === "major" ? 8 : 4,
        event: response.band,
        dread: c.dread,
      });
  }
  for (const frame of result.frames) {
    if (frame.run.scene.kind !== "combat") continue;
    const next = frame.run.scene;
    const old = thresholdState(before, previous, record.config.rules);
    for (const t of thresholdState(frame.run, next, record.config.rules)) {
      const prior = old.find((x) => x.at === t.at);
      if (record.config.rules !== "recurring" && prior?.state !== t.state)
        thresholdEvents.push({
          at: t.at,
          event:
            prior?.state === "locked" ? "unlock" : t.state === "active" ? "reactivate" : t.state,
          dread: next.dread,
        });
    }
    previous = next;
  }
  const lastCombat = result.run.scene.kind === "combat" ? result.run.scene : previous;
  const row: ActionRecord = {
    turn: c.turn,
    action: action.type,
    ...(result.accounting.ember ? { ember: result.accounting.ember } : {}),
    card:
      action.type === "play" || action.type === "work"
        ? (c.hand.find((x) => x.uid === action.uid)?.def ?? null)
        : null,
    target: action.type === "play" ? action.target : null,
    drawn: result.accounting.drawn,
    played: result.run.stats.cards - before.stats.cards,
    damage: result.run.stats.damage - before.stats.damage,
    unusedEnergy: action.type === "end" ? c.energy : null,
    unplayed: action.type === "end" ? c.hand.map((x) => x.def) : [],
    retained:
      action.type === "end" ? c.hand.filter((x) => cardDef(x.def).retain).map((x) => x.def) : [],
    dreadStart: c.dread,
    dreadEnd: lastCombat.dread,
    thresholdEvents,
    suppressedAttackDamage: result.accounting.suppressedAttackDamage,
    killedBeforeFirstAction: lastCombat.enemies.filter(
      (e) => e.hp === 0 && e.step === 0 && c.enemies.some((old) => old.uid === e.uid && old.hp > 0),
    ).length,
    decisionMs,
  };
  return {
    ...record,
    actions: [...record.actions, row],
    result:
      result.run.scene.kind === "ending"
        ? {
            outcome: result.run.scene.won ? "win" : "loss",
            finalHealth: result.run.hp,
            playerTurns: c.turn,
            durationMs,
          }
        : null,
  };
}

export const metricDefinitions = {
  duration:
    "Wall duration from fight start to terminal action, including hidden tabs and pauses. Questionnaire time excluded.",
  activeDecision:
    "Visible, unpaused time between the committed player state and accepted action. Resolution time excluded. Benchmark uses immediate results, no combat animation. Idle visible time is included, not inferred human thinking.",
  playerTurns:
    "Combat turn number of terminal action, including a winning play and a losing end. Not stats.turns.",
  suppressedAttackDamage:
    "Narrow metric: for each actual attack/drain that resolves, difference in pre-block damage after Weak if all already-unlocked threshold strength were active at that instant. Same Dread, base strength, boss health and prior actions. Not counterfactual health saved or a replay of control; excludes attacks after death.",
  draws:
    "Actual cards entering hand, including opening hand and repeat draws; excludes retained cards and respects hand cap.",
  unusedEnergy: "Recorded only on an explicit end action. A winning play does not count as an end.",
  largestTurn:
    "Sum of actual enemy HP damage and played cards in each player turn. No invented meaningful-decision count.",
};
export function summarize(record: FightRecord) {
  const turns = new Map<number, { damage: number; cards: number }>();
  for (const row of record.actions) {
    const total = turns.get(row.turn) ?? { damage: 0, cards: 0 };
    turns.set(row.turn, {
      damage: total.damage + row.damage,
      cards: total.cards + row.played,
    });
  }
  return {
    ...record.result,
    drawn: record.initialDrawn + record.actions.reduce((n, r) => n + r.drawn, 0),
    played: record.actions.reduce((n, r) => n + r.played, 0),
    activeDecisionMs: record.actions.reduce((n, r) => n + r.decisionMs, 0),
    unusedEnergy: record.actions.reduce((n, r) => n + (r.unusedEnergy ?? 0), 0),
    suppressedAttackDamage: record.actions.reduce((n, r) => n + r.suppressedAttackDamage, 0),
    killedBeforeFirstAction: record.actions.reduce((n, r) => n + r.killedBeforeFirstAction, 0),
    largestTurnDamage: Math.max(0, ...Array.from(turns.values(), (t) => t.damage)),
    largestTurnCards: Math.max(0, ...Array.from(turns.values(), (t) => t.cards)),
    dreadStart: record.initialDread,
    dreadEnd: record.actions.at(-1)?.dreadEnd ?? record.initialDread,
  };
}
export function exportFight(record: FightRecord, questionnaire: Record<string, string>) {
  return JSON.stringify(
    { ...record, summary: summarize(record), questionnaire, metricDefinitions },
    null,
    2,
  );
}
export function exportFightCsv(record: FightRecord) {
  const quote = (value: string | number | boolean | null | undefined) => {
    const text = String(value ?? "");
    const safe = typeof value === "string" && /^\s*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const values = {
    version: record.version,
    ...record.config,
    ...summarize(record),
  };
  return (
    Object.keys(values).map(quote).join(",") +
    "\n" +
    Object.values(values).map(quote).join(",") +
    "\n"
  );
}

// The caller changes eligibility on visibility, pause, modal, action and commit boundaries.
export class DecisionClock {
  private since: number | null = null;
  private elapsed = 0;
  set(eligible: boolean, now: number) {
    if (this.since !== null) this.elapsed += Math.max(0, now - this.since);
    this.since = eligible ? now : null;
  }
  take(now: number) {
    this.set(false, now);
    const elapsed = this.elapsed;
    this.elapsed = 0;
    return elapsed;
  }
}
