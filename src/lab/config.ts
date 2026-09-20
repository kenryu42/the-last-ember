import { z } from "zod";
import { configSchema } from "./headless-config";
import type { RulesMode } from "../game/engine/rules";
export type TestRules = Exclude<RulesMode, "adventure">;
export interface TestConfig {
  rules: TestRules;
  deckId: string;
  encounterId: string;
  seed: string;
  player: string;
  variant: "base" | "ablation";
}

export const botSchema = z.enum([
  "random",
  "greedy",
  "conservative",
  "strategic",
  "search",
  "search-tempo",
  "rollout-one",
  "search-two",
  "search-sequence",
  "search-material",
  "burst",
  "stall",
  "resource",
]);
export const labConfigSchema = configSchema.extend({
  bot: botSchema.default("search"),
  searchBudget: z.number().int().min(1).max(32768).default(96),
});
export type LabConfig = z.infer<typeof labConfigSchema>;
