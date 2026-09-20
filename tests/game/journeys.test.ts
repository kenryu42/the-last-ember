import { expect, test } from "bun:test";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { parseSave } from "../../src/game/validation/save";
import { journeyAction } from "../support/pilot";

test("seeded complete journeys preserve zones and reload determinism after every action", () => {
  let wins = 0,
    losses = 0;
  for (const seed of ["lantern", "briar", "warmth", "beacon", "home"]) {
    let run = newRun(seed),
      steps = 0;
    while (run.scene.kind !== "ending" && steps++ < 1000) {
      const action = journeyAction(run),
        next = resolve(run, action);
      expect(next.error).toBeNull();
      const saved = parseSave(JSON.stringify(run));
      if (saved.kind !== "valid") throw new Error("Invalid save");
      expect(resolve(saved.run, action).run).toEqual(next.run);
      run = next.run;
      expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
      expect(run.hp).toBeGreaterThanOrEqual(0);
      expect(run.hp).toBeLessThanOrEqual(run.maxHp);
      expect(run.gold).toBeGreaterThanOrEqual(0);
      if (run.scene.kind === "combat") {
        const c = run.scene,
          zones = [...c.draw, ...c.hand, ...c.discard, ...c.exhaust];
        expect(zones.map((c) => c.uid).sort((a, b) => a - b)).toEqual(
          run.deck.map((c) => c.uid).sort((a, b) => a - b),
        );
        expect(c.hand.length).toBeLessThanOrEqual(10);
      }
    }
    expect(run.scene.kind).toBe("ending");
    if (run.scene.kind === "ending" && run.scene.won) {
      wins++;
      expect(run.visited).toHaveLength(18);
    } else losses++;
  }
  // This is regression coverage, not a claim about human win rates.
  expect(wins).toBeGreaterThan(0);
  expect(wins + losses).toBe(5);
});

test("a journey that never defends or attacks reaches defeat legally", () => {
  let run = newRun("reckless");
  const node = run.route.find((n) => n.row === 0);
  if (!node) throw new Error("Missing first stop");
  run = resolve(run, { type: "travel", node: node.id }).run;
  for (let i = 0; i < 50 && run.scene.kind === "combat"; i++)
    run = resolve(run, { type: "end" }).run;
  expect(run.hp).toBe(0);
  expect(run.scene).toEqual({ kind: "ending", won: false });
  expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
});
