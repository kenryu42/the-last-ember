import type { EnemyKind } from "./enemies";
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
        pathAnchors: [
          [18, 59],
          [50, 64],
          [82, 59],
        ],
        description: "The road thins beneath the trees. Three trails disappear into the green.",
      },
      {
        name: "The silver brook",
        pathAnchors: [
          [18, 48],
          [50, 62],
          [87, 43],
        ],
        description:
          "Water slips over pale stones. Beyond its banks, the forest keeps its own counsel.",
      },
      {
        name: "The fallen giant",
        pathAnchors: [
          [12, 65],
          [57, 61],
          [90, 43],
        ],
        description: "An old oak lies across the hollow. New paths have grown around its roots.",
      },
      {
        name: "The white stones",
        pathAnchors: [
          [19, 68],
          [50, 77],
          [82, 67],
        ],
        description:
          "Pale stones rise from a quiet glade. Wildflowers soften the edges of three worn trails.",
      },
      {
        name: "The rain hollow",
        pathAnchors: [
          [20, 58],
          [55, 63],
          [87, 51],
        ],
        description:
          "Rain still clings to the leaves. The sound of falling water follows you into the ravine.",
      },
      {
        name: "The elder boughs",
        pathAnchors: [
          [20, 69],
          [57, 63],
          [88, 64],
        ],
        description:
          "The oldest trees lean together overhead. For a moment, even the wind is still.",
      },
    ],
  },
  {
    name: "What the stones remember",
    place: "The drowned city of Avel",
    file: "ruins",
    intro: "Reeds grow through the king's road. The water remembers every stone.",
    boss: "marshal",
    crossroads: [
      {
        name: "The reed causeway",
        pathAnchors: [
          [14, 68],
          [51, 66],
          [86, 69],
        ],
        description: "Broken roads rise above the marsh. Avel's empty windows watch from the mist.",
      },
      {
        name: "The sunken square",
        pathAnchors: [
          [15, 66],
          [48, 71],
          [92, 65],
        ],
        description: "Still water fills the old square. Three dry ways remain between the stones.",
      },
      {
        name: "The willow bridges",
        pathAnchors: [
          [17, 61],
          [50, 63],
          [84, 58],
        ],
        description:
          "Willow branches trail across the canals. Beyond the bridges, the city is quiet.",
      },
      {
        name: "The broken aqueduct",
        pathAnchors: [
          [25, 68],
          [52, 65],
          [85, 48],
        ],
        description: "Water gathers beneath the old arches. Your footsteps echo against the stone.",
      },
      {
        name: "The drowned garden",
        pathAnchors: [
          [19, 73],
          [53, 60],
          [86, 57],
        ],
        description:
          "The garden has outlived its walls. Paths wind between the reeds and fallen pillars.",
      },
      {
        name: "The quiet ramparts",
        pathAnchors: [
          [17, 67],
          [52, 67],
          [85, 51],
        ],
        description: "No banners hang above the gates. The last light settles on the empty walls.",
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
        pathAnchors: [
          [15, 58],
          [50, 78],
          [86, 62],
        ],
        description: "The trees give way to open sky. Three trails climb beyond their shelter.",
      },
      {
        name: "The glass tarn",
        pathAnchors: [
          [20, 79],
          [62, 64],
          [91, 66],
        ],
        description: "A still lake holds the morning sky. The paths divide along its stony shore.",
      },
      {
        name: "The wind-carved pass",
        pathAnchors: [
          [24, 58],
          [56, 77],
          [91, 49],
        ],
        description:
          "Wind has worn a doorway through the mountain. Snow gathers where the stone gives shelter.",
      },
      {
        name: "The blue crevasse",
        pathAnchors: [
          [22, 65],
          [50, 62],
          [86, 67],
        ],
        description:
          "Old ice shines beneath the rock. Three crossings lead deeper into the heights.",
      },
      {
        name: "The cloud stair",
        pathAnchors: [
          [20, 58],
          [53, 46],
          [87, 58],
        ],
        description:
          "The world below has vanished into cloud. Worn steps catch the last warmth of the sun.",
      },
      {
        name: "The pale summit",
        pathAnchors: [
          [22, 48],
          [52, 61],
          [84, 61],
        ],
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
  crossroads: {
    name: string;
    description: string;
    /** Left, straight and right trail markers, as percentages of the uncropped art. */
    pathAnchors: [[number, number], [number, number], [number, number]];
  }[];
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
export const EVENTS: {
  title: string;
  art: string;
  text: string;
  choices: EventChoice[];
}[] = [
  {
    title: "A window still lit",
    art: "window",
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
    art: "well",
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
    art: "tollhouse",
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
    art: "grave",
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
    art: "crossing",
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
    art: "summer",
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
    art: "charcoal",
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
    art: "names",
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
