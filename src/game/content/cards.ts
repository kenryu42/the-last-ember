export type Owner = "Mara" | "Eryn" | "Aldren" | "Fellowship";
export type Effect =
  | {
      kind:
        | "hit"
        | "all"
        | "block"
        | "draw"
        | "dread"
        | "energy"
        | "heal"
        | "weak"
        | "vulnerable";
      amount: number;
      upgrade: number;
    }
  | {
      kind:
        "defiance" | "precision" | "shieldStrike" | "spendBlock" | "resolve";
      amount: number;
      upgrade: number;
    };
export interface CardDef {
  id: string;
  name: string;
  owner: Owner;
  cost: number;
  // Paired artwork: two cards per sheet, base/upgrade in adjacent columns.
  art: number;
  effects: Effect[];
  tags?: "Spell"[];
  exhaust?: boolean;
  retain?: boolean;
}
const e = (kind: Effect["kind"], amount: number, upgrade = 0): Effect => ({
  kind,
  amount,
  upgrade,
});
export const CARDS: CardDef[] = [
  {
    id: "strike",
    name: "Steady blade",
    owner: "Mara",
    cost: 1,
    art: 0,
    effects: [e("hit", 7, 3)],
  },
  {
    id: "guard",
    name: "Shelter",
    owner: "Mara",
    cost: 1,
    art: 2,
    effects: [e("block", 7, 3)],
  },
  {
    id: "arrow",
    name: "True shot",
    owner: "Eryn",
    cost: 1,
    art: 3,
    effects: [e("hit", 6, 2), e("draw", 1)],
  },
  {
    id: "unseen",
    name: "Walk unseen",
    owner: "Eryn",
    cost: 1,
    art: 4,
    effects: [e("block", 5, 3), e("dread", -2, -1)],
  },
  {
    id: "flame",
    name: "Ancient flame",
    tags: ["Spell"],
    owner: "Aldren",
    cost: 2,
    art: 1,
    effects: [e("hit", 18, 6), e("dread", 3)],
  },
  {
    id: "defiance",
    name: "Defiance",
    owner: "Mara",
    cost: 1,
    art: 5,
    effects: [e("defiance", 7, 3)],
  },
  {
    id: "pass",
    name: "Hold the pass",
    owner: "Mara",
    cost: 1,
    art: 6,
    effects: [e("block", 11, 4), e("dread", 1)],
  },
  {
    id: "bash",
    name: "Shield-bearer",
    owner: "Mara",
    cost: 1,
    art: 7,
    effects: [e("block", 5, 2), e("hit", 5, 2)],
  },
  {
    id: "shield",
    name: "Iron answer",
    owner: "Mara",
    cost: 1,
    art: 8,
    effects: [e("shieldStrike", 3, 3)],
  },
  {
    id: "stand",
    name: "Last stand",
    owner: "Mara",
    cost: 2,
    art: 9,
    effects: [e("block", 18, 5), e("defiance", 8, 3)],
  },
  {
    id: "challenge",
    name: "Challenge",
    owner: "Mara",
    cost: 0,
    art: 10,
    effects: [e("weak", 2, 1), e("dread", 1)],
  },
  {
    id: "oath",
    name: "An unbroken oath",
    owner: "Mara",
    cost: 1,
    art: 11,
    effects: [e("block", 9, 4)],
    retain: true,
  },
  {
    id: "rally",
    name: "Rally together",
    owner: "Mara",
    cost: 0,
    art: 12,
    effects: [e("block", 4, 3), e("energy", 1)],
    exhaust: true,
  },
  {
    id: "needle",
    name: "Through the leaves",
    owner: "Eryn",
    cost: 1,
    art: 13,
    effects: [e("precision", 8, 3)],
  },
  {
    id: "volley",
    name: "Rain of arrows",
    owner: "Eryn",
    cost: 2,
    art: 14,
    effects: [e("all", 10, 4)],
  },
  {
    id: "scout",
    name: "Higher ground",
    owner: "Eryn",
    cost: 0,
    art: 15,
    effects: [e("draw", 2, 1)],
    exhaust: true,
  },
  {
    id: "feint",
    name: "A small opening",
    owner: "Eryn",
    cost: 0,
    art: 16,
    effects: [e("vulnerable", 2, 1), e("dread", 1)],
  },
  {
    id: "silence",
    name: "Quiet as snowfall",
    owner: "Eryn",
    cost: 1,
    art: 17,
    effects: [e("dread", -4, -2), e("draw", 1)],
  },
  {
    id: "double",
    name: "Twin arrows",
    owner: "Eryn",
    cost: 1,
    art: 18,
    effects: [e("hit", 4, 2), e("hit", 4, 2)],
  },
  {
    id: "trail",
    name: "Hidden trail",
    owner: "Eryn",
    cost: 0,
    art: 19,
    effects: [e("dread", -1, -1), e("draw", 1)],
    exhaust: true,
  },
  {
    id: "spark",
    name: "Borrowed fire",
    tags: ["Spell"],
    owner: "Aldren",
    cost: 0,
    art: 20,
    effects: [e("energy", 1, 1), e("dread", 2)],
    exhaust: true,
  },
  {
    id: "inferno",
    name: "Light the dark",
    tags: ["Spell"],
    owner: "Aldren",
    cost: 2,
    art: 21,
    effects: [e("all", 17, 5), e("dread", 4)],
  },
  {
    id: "cinder",
    name: "Cinder lance",
    tags: ["Spell"],
    owner: "Aldren",
    cost: 1,
    art: 22,
    effects: [e("hit", 12, 4), e("dread", 2)],
  },
  {
    id: "resolve",
    name: "Face the darkness",
    owner: "Aldren",
    cost: 1,
    art: 23,
    effects: [e("resolve", 7, 3)],
  },
  {
    id: "ward",
    name: "Ember ward",
    tags: ["Spell"],
    owner: "Aldren",
    cost: 1,
    art: 24,
    effects: [e("block", 14, 4), e("dread", 2)],
  },
  {
    id: "remember",
    name: "Old knowledge",
    owner: "Aldren",
    cost: 1,
    art: 25,
    effects: [e("draw", 3, 1), e("dread", 1)],
  },
  {
    id: "sunrise",
    name: "One more dawn",
    tags: ["Spell"],
    owner: "Aldren",
    cost: 2,
    art: 26,
    effects: [e("heal", 8, 4), e("dread", 2)],
    exhaust: true,
  },
  {
    id: "bread",
    name: "Shared bread",
    owner: "Fellowship",
    cost: 1,
    art: 27,
    effects: [e("heal", 5, 3), e("draw", 1)],
    exhaust: true,
  },
  {
    id: "courage",
    name: "Small courage",
    owner: "Fellowship",
    cost: 0,
    art: 28,
    effects: [e("block", 3, 2), e("dread", -1, -1)],
    retain: true,
  },
  {
    id: "lantern",
    name: "Keep the lantern",
    owner: "Fellowship",
    cost: 1,
    art: 29,
    effects: [e("draw", 2, 1), e("dread", -1)],
  },
  {
    id: "sacrifice",
    name: "Shoulder the burden",
    owner: "Fellowship",
    cost: 0,
    art: 30,
    effects: [e("dread", 3), e("energy", 2, 1)],
    exhaust: true,
  },
  {
    id: "home",
    name: "A promise of home",
    owner: "Fellowship",
    cost: 2,
    art: 31,
    effects: [e("block", 12, 4), e("dread", -3, -1)],
    retain: true,
  },
];
// One provisional Block-conversion design, opt-in for acquisition comparisons.
export const BREAK_FORMATION: CardDef = {
  id: "break-formation",
  name: "Break formation",
  owner: "Mara",
  cost: 0,
  art: 8,
  effects: [e("spendBlock", 4, 3)],
};
// Recovery followed by precision creates an offensive concealment alternative.
export const FADING_STRIKE: CardDef = {
  id: "fading-strike",
  name: "Fading strike",
  owner: "Eryn",
  cost: 1,
  art: 13,
  effects: [e("dread", -2), e("precision", 4, 3)],
};
// Upgrade variants are not additional reward designs or shop offers.
export const FLAME_UPGRADES: CardDef[] = [
  {
    id: "veiled-flame",
    name: "Veiled Flame",
    owner: "Aldren",
    cost: 2,
    art: 1,
    tags: ["Spell"],
    effects: [e("hit", 18), e("dread", 1)],
  },
  {
    id: "wildfire",
    name: "Wildfire",
    owner: "Aldren",
    cost: 2,
    art: 1,
    tags: ["Spell"],
    effects: [e("all", 14), e("dread", 4)],
  },
];
export function cardDef(id: string): CardDef {
  const card =
    CARDS.find((c) => c.id === id) ??
    FLAME_UPGRADES.find((c) => c.id === id) ??
    (id === FADING_STRIKE.id ? FADING_STRIKE : undefined) ??
    (id === BREAK_FORMATION.id ? BREAK_FORMATION : undefined);
  if (!card) throw new Error(`Unknown card ${id}`);
  return card;
}
export function value(effect: Effect, upgraded: boolean) {
  return effect.amount + (upgraded ? effect.upgrade : 0);
}
export function effectText(effect: Effect, upgraded: boolean): string {
  const n = value(effect, upgraded);
  switch (effect.kind) {
    case "hit":
      return `Deal ${n} damage.`;
    case "all":
      return `Deal ${n} damage to every enemy.`;
    case "block":
      return `Gain ${n} block.`;
    case "draw":
      return `Draw ${n}.`;
    case "dread":
      return n > 0 ? `Gain ${n} Dread.` : `Lose ${-n} Dread.`;
    case "energy":
      return `Gain ${n} energy.`;
    case "heal":
      return `Restore ${n} health.`;
    case "weak":
      return `Apply ${n} Weak.`;
    case "vulnerable":
      return `Apply ${n} Vulnerable.`;
    case "defiance":
      return `Deal ${n} damage; ${n * 2} at Dread 6+.`;
    case "precision":
      return `Deal ${n} damage; ${n + 6} at Dread 3 or less.`;
    case "shieldStrike":
      return `Deal ${n} + your block as damage.`;
    case "spendBlock":
      return `Lose all Block. Deal ${n} + the Block lost as damage.`;
    case "resolve":
      return `Gain ${n} + your Dread as block.`;
  }
}
export function needsTarget(card: CardDef) {
  return card.effects.some((e) =>
    [
      "hit",
      "weak",
      "vulnerable",
      "defiance",
      "precision",
      "shieldStrike",
      "spendBlock",
    ].includes(e.kind),
  );
}
