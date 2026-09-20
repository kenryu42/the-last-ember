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
export const RELICS = [
  {
    id: "shieldfire",
    name: "Shieldfire",
    text: "At turn start, retain up to 6 remaining Block.",
    art: 6,
  },
  {
    id: "hushed-coal",
    name: "Hushed Coal",
    text: "Once per turn, when a card lowers Dread from 6+ to 3 or less, draw 1 and gain 1 energy.",
    art: 11,
  },
  {
    id: "black-lantern",
    name: "Black Lantern",
    text: "The first Spell each turn costs 1 less energy and generates 1 additional Dread.",
    art: 8,
  },
  {
    id: "kettle",
    name: "Copper kettle",
    text: "Restore 3 health after every victory.",
    art: 5,
  },
  {
    id: "ribbon",
    name: "Mended ribbon",
    text: "Maximum health +10. Restore 10 health when acquired.",
    art: 10,
  },
  {
    id: "buckler",
    name: "Old watch badge",
    text: "Begin every combat with 8 block.",
    art: 1,
  },
  {
    id: "lens",
    name: "Ranger’s lens",
    text: "Your hits deal +2 damage while Dread is 3 or less.",
    art: 2,
  },
  {
    id: "coal",
    name: "Singing coal",
    text: "Your hits deal +3 damage while Dread is at least 6.",
    art: 3,
  },
  {
    id: "flint",
    name: "White flint",
    text: "Gain 1 additional energy on the first turn of combat.",
    art: 8,
  },
  {
    id: "map",
    name: "Unfinished map",
    text: "Draw 1 additional card at every turn start.",
    art: 7,
  },
  {
    id: "thread",
    name: "Silver thread",
    text: "Every block effect grants 2 additional block.",
    art: 6,
  },
  {
    id: "bowl",
    name: "Wooden bowl",
    text: "Healing effects restore 3 additional health.",
    art: 5,
  },
  {
    id: "charm",
    name: "Quiet bell",
    text: "Dread thresholds are delayed to 5 and 9.",
    art: 11,
  },
  {
    id: "purse",
    name: "Roadwarden’s purse",
    text: "Earn 12 extra gold from combat victories.",
    art: 9,
  },
  {
    id: "feather",
    name: "Grey feather",
    text: "Begin every combat with 1 additional card.",
    art: 4,
  },
];
export type EnemyKind =
  | "wolf"
  | "raider"
  | "soldier"
  | "shade"
  | "sentinel"
  | "stag"
  | "crow"
  | "wraith"
  | "roots"
  | "marshal"
  | "hollow";
export type Intent = {
  kind: "attack" | "guard" | "howl" | "drain";
  amount: number;
};
export interface EnemyDef {
  id: EnemyKind;
  name: string;
  hp: number;
  art: number;
  pattern: Intent[];
  special: string;
}
const attack = (amount: number): Intent => ({ kind: "attack", amount });
export const ENEMIES: EnemyDef[] = [
  {
    id: "wolf",
    name: "Briar wolf",
    hp: 24,
    art: 0,
    pattern: [attack(7), attack(10), { kind: "howl", amount: 2 }],
    special: "Hunts in a repeating rhythm.",
  },
  {
    id: "raider",
    name: "Roadless brigand",
    hp: 30,
    art: 1,
    pattern: [attack(8), { kind: "guard", amount: 9 }, attack(13)],
    special: "Raises a shield before a heavy strike.",
  },
  {
    id: "soldier",
    name: "Ashbound soldier",
    hp: 32,
    art: 2,
    pattern: [{ kind: "guard", amount: 8 }, attack(10), attack(12)],
    special: "Disciplined, even in death.",
  },
  {
    id: "shade",
    name: "Lantern shade",
    hp: 23,
    art: 3,
    pattern: [{ kind: "drain", amount: 6 }, attack(9)],
    special: "Drain heals for health damage dealt.",
  },
  {
    id: "sentinel",
    name: "Gate sentinel",
    hp: 40,
    art: 4,
    pattern: [attack(11), { kind: "guard", amount: 12 }, attack(15)],
    special: "Its shelter lasts until broken or it acts again.",
  },
  {
    id: "stag",
    name: "Thorn-crowned stag",
    hp: 34,
    art: 5,
    pattern: [{ kind: "howl", amount: 2 }, attack(12), attack(9)],
    special: "Its cry raises Dread.",
  },
  {
    id: "crow",
    name: "Carrion watcher",
    hp: 18,
    art: 6,
    pattern: [attack(5), { kind: "howl", amount: 1 }],
    special: "A fragile scout for the pursuing host.",
  },
  {
    id: "wraith",
    name: "Rime wanderer",
    hp: 29,
    art: 7,
    pattern: [attack(9), { kind: "drain", amount: 10 }],
    special: "Drain heals for health damage dealt.",
  },
  {
    id: "roots",
    name: "The Rootbound King",
    hp: 92,
    art: 8,
    pattern: [
      { kind: "guard", amount: 10 },
      attack(15),
      { kind: "howl", amount: 2 },
      attack(20),
    ],
    special:
      "At half health or below, attacks gain 3 damage. Dread calls a wolf.",
  },
  {
    id: "marshal",
    name: "The Fallen Marshal",
    hp: 124,
    art: 9,
    pattern: [attack(15), { kind: "guard", amount: 16 }, attack(22)],
    special:
      "At half health or below, attacks gain 3 damage. The host answers Dread.",
  },
  {
    id: "hollow",
    name: "The Hollow Beacon",
    hp: 166,
    art: 10,
    pattern: [
      { kind: "howl", amount: 2 },
      attack(21),
      { kind: "drain", amount: 15 },
      attack(26),
    ],
    special:
      "At Dread 6+, attacks gain 4 damage. At half health or below, attacks gain 3.",
  },
];
export function enemyDef(id: EnemyKind): EnemyDef {
  const enemy = ENEMIES.find((e) => e.id === id);
  if (!enemy) throw new Error(`Unknown enemy ${id}`);
  return enemy;
}
export const ACTS = [
  {
    name: "The green silence",
    place: "Briarwood frontier",
    file: "forest",
    intro: "Beyond the last warm window, the old forest listens.",
    boss: "roots",
    crossroads: [
      {
        name: "The fern gate",
        description:
          "The road thins beneath the trees. Three trails disappear into the green.",
      },
      {
        name: "The silver brook",
        description:
          "Water slips over pale stones. Beyond its banks, the forest keeps its own counsel.",
      },
      {
        name: "The fallen giant",
        description:
          "An old oak lies across the hollow. New paths have grown around its roots.",
      },
      {
        name: "The white stones",
        description:
          "Pale stones rise from a quiet glade. Wildflowers soften the edges of three worn trails.",
      },
      {
        name: "The rain hollow",
        description:
          "Rain still clings to the leaves. The sound of falling water follows you into the ravine.",
      },
      {
        name: "The elder boughs",
        description:
          "The oldest trees lean together overhead. For a moment, even the wind is still.",
      },
    ],
  },
  {
    name: "What the stones remember",
    place: "The drowned city of Avel",
    file: "ruins",
    intro:
      "Reeds grow through the king's road. The water remembers every stone.",
    boss: "marshal",
    crossroads: [
      {
        name: "The reed causeway",
        description:
          "Broken roads rise above the marsh. Avel's empty windows watch from the mist.",
      },
      {
        name: "The sunken square",
        description:
          "Still water fills the old square. Three dry ways remain between the stones.",
      },
      {
        name: "The willow bridges",
        description:
          "Willow branches trail across the canals. Beyond the bridges, the city is quiet.",
      },
      {
        name: "The broken aqueduct",
        description:
          "Water gathers beneath the old arches. Your footsteps echo against the stone.",
      },
      {
        name: "The drowned garden",
        description:
          "The garden has outlived its walls. Paths wind between the reeds and fallen pillars.",
      },
      {
        name: "The quiet ramparts",
        description:
          "No banners hang above the gates. The last light settles on the empty walls.",
      },
    ],
  },
  {
    name: "A light for the living",
    place: "The high watch",
    file: "mountain",
    intro: "Above the cloudline, the unlit beacon waits.",
    boss: "hollow",
    crossroads: [
      {
        name: "The last pines",
        description:
          "The trees give way to open sky. Three trails climb beyond their shelter.",
      },
      {
        name: "The glass tarn",
        description:
          "A still lake holds the morning sky. The paths divide along its stony shore.",
      },
      {
        name: "The wind-carved pass",
        description:
          "Wind has worn a doorway through the mountain. Snow gathers where the stone gives shelter.",
      },
      {
        name: "The blue crevasse",
        description:
          "Old ice shines beneath the rock. Three crossings lead deeper into the heights.",
      },
      {
        name: "The cloud stair",
        description:
          "The world below has vanished into cloud. Worn steps catch the last warmth of the sun.",
      },
      {
        name: "The pale summit",
        description:
          "The beacon stands dark against the evening sky. Only the wind moves on the heights.",
      },
    ],
  },
] satisfies {
  name: string;
  place: string;
  file: string;
  intro: string;
  boss: EnemyKind;
  crossroads: { name: string; description: string }[];
}[];
export interface EventChoice {
  label: string;
  detail: string;
  hp: number;
  gold: number;
  card?: string;
  relic?: boolean;
  upgrade?: boolean;
  maxHp?: number;
}
export const EVENTS: { title: string; text: string; choices: EventChoice[] }[] =
  [
    {
      title: "A window still lit",
      text: "An old woman opens her door before Mara can knock. There is soup enough for four, she says. There has always been soup enough for four.",
      choices: [
        {
          label: "Share the table",
          detail: "Restore 12 health. Pay 15 gold.",
          hp: 12,
          gold: -15,
        },
        {
          label: "Leave wood by the door",
          detail: "Gain Shared bread.",
          hp: 0,
          gold: 0,
          card: "bread",
        },
      ],
    },
    {
      title: "The listening well",
      text: "Aldren hears his own voice below the water, saying words he has not yet learned. Eryn ties a rope around his waist.",
      choices: [
        {
          label: "Listen a little longer",
          detail: "Lose 8 health. Gain Old knowledge.",
          hp: -8,
          gold: 0,
          card: "remember",
        },
        { label: "Pull him back", detail: "Restore 5 health.", hp: 5, gold: 0 },
      ],
    },
    {
      title: "The empty tollhouse",
      text: "The ledger lists every traveler who passed here. The final entry reads: three, carrying a light. The ink is still wet.",
      choices: [
        {
          label: "Take the abandoned purse",
          detail: "Gain 40 gold. Lose 6 health.",
          hp: -6,
          gold: 40,
        },
        {
          label: "Burn the final page",
          detail: "Gain Quiet as snowfall.",
          hp: 0,
          gold: 0,
          card: "silence",
        },
      ],
    },
    {
      title: "A soldier’s grave",
      text: "Mara recognizes the knot tied around the broken spear. She kneels, and the others turn away to give her a moment.",
      choices: [
        {
          label: "Keep the oath",
          detail: "Lose 6 health. Gain a relic.",
          hp: -6,
          gold: 0,
          relic: true,
        },
        {
          label: "Let the watch end",
          detail: "Restore 8 health.",
          hp: 8,
          gold: 0,
        },
      ],
    },
    {
      title: "The narrow crossing",
      text: "The bridge has gone. A child on the far bank points to a fallen tree, then waits to see whether you trust her.",
      choices: [
        {
          label: "Follow her path",
          detail: "Gain Hidden trail and 15 gold.",
          hp: 0,
          gold: 15,
          card: "trail",
        },
        {
          label: "Repair the ropeway",
          detail: "Lose 8 health. Upgrade a random unupgraded card.",
          hp: -8,
          gold: 0,
          upgrade: true,
        },
      ],
    },
    {
      title: "A pocket of summer",
      text: "Beneath a leaning stone, wild strawberries grow in snow. Eryn eats one and laughs for the first time in days.",
      choices: [
        {
          label: "Rest in the sunlight",
          detail: "Restore 15 health.",
          hp: 15,
          gold: 0,
        },
        {
          label: "Save seeds for home",
          detail: "Maximum health +6. Restore 6 health.",
          hp: 6,
          gold: 0,
          maxHp: 6,
        },
      ],
    },
    {
      title: "The charcoal seller",
      text: "His fire has not gone out in thirty winters. He offers a coal, wrapped in leaves, for the long climb ahead.",
      choices: [
        {
          label: "Buy the singing coal",
          detail: "Pay 35 gold. Gain a relic.",
          hp: 0,
          gold: -35,
          relic: true,
        },
        {
          label: "Trade a story",
          detail: "Gain Borrowed fire.",
          hp: 0,
          gold: 0,
          card: "spark",
        },
      ],
    },
    {
      title: "Names in the frost",
      text: "The wall is carved with the names of those who lit the beacon before. There is room beside them. Aldren puts his knife away.",
      choices: [
        {
          label: "We will return to write them",
          detail: "Gain A promise of home.",
          hp: 0,
          gold: 0,
          card: "home",
        },
        {
          label: "Remember the forgotten",
          detail: "Lose 5 health. Gain a relic.",
          hp: -5,
          gold: 0,
          relic: true,
        },
      ],
    },
  ];
