import { EVENTS } from "../../src/game/content/world";
import { cardDef, needsTarget } from "../../src/game/content/cards";
import { intention, thresholds } from "../../src/game/selectors/intentions";
import { reachable } from "../../src/game/selectors/route";
import { resolve } from "../../src/game/engine/resolve";
import type { Action, Run } from "../../src/game/model";
// Test-only policy. It never enters the production bundle.
// Uses visible combat state to compare immediate card outcomes. Draw-pile order is not searched.

export function combatAction(run: Run): Action {
  const s = run.scene;
  if (s.kind !== "combat") throw new Error("Expected combat");
  let best: { action: Action; score: number } = {
    action: { type: "end" },
    score: 0,
  };
  const incoming = s.enemies
    .filter((e) => e.hp > 0 && e.joinsOn <= s.turn)
    .reduce((sum, e) => {
      const i = intention(e, s);
      return sum + (["attack", "drain"].includes(i.kind) ? i.amount : 0);
    }, 0);
  for (const card of s.hand) {
    const def = cardDef(card.def);
    if (def.cost > s.energy) continue;
    const targets = needsTarget(def) ? s.enemies.filter((e) => e.hp > 0).map((e) => e.uid) : [null];
    for (const target of targets) {
      const action: Action = { type: "play", uid: card.uid, target },
        next = resolve(run, action).run,
        ns = next.scene;
      if (ns.kind !== "combat") return action;
      const damage = next.stats.damage - run.stats.damage,
        kills = next.stats.kills - run.stats.kills;
      const nextIncoming = ns.enemies
        .filter((e) => e.hp > 0 && e.joinsOn <= ns.turn)
        .reduce((sum, e) => {
          const i = intention(e, ns);
          return sum + (["attack", "drain"].includes(i.kind) ? i.amount : 0);
        }, 0);
      const prevented = Math.max(0, incoming - s.block) - Math.max(0, nextIncoming - ns.block);
      const draws = def.effects
        .filter((e) => e.kind === "draw")
        .reduce((n, e) => n + e.amount + (card.upgraded ? e.upgrade : 0), 0);
      const energy = ns.energy - s.energy + def.cost;
      const pendingBefore = thresholds(run, s).filter((t) => t.pending).length,
        pendingAfter = thresholds(next, ns).filter((t) => t.pending).length;
      const score =
        (damage +
          prevented * 1.35 +
          (next.hp - run.hp) * 1.6 +
          kills * 5 +
          draws * 2 +
          energy * 6 +
          (pendingBefore - pendingAfter) * 3) /
          (def.cost || 0.7) -
        0.2;
      if (score > best.score) best = { action, score };
    }
  }
  return best.action;
}
export function cardRating(id: string) {
  return (
    (
      {
        cinder: 14,
        flame: 12,
        needle: 13,
        double: 10,
        volley: 11,
        inferno: 14,
        stand: 13,
        pass: 12,
        bash: 10,
        shield: 9,
        rally: 14,
        spark: 13,
        resolve: 11,
        ward: 12,
        sunrise: 12,
        bread: 11,
        challenge: 11,
        scout: 12,
        feint: 8,
        silence: 7,
        trail: 10,
        courage: 11,
        lantern: 9,
        home: 8,
        remember: 9,
        arrow: 10,
        unseen: 8,
        defiance: 9,
        sacrifice: 13,
        oath: 8,
        guard: 5,
        strike: 4,
      } satisfies Record<string, number>
    )[id] ?? 0
  );
}
export function journeyAction(run: Run): Action {
  const s = run.scene;
  switch (s.kind) {
    case "combat":
      return combatAction(run);
    case "map": {
      const priorities = {
        battle: 4,
        elite: run.hp > 45 && run.act === 0 ? 7 : 2,
        event: 5,
        camp: 6,
        shop: run.gold >= 85 ? 8 : 3,
        boss: 9,
      };
      const node = run.route
        .filter((n) => reachable(run, n))
        .sort(
          (a, b) =>
            priorities[b.kind] - priorities[a.kind] || Math.abs(a.lane - 1) - Math.abs(b.lane - 1),
        )[0];
      if (!node) throw new Error("Dead end");
      return { type: "travel", node: node.id };
    }
    case "reward": {
      const id = [...s.cards].sort((a, b) => cardRating(b) - cardRating(a))[0];
      return { type: "reward", card: id && cardRating(id) >= 9 ? id : null };
    }
    case "camp": {
      if (s.used) return { type: "leave" };
      if (run.hp < run.maxHp - 13) return { type: "rest" };
      const card = run.deck
        .filter((c) => !c.upgraded)
        .sort((a, b) => cardRating(b.def) - cardRating(a.def))[0];
      return card ? { type: "upgrade", uid: card.uid } : { type: "rest" };
    }
    case "event": {
      if (s.resolved) return { type: "leave" };
      const choice = EVENTS[s.event]?.choices
        .map((c, index) => ({
          index,
          score:
            run.gold + c.gold < 0
              ? -Infinity
              : Math.min(run.maxHp - run.hp, c.hp) * 1.5 +
                c.gold * 0.2 +
                (c.relic ? 18 : 0) +
                (c.upgrade ? 8 : 0) +
                (c.maxHp ?? 0) +
                (c.card ? cardRating(c.card) : 0),
        }))
        .sort((a, b) => b.score - a.score)[0];
      return { type: "choice", index: choice?.index ?? 0 };
    }
    case "shop": {
      if (run.hp < run.maxHp - 16 && !s.healed && run.gold >= 30)
        return { type: "buy", item: "heal", index: 0 };
      if (s.relic && run.gold >= 85) return { type: "buy", item: "relic", index: 0 };
      const offer = s.cards
        .map((id, index) => ({ id, index }))
        .filter((x) => x.id && cardRating(x.id) >= 11)
        .sort((a, b) => cardRating(b.id ?? "") - cardRating(a.id ?? ""))[0];
      if (offer && run.gold >= 40) return { type: "buy", item: "card", index: offer.index };
      const remove = run.deck.find((c) => c.def === "strike" && !c.upgraded);
      if (remove && !s.removed && run.deck.length > 9 && run.gold >= 45)
        return { type: "buy", item: "remove", index: remove.uid };
      return { type: "leave" };
    }
    case "ending":
      throw new Error("Journey ended");
  }
}
