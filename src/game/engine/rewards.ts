import { BREAK_FORMATION, CARDS, FADING_STRIKE } from "../content/cards";
import { RELICS } from "../content/relics";
import { startingRelicSchema } from "../model";
import type { Card, Run } from "../model";
import { pick } from "./rng";
export function makeCard(run: Run, def: string): Card {
  return { uid: run.nextId++, def, upgraded: false };
}
export function rewardPool(run: Pick<Run, "prototype">) {
  return [
    ...CARDS,
    ...(run.prototype?.blockConversion ? [BREAK_FORMATION] : []),
    ...(run.prototype?.concealment ? [FADING_STRIKE] : []),
  ].filter((card) => !["strike", "guard"].includes(card.id));
}
export function has(run: Run, id: string) {
  return run.relics.includes(id);
}
export function heal(run: Run, amount: number) {
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + amount + (has(run, "bowl") ? 3 : 0));
  return run.hp - before;
}
export function grantRelic(run: Run, id: string) {
  if (has(run, id)) return;
  run.relics.push(id);
  if (id === "ribbon") {
    run.maxHp += 10;
    heal(run, 10);
  }
}
export function relicOffer(run: Run) {
  const pool = RELICS.filter(
    (r) =>
      !has(run, r.id) &&
      !startingRelicSchema.options.some((id) => id === r.id) &&
      !(run.dreadRules === "recurring" && r.id === "charm"),
  );
  return pool.length ? pick(run, pool).id : null;
}
