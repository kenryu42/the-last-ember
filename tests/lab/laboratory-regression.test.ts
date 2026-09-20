import { expect, test } from "bun:test";
import { labConfigSchema } from "../../src/lab/config";
import { simulate } from "../../src/lab/simulation";

test("lab-baseline-v1:39 preserves the original search failure and tempo recovery", () => {
  const config = labConfigSchema.parse({
    rules: "control",
    fixture: { deckId: "exposed", variant: "base" },
    encounterId: "reinforce",
    seed: "lab-baseline-v1:39",
    planningSeed: "policy:lab-baseline-v1:39",
    bot: "search",
    searchBudget: 256,
  });
  const control = simulate(config);
  const tempo = simulate({ ...config, bot: "search-tempo" });
  expect([control.outcome, control.turns]).toEqual(["loss", 12]);
  expect([tempo.outcome, tempo.finalHealth, tempo.turns]).toEqual([
    "win",
    21,
    13,
  ]);
});

test("lab-experiment-v1:9 isolates Dread recovery on exactly the same legal sequence", () => {
  const config = labConfigSchema.parse({
    rules: "control",
    fixture: { deckId: "exposed", variant: "diagnostic-mixed" },
    encounterId: "ward",
    seed: "lab-experiment-v1:9",
    planningSeed: "policy:lab-experiment-v1:9",
    bot: "search",
    searchBudget: 256,
  });
  const control = simulate(config);
  const candidate = simulate({ ...config, rules: "candidate" });
  expect(control.trace).toEqual(candidate.trace);
  expect([control.finalHealth, candidate.finalHealth]).toEqual([39, 50]);
  expect(control.damageTaken - candidate.damageTaken).toBe(11);
  expect(control.turns).toBe(8);
});

test("lab-experiment-v1:16 preserves shield sequencing as a pacing diagnostic", () => {
  const config = labConfigSchema.parse({
    rules: "control",
    fixture: { deckId: "defense", variant: "base" },
    encounterId: "ward",
    seed: "lab-experiment-v1:16",
    planningSeed: "policy:lab-experiment-v1:16",
    bot: "search",
    searchBudget: 256,
  });
  const control = simulate(config);
  const ablation = simulate({
    ...config,
    fixture: { deckId: "defense", variant: "ablation" },
  });
  expect([control.finalHealth, control.turns]).toEqual([69, 7]);
  expect([ablation.finalHealth, ablation.turns]).toEqual([27, 19]);
  expect(
    control.history.filter((h) => h.turn === 2).map((h) => h.card),
  ).toEqual(["pass", "pass", "guard", "rally", "shield", null]);
});
