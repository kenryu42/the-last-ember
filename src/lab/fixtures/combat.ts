import type { EnemyKind } from "../../game/content/enemies";
import { draw } from "../../game/engine/combat/setup";
import { generateRoute } from "../../game/engine/journey/route";
import { makeCard } from "../../game/engine/rewards";
import { makeEnemy } from "../../game/engine/combat/enemy";
import { newRun } from "../../game/engine/run";
import { shuffle } from "../../game/engine/rng";
import type { Combat, Run } from "../../game/model";

export const PLAYTEST_DECKS = [
  {
    id: "quiet",
    name: "Quiet precision",
    cards: [
      "needle",
      "needle",
      "arrow",
      "arrow",
      "unseen",
      "unseen",
      "guard",
      "guard",
      "trail",
      "silence",
      "volley",
      "bread",
    ],
  },
  {
    id: "exposed",
    name: "Exposed power",
    cards: [
      "defiance",
      "defiance",
      "cinder",
      "cinder",
      "resolve",
      "resolve",
      "guard",
      "guard",
      "spark",
      "sacrifice",
      "remember",
      "bread",
    ],
  },
  {
    id: "defense",
    name: "Defense into damage",
    cards: [
      "shield",
      "shield",
      "bash",
      "bash",
      "pass",
      "pass",
      "guard",
      "guard",
      "oath",
      "rally",
      "courage",
      "bread",
    ],
  },
] as const;

export const PLAYTEST_ENCOUNTERS = [
  {
    id: "fury",
    name: "Fury · Rime wanderers",
    enemies: ["wraith", "wraith"],
    reaction: "fury",
  },
  {
    id: "reinforce",
    name: "Reinforce · The watch",
    enemies: ["sentinel", "soldier"],
    reaction: "reinforce",
  },
  {
    id: "ward",
    name: "Ward · Twin sentinels",
    enemies: ["sentinel", "sentinel"],
    reaction: "ward",
  },
] as const satisfies readonly {
  id: string;
  name: string;
  enemies: readonly EnemyKind[];
  reaction: Combat["reaction"];
}[];

export function createPlaytestRun({
  seed,
  deckId,
  encounterId,
  variant = "base",
}: {
  seed: Run["seed"];
  encounterId: (typeof PLAYTEST_ENCOUNTERS)[number]["id"];
} & (
  | { deckId: (typeof PLAYTEST_DECKS)[number]["id"]; variant?: "base" }
  | { deckId: "exposed" | "defense"; variant: "ablation" }
)): Run {
  const deck = PLAYTEST_DECKS.find((deck) => deck.id === deckId);
  const encounter = PLAYTEST_ENCOUNTERS.find(
    (encounter) => encounter.id === encounterId,
  );
  if (!deck || !encounter) throw new Error("Unknown playtest fixture");

  const run = newRun(seed);
  run.act = 1;
  // Keep legal progression metadata without exposing route play in the benchmark.
  run.route = generateRoute(run);
  const node = run.route.find(
    (node) => node.row === 0 && node.kind === "battle",
  );
  if (!node) throw new Error("Missing opening battle");
  run.row = node.row;
  run.location = node.id;
  run.visited = [node.id];
  run.deck = deck.cards.map((id) =>
    makeCard(
      run,
      variant === "ablation" &&
        (deckId === "exposed"
          ? id === "spark" || id === "sacrifice"
          : id === "shield")
        ? "strike"
        : id,
    ),
  );
  run.hp = run.maxHp = 70;
  run.relics = [];

  // Build the fixed encounter directly; startCombat selects random enemy kinds.
  const combat: Combat = {
    kind: "combat",
    encounter: encounter.name,
    type: "battle",
    turn: 1,
    energy: 3,
    block: 0,
    dread: 0,
    fired: [],
    draw: shuffle(run, run.deck),
    hand: [],
    discard: [],
    exhaust: [],
    enemies: encounter.enemies.map((kind) => makeEnemy(run, kind)),
    reaction: encounter.reaction,
    log: ["The fellowship takes its stand."],
  };
  run.scene = combat;
  draw(run, combat, 5);
  return run;
}
