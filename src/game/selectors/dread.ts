import { dreadResponse, thresholds } from "./intentions";
import type { RulesMode } from "../engine/rules";
import type { Combat, Run } from "../model";
export function thresholdState(
  run: Run,
  c: Combat,
  mode: Exclude<RulesMode, "adventure">,
) {
  if (mode === "recurring") {
    const band = dreadResponse(c).band;
    return [
      { at: 4, bonus: 2, state: band === "minor" ? "pending" : "inactive" },
      { at: 8, bonus: 3, state: band === "major" ? "pending" : "inactive" },
    ];
  }
  return thresholds(run, c).map((t) => ({
    at: t.at,
    bonus: t.strength,
    state: !t.fired
      ? "locked"
      : !t.strength
        ? "resolved once"
        : mode === "candidate" && c.dread < t.at
          ? "suppressed"
          : "active",
  }));
}
