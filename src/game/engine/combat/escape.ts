import type { Combat, Run } from "../../model";
import { makeEnemy } from "./enemy";
export function configureEscape(run: Run, combat: Combat, target = 4) {
  combat.encounter = "Escape the briar road";
  combat.objective = { kind: "escape", progress: 0, target, worked: 0 };
  // Reuse a small formation so combat leaves resources for the mission.
  combat.enemies = [makeEnemy(run, "wolf"), makeEnemy(run, "crow")];
}
