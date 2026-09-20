import { cardDef, needsTarget } from "../game/content/cards";
import { cardCost, empowerTargets } from "../game/selectors/combat";
import type { CombatAction } from "../game/model";
import { heroSchema } from "../game/model";
import type { Observation } from "./observation";
export function legalActions(o: Observation): CombatAction[] {
  if (o.kind !== "combat") return [];
  const actions: CombatAction[] = [];
  if (o.ember?.window === "choose") {
    for (const hero of heroSchema.options)
      actions.push({ type: "bearer", hero });
    return actions;
  }
  for (const card of o.hand) {
    if (o.objective && o.objective.worked < 2 && o.energy >= 1)
      actions.push({ type: "work", uid: card.uid });
    const def = cardDef(card.def);
    if (cardCost(o, o, def) > o.energy) continue;
    if (needsTarget(def)) {
      for (const enemy of o.enemies)
        if (enemy.hp > 0)
          actions.push({ type: "play", uid: card.uid, target: enemy.uid });
    } else actions.push({ type: "play", uid: card.uid, target: null });
  }
  for (const action of [...actions]) {
    if (action.type !== "play") continue;
    const card = o.hand.find((c) => c.uid === action.uid);
    if (!card) continue;
    for (const empower of empowerTargets(o, cardDef(card.def), action.target))
      actions.push({ ...action, empower });
  }
  actions.push({ type: "end" });
  return actions;
}
