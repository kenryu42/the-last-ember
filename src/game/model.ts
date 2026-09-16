import { z } from "zod";

export const cardSchema = z.object({
  uid: z.number().int().nonnegative(),
  def: z.string(),
  upgraded: z.boolean(),
});
export type Card = z.infer<typeof cardSchema>;
const enemySchema = z.object({
  uid: z.number().int(),
  def: z.enum([
    "wolf",
    "raider",
    "soldier",
    "shade",
    "sentinel",
    "stag",
    "crow",
    "wraith",
    "roots",
    "marshal",
    "hollow",
  ]),
  hp: z.number().nonnegative(),
  maxHp: z.number().positive(),
  block: z.number().nonnegative(),
  strength: z.number(),
  weak: z.number().nonnegative(),
  vulnerable: z.number().nonnegative(),
  step: z.number().int().nonnegative(),
  joinsOn: z.number().int().nonnegative(),
});
export type Enemy = z.infer<typeof enemySchema>;
export const nodeKindSchema = z.enum([
  "battle",
  "elite",
  "event",
  "camp",
  "shop",
  "boss",
]);
export type NodeKind = z.infer<typeof nodeKindSchema>;
const nodeSchema = z.object({
  id: z.string(),
  row: z.number().int().min(0).max(5),
  lane: z.number().int().min(0).max(2),
  kind: nodeKindSchema,
  links: z.array(z.string()),
});
export type RouteNode = z.infer<typeof nodeSchema>;
const combatSchema = z.object({
  kind: z.literal("combat"),
  encounter: z.string(),
  type: z.enum(["battle", "elite", "boss"]),
  turn: z.number().int().positive(),
  energy: z.number().nonnegative(),
  block: z.number().nonnegative(),
  dread: z.number().min(0).max(10),
  fired: z.array(z.number()),
  draw: z.array(cardSchema),
  hand: z.array(cardSchema),
  discard: z.array(cardSchema),
  exhaust: z.array(cardSchema),
  enemies: z.array(enemySchema),
  reaction: z.enum(["fury", "reinforce", "ward"]),
  log: z.array(z.string()),
});
export type Combat = z.infer<typeof combatSchema>;
const sceneSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("map") }),
  combatSchema,
  z.object({
    kind: z.literal("reward"),
    cards: z.array(z.string()),
    relic: z.string().nullable(),
    gold: z.number(),
    boss: z.boolean(),
  }),
  z.object({ kind: z.literal("camp"), used: z.boolean() }),
  z.object({
    kind: z.literal("event"),
    event: z.number().int().min(0).max(7),
    resolved: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("shop"),
    cards: z.array(z.string().nullable()),
    relic: z.string().nullable(),
    healed: z.boolean(),
    removed: z.boolean(),
  }),
  z.object({ kind: z.literal("ending"), won: z.boolean() }),
]);
export const runSchema = z.object({
  version: z.literal(1),
  seed: z.string().min(1).max(80),
  rng: z.number().int().nonnegative(),
  nextId: z.number().int().nonnegative(),
  act: z.number().int().min(0).max(2),
  row: z.number().int().min(-1).max(5),
  location: z.string().nullable(),
  route: z.array(nodeSchema),
  visited: z.array(z.string()),
  hp: z.number().min(0),
  maxHp: z.number().positive(),
  gold: z.number().nonnegative(),
  deck: z.array(cardSchema).min(1),
  relics: z.array(z.string()),
  scene: sceneSchema,
  stats: z.object({
    turns: z.number().nonnegative(),
    kills: z.number().nonnegative(),
    damage: z.number().nonnegative(),
    cards: z.number().nonnegative(),
    thresholds: z.number().nonnegative(),
    battles: z.number().nonnegative(),
  }),
});
export type Run = z.infer<typeof runSchema>;
export type Scene = Run["scene"];
export type Action =
  | { type: "travel"; node: string }
  | { type: "play"; uid: number; target: number | null }
  | { type: "end" }
  | { type: "reward"; card: string | null }
  | { type: "leave" }
  | { type: "rest" }
  | { type: "upgrade"; uid: number }
  | { type: "choice"; index: number }
  | { type: "buy"; item: "card" | "relic" | "heal" | "remove"; index: number };
export type Cue =
  | "blade"
  | "arrow"
  | "spell"
  | "shield"
  | "heal"
  | "draw"
  | "dread"
  | "enemy"
  | "death"
  | "reward"
  | "victory"
  | "defeat";
export interface Frame {
  run: Run;
  cue: Cue;
  target: number | "party" | null;
  text: string;
}
export interface Resolution {
  run: Run;
  frames: Frame[];
  error: string | null;
  accounting: { drawn: number; suppressedAttackDamage: number };
}
