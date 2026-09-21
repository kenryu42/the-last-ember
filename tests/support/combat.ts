import { expect } from "bun:test";
import { resolve } from "../../src/game/engine/resolve";
import type { Action, Run } from "../../src/game/model";

export function resolveCombat(run: Run, action: Action) {
  const result = resolve(run, action);
  expect(result.error).toBeNull();
  if (result.run.scene.kind !== "combat") throw new Error("Expected combat");
  return { result, combat: result.run.scene };
}

export function changeHiddenState(run: Run, rng: number, seed: string) {
  const changed = structuredClone(run);
  if (changed.scene.kind !== "combat") throw new Error("Expected combat");
  changed.scene.draw.reverse();
  changed.rng = rng;
  changed.seed = seed;
  return changed;
}
