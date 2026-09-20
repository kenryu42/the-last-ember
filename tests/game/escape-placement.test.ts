import { expect, test } from "bun:test";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { startCombat } from "../../src/game/engine/combat/setup";
import { simulateJourney } from "../../src/lab/journey";
import { parseSave } from "../../src/game/validation/save";

const prototype = {
  kind: "escape",
  target: 4,
  ember: true,
  branchUpgrades: true,
  blockConversion: true,
  concealment: true,
  escapeAct: 1,
} as const;

test("later Escape replaces exactly one normal battle and preserves historical placement", () => {
  for (const late of [false, true]) {
    const run = newRun(
      "escape-placement",
      "recurring",
      late ? prototype : { kind: "escape", target: 4 },
    );
    expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
    let objectives = 0;
    for (const act of [0, 1, 2]) {
      run.act = act;
      for (const row of [0, 3, 5]) {
        run.row = row;
        startCombat(run, row === 5 ? "boss" : "battle");
        if (run.scene.kind !== "combat") throw new Error("Missing combat");
        const objective = run.scene.objective;
        expect(Boolean(objective)).toBe(act === (late ? 1 : 0) && row === 0);
        if (objective) {
          objectives++;
          expect(objective.target).toBe(4);
          expect(run.scene.enemies.map((e) => e.def)).toEqual(["wolf", "crow"]);
        }
      }
    }
    expect(objectives).toBe(1);
  }
});

test("full later-Escape journey has prior rewards and replays valid saves", () => {
  const journey = simulateJourney(
    "later-escape-integration",
    "search",
    96,
    "exploratory",
    "recurring",
    prototype,
    "shieldfire",
  );
  expect(journey.outcome).toBe("win");
  let run = newRun(journey.seed, "recurring", prototype, "shieldfire");
  let rewards = 0,
    escapes = 0;
  for (const action of journey.trace) {
    const next = resolve(run, action);
    expect(next.error).toBeNull();
    run = next.run;
    if (action.type === "reward") rewards++;
    if (
      action.type === "travel" &&
      run.scene.kind === "combat" &&
      run.scene.objective
    ) {
      escapes++;
      expect(rewards).toBeGreaterThan(0);
      expect(run.act).toBe(1);
      expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
    }
  }
  expect(escapes).toBe(1);
});
