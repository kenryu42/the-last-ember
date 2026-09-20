import type { CardDef } from "../content/cards";
import type { Combat, Run } from "../model";
export function cardCost(
  run: Pick<Run, "relics">,
  combat: Pick<Combat, "relicTurn">,
  def: CardDef,
) {
  return Math.max(
    0,
    def.cost -
      (run.relics.includes("black-lantern") &&
      !combat.relicTurn?.lanternUsed &&
      def.tags?.includes("Spell")
        ? 1
        : 0),
  );
}

export function empowerTargets(
  combat: Pick<Combat, "ember" | "enemies">,
  def: CardDef,
  target: number | null,
) {
  if (
    combat.ember?.bearer !== "Aldren" ||
    combat.ember.used ||
    !def.tags?.includes("Spell")
  )
    return [];
  if (def.effects.some((e) => e.kind === "all"))
    return combat.enemies.filter((e) => e.hp > 0).map((e) => e.uid);
  return def.effects.some((e) => e.kind === "hit") && target !== null
    ? combat.enemies
        .filter((e) => e.hp > 0 && e.uid === target)
        .map((e) => e.uid)
    : [];
}
