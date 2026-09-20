import { cardDef, needsTarget } from "../content/cards";
import { cardCost } from "./combat";
import type { Run } from "../model";

export function shouldAutoEndTurn(run: Run) {
  const combat = run.scene;
  return (
    combat.kind === "combat" &&
    !combat.introPending &&
    combat.energy === 0 &&
    combat.ember?.window !== "choose" &&
    !combat.hand.some((card) => {
      const def = cardDef(card.def);
      return (
        cardCost(run, combat, def) === 0 &&
        (!needsTarget(def) || combat.enemies.some((enemy) => enemy.hp > 0))
      );
    })
  );
}
