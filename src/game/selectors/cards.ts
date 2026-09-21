import { cardDef } from "../content/cards";
import type { Card } from "../model";

export function cardName(card: Pick<Card, "def" | "upgraded">): string {
  const def = cardDef(card.def);
  return card.upgraded ? def.improvedName : def.name;
}
