import { expect, test } from "bun:test";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import type { Run } from "../../src/game/model";
import { parseSave } from "../../src/game/validation/save";

test("saves require explicit rules and reject obsolete fields without conversion", () => {
  for (const rules of ["original", "recurring"] as const) {
    const run = newRun("current-format", rules);
    expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
    const { dreadRules, ...missingRules } = run;
    expect(parseSave(JSON.stringify(missingRules)).kind).toBe("error");
    expect(parseSave(JSON.stringify({ ...run, obsolete: true })).kind).toBe(
      "error",
    );
  }
});

function atBoss(): Run {
  const run = newRun("qa-progression");
  const node = run.route.find((node) => node.row === 5);
  if (!node) throw new Error("Missing boss");
  run.row = 5;
  run.location = node.id;
  return run;
}
test("QA-001 rejects stranded maps and zero-health nonterminal saves", () => {
  expect(parseSave(JSON.stringify(atBoss())).kind).toBe("error");
  const run = newRun("qa");
  run.hp = 0;
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
  run.hp = 70;
  run.row = 2;
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
});
test("scene must match the selected stop and terminal health", () => {
  let run = newRun("qa-stop");
  const node = run.route.find((node) => node.row === 0);
  if (!node) throw new Error("Missing first stop");
  run = resolve(run, { type: "travel", node: node.id }).run;
  expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
  run.scene = { kind: "camp", used: false };
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
  run.scene = { kind: "ending", won: false };
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
  run.hp = 0;
  expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
  run.scene = { kind: "ending", won: true };
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
});
test("boss rewards advance only the first two acts, final victory round-trips", () => {
  const run = atBoss();
  run.scene = {
    kind: "reward",
    cards: ["flame"],
    relic: null,
    gold: 65,
    boss: true,
  };
  for (const act of [0, 1]) {
    run.act = act;
    expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
    const next = resolve(run, { type: "reward", card: null });
    expect(next.error).toBeNull();
    expect(next.run.act).toBe(act + 1);
    expect(parseSave(JSON.stringify(next.run)).kind).toBe("valid");
  }
  run.act = 2;
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
  run.scene = { kind: "ending", won: true };
  expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
});
