import type { StartingRelic, Run } from "../model";
import { makeCard, grantRelic } from "./rewards";
import { generateRoute } from "./journey/route";
export function newRun(
  seed: string,
  dreadRules: "original" | "recurring" = "original",
  prototype?: Run["prototype"],
  startingRelic?: StartingRelic,
): Run {
  const safeSeed = seed.trim().slice(0, 80) || "last-ember";
  let rng = 2166136261;
  for (const char of safeSeed)
    rng = Math.imul(rng ^ char.charCodeAt(0), 16777619) >>> 0;
  const run: Run = {
    version: 1,
    dreadRules,
    actBearer: null,
    ...(prototype ? { prototype } : {}),
    seed: safeSeed,
    rng,
    nextId: 1,
    act: 0,
    row: -1,
    location: null,
    route: [],
    visited: [],
    hp: 70,
    maxHp: 70,
    gold: 50,
    deck: [],
    relics: [],
    scene: { kind: "map" },
    stats: {
      turns: 0,
      kills: 0,
      damage: 0,
      cards: 0,
      thresholds: 0,
      battles: 0,
    },
  };
  run.deck = [
    "strike",
    "strike",
    "guard",
    "guard",
    "arrow",
    "arrow",
    "unseen",
    "unseen",
    "flame",
    "defiance",
    "pass",
    "bread",
  ].map((id) => makeCard(run, id));
  run.route = generateRoute(run);
  if (startingRelic) grantRelic(run, startingRelic);
  return run;
}
