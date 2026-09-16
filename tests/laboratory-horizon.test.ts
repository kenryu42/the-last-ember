import { expect, test } from "bun:test";
import { makeCard, makeEnemy } from "../src/game/engine";
import {
  createHeadlessRun,
  legalActions,
  observe,
  planHorizon,
  planV2,
} from "../src/game/playtest-headless";
import { labConfigSchema } from "../src/game/laboratory";

const config = labConfigSchema.parse({
  rules: "control",
  fixture: { deckId: "quiet", variant: "base" },
  encounterId: "ward",
  seed: "horizon-development",
});

test("two-phase rollout plays the next drawn defense before a second enemy phase", () => {
  const run = createHeadlessRun(config);
  if (run.scene.kind !== "combat") throw new Error("fixture");
  const guard = makeCard(run, "guard");
  const enemy = makeEnemy(run, "sentinel");
  enemy.step = 1; // Guard now, then 15+2 damage next phase.
  run.deck = [guard];
  run.scene.hand = [];
  run.scene.draw = [guard];
  run.scene.discard = [];
  run.scene.enemies = [enemy];
  const o = observe(run, "control");
  const one = planHorizon(o, "independent", 4096, 1);
  const two = planHorizon(o, "independent", 4096, 2);
  expect(one.evaluations).toEqual([
    { action: { type: "end" }, value: 0, completedSamples: 3 },
  ]);
  // 17 incoming minus 7 block = 10 health lost, valued at 3. Not -51
  // from blindly passing the second turn, nor 0 from omitting that phase.
  expect(two.evaluations).toEqual([
    { action: { type: "end" }, value: -30, completedSamples: 3 },
  ]);
  expect(one.engineCalls).toBe(6);
  expect(two.engineCalls).toBe(21);
  const sequence = planHorizon(o, "independent", 32768, 2, "sequence");
  expect(sequence.evaluations).toEqual(two.evaluations);
  expect(sequence.engineCalls).toBeGreaterThan(two.engineCalls);
  run.hp = 5;
  expect(
    planHorizon(observe(run, "control"), "independent", 4096, 2).evaluations[0]
      ?.value,
  ).toBe(-100000);
});

test("horizon budgets count continuation evaluations and fallback without comparing partial trials", () => {
  const o = observe(createHeadlessRun(config), "control");
  for (const phases of [1, 2] as const)
    for (const budget of [1, 3, 96, 256, 1024, 4096]) {
      const plan = planHorizon(o, "budget", budget, phases);
      expect(plan.engineCalls).toBeLessThanOrEqual(budget);
      expect(legalActions(o)).toContainEqual(plan.action);
      expect(plan.evaluations.filter((e) => e.value !== null).length).toBe(
        plan.completedCandidates,
      );
      expect(
        plan.evaluations.every(
          (e) => e.value === null || e.completedSamples === 3,
        ),
      ).toBe(true);
      if (!plan.completedCandidates)
        expect(plan.action).toEqual(
          planV2(o, "budget", Math.min(256, budget)).action,
        );
    }
});

test("horizon policy cannot see actual draw order or engine RNG and leaves its observation unchanged", () => {
  const a = createHeadlessRun(config),
    b = structuredClone(a);
  if (b.scene.kind !== "combat") throw new Error("fixture");
  b.scene.draw.reverse();
  b.rng = 42;
  b.seed = "private";
  const oa = observe(a, "control"),
    ob = observe(b, "control");
  const before = structuredClone(oa);
  for (const phases of [1, 2] as const)
    expect(planHorizon(oa, "public", 4096, phases)).toEqual(
      planHorizon(ob, "public", 4096, phases),
    );
  expect(oa).toEqual(before);
});

test("sequence continuations stay public, deterministic and inside nested call budgets", () => {
  const run = createHeadlessRun(config);
  const other = structuredClone(run);
  if (other.scene.kind !== "combat") throw new Error("fixture");
  other.scene.draw.reverse();
  other.rng = 1;
  for (const budget of [1, 96, 4096, 32768]) {
    const plan = planHorizon(
      observe(run, "control"),
      "sequence",
      budget,
      2,
      "sequence",
    );
    expect(plan.engineCalls).toBeLessThanOrEqual(budget);
    expect(plan).toEqual(
      planHorizon(observe(other, "control"), "sequence", budget, 2, "sequence"),
    );
    expect(legalActions(observe(run, "control"))).toContainEqual(plan.action);
    expect(
      plan.evaluations.every(
        (e) => e.value === null || e.completedSamples === 3,
      ),
    ).toBe(true);
    if (budget === 32768)
      expect(plan.completedCandidates).toBe(plan.candidates);
  }
}, 20000);

test("material terminal utility uses removed HP and threats rather than an arbitrary win jump", () => {
  const run = createHeadlessRun(config);
  if (run.scene.kind !== "combat") throw new Error("fixture");
  const strike = makeCard(run, "strike");
  const enemy = makeEnemy(run, "wolf");
  enemy.hp = 7;
  run.deck = [strike];
  run.scene.hand = [strike];
  run.scene.draw = [];
  run.scene.discard = [];
  run.scene.enemies = [enemy];
  const o = observe(run, "control");
  const original = planHorizon(o, "terminal", 4096, 1);
  const material = planHorizon(o, "terminal", 4096, 1, "offense", "material");
  expect(original.evaluations[0]?.value).toBe(100000 + run.hp * 3);
  expect(material.evaluations[0]?.value).toBe(25); // 7 HP + one removed threat worth 18.
  expect(material.action).toEqual({
    type: "play",
    uid: strike.uid,
    target: enemy.uid,
  });
  expect(material.engineCalls).toBe(original.engineCalls);
  run.hp = 1;
  run.scene.hand = [];
  expect(
    planHorizon(
      observe(run, "control"),
      "terminal",
      4096,
      1,
      "offense",
      "material",
    ).evaluations[0]?.value,
  ).toBe(-100000);
});
