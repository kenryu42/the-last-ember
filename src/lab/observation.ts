import { cardDef } from "../game/content/cards";
import { enemyDef } from "../game/content/enemies";
import { cardCost } from "../game/selectors/combat";
import { dreadResponse, intention, thresholdStrength } from "../game/selectors/intentions";
import { thresholdState } from "../game/selectors/dread";
import type { TestRules } from "./config";
import type { Card, Run } from "../game/model";
// Explicit allowlist. No run seed, RNG, nextId, route, log, reward or ordered draw pile.
// Sorting every pile also prevents insertion order becoming a hidden-order side channel.
export const sorted = (cards: Card[]) => cards.map((c) => ({ ...c })).sort((a, b) => a.uid - b.uid);
export function observe(run: Run, rules: TestRules) {
  const common = {
    rules,
    hp: run.hp,
    maxHp: run.maxHp,
    act: run.act,
    actBearer: run.actBearer,
    relics: [...run.relics],
  };
  const c = run.scene;
  if (c.kind !== "combat") return { ...common, kind: "terminal" as const };
  const response = rules === "recurring" ? dreadResponse(c) : null;
  return {
    ...common,
    kind: "combat" as const,
    turn: c.turn,
    energy: c.energy,
    block: c.block,
    dread: c.dread,
    response,
    ember: c.ember ? { ...c.ember } : undefined,
    relicTurn: c.relicTurn ? { ...c.relicTurn } : undefined,
    objective: c.objective ? { ...c.objective } : null,
    victoryCondition: c.objective?.kind ?? "kill-all",
    reaction: c.reaction,
    fired: [...(c.fired ?? [])],
    hand: sorted(c.hand),
    costs: sorted(c.hand).map((card) => ({
      uid: card.uid,
      energy: cardCost(run, c, cardDef(card.def)),
    })),
    drawComposition: sorted(c.draw),
    discard: sorted(c.discard),
    exhaust: sorted(c.exhaust),
    enemies: c.enemies.map((enemy) => ({
      ...enemy,
      pattern: structuredClone(enemyDef(enemy.def).pattern),
      intent: {
        ...(response?.modifiers.find((m) => m.uid === enemy.uid)?.intent ??
          intention(enemy, c, rules === "candidate" ? thresholdStrength(run, c) : 0)),
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
