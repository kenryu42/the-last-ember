import { z } from "zod";
import { startingRelicSchema } from "../game/model";
const seedSchema = z
  .string()
  .min(1)
  .max(80)
  .refine((s) => s.trim() === s);
export const policySchema = z.enum(["offense", "defense", "dread", "planner"]);
// Preserve the v1 enumeration used by the frozen campaign scripts.
const allPolicySchema = z.union([policySchema, z.literal("planner-v2")]);
export type Policy = z.infer<typeof allPolicySchema>;
export const POLICY_VERSION = "public-belief-v1";
export const PLANNER_V2_VERSION = "public-belief-phase-v2";
const fixtureSchema = z.discriminatedUnion("variant", [
  z.strictObject({
    variant: z.literal("base"),
    deckId: z.enum(["quiet", "exposed", "defense"]),
  }),
  z.strictObject({
    variant: z.literal("ablation"),
    deckId: z.enum(["exposed", "defense"]),
  }),
  z.strictObject({
    variant: z.literal("diagnostic-mixed"),
    deckId: z.literal("exposed"),
  }),
]);
export const configSchema = z.strictObject({
  rules: z.enum(["control", "candidate", "recurring"]),
  fixture: fixtureSchema,
  encounterId: z.enum(["fury", "reinforce", "ward", "escape"]),
  objectiveTarget: z.number().int().min(1).max(12).optional(),
  ember: z.boolean().optional(),
  startingRelic: startingRelicSchema.optional(),
  seed: seedSchema,
  policy: allPolicySchema.default("offense"),
  planningSeed: seedSchema.default("belief-v1"),
  maxTurns: z.number().int().min(1).max(200).default(40),
  maxActions: z.number().int().min(1).max(2000).default(400),
  searchBudget: z.number().int().min(1).max(256).default(96),
});
export type HeadlessConfig = z.infer<typeof configSchema>;
