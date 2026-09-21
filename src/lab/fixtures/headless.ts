import { configureEscape } from "../../game/engine/combat/escape";
import { createPlaytestRun } from "./combat";
import type { Run } from "../../game/model";
import type { HeadlessConfig } from "../headless-config";
export function createHeadlessRun(
  config: Pick<HeadlessConfig, "fixture" | "seed" | "encounterId"> &
    Partial<Pick<HeadlessConfig, "rules" | "objectiveTarget" | "ember" | "startingRelic">>,
): Run {
  const fixture =
    config.fixture.variant === "diagnostic-mixed"
      ? ({ deckId: "exposed", variant: "base" } as const)
      : config.fixture;
  const run = createPlaytestRun({
    ...fixture,
    seed: config.seed,
    encounterId: config.encounterId === "escape" ? "fury" : config.encounterId,
  });
  if (config.encounterId === "escape" && run.scene.kind === "combat")
    configureEscape(run, run.scene, config.objectiveTarget);
  if (config.ember && run.scene.kind === "combat")
    run.scene.ember = { window: "choose", bearer: null, used: false };
  if (config.startingRelic && run.scene.kind === "combat") {
    run.relics.push(config.startingRelic);
    run.scene.relicTurn = { coalUsed: false, lanternUsed: false };
  }
  if (config.rules === "recurring" && run.scene.kind === "combat") {
    run.dreadRules = "recurring";
    run.scene.dreadResponse = "fury";
    delete run.scene.fired;
  }
  if (config.fixture.variant === "diagnostic-mixed" && run.scene.kind === "combat") {
    // Slot-preserving substitution commutes with shuffle/draw. No RNG consumed.
    for (const card of [...run.deck, ...run.scene.hand, ...run.scene.draw]) {
      if (card.def === "guard") card.def = "unseen";
      else if (card.def === "remember") card.def = "silence";
    }
  }
  return run;
}
