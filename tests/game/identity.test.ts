import { expect, test } from "bun:test";
import { dreadResponse } from "../../src/game/selectors/intentions";
import { grantRelic, makeCard } from "../../src/game/engine/rewards";
import { makeEnemy } from "../../src/game/engine/combat/enemy";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { startCombat } from "../../src/game/engine/combat/setup";
import { HeadlessFight } from "../../src/lab/runner";
import { configSchema } from "../../src/lab/headless-config";
import { observe } from "../../src/lab/observation";
import type { Combat, Run } from "../../src/game/model";

function combat(run: Run): Combat {
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  return run.scene;
}
function setup(dread = 0) {
  const run = newRun("identity-test", "recurring");
  startCombat(run, "battle");
  const c = combat(run);
  c.dread = dread;
  c.enemies = [makeEnemy(run, "wolf"), makeEnemy(run, "shade")];
  return run;
}
test.each([
  [0, "none", 0, 13],
  [3, "none", 3, 13],
  [4, "minor", 4, 15],
  [7, "minor", 7, 15],
  [8, "major", 4, 19],
  [10, "major", 6, 19],
] as const)("Dread %i resolves only %s and leaves %i", (dread, band, after, damage) => {
  const run = setup(dread);
  expect(dreadResponse(combat(run)).band).toBe(band);
  const result = resolve(run, { type: "end" });
  expect(result.error).toBeNull();
  expect(result.run.hp).toBe(70 - damage);
  expect(combat(result.run).dread).toBe(after);
  expect(combat(result.run).fired).toBeUndefined();
  expect(combat(result.run).enemies.map((e) => e.strength)).toEqual([0, 0]);
  expect(result.run.stats.thresholds).toBe(band === "none" ? 0 : 1);
});
test("minor repeats, targets frontmost living, and expires before next phase", () => {
  let run = setup(4);
  combat(run).enemies.unshift({ ...makeEnemy(run, "raider"), hp: 0 });
  run = resolve(run, { type: "end" }).run;
  expect(run.hp).toBe(55);
  run = resolve(run, { type: "end" }).run;
  expect(run.hp).toBe(34); // Wolf 10+2 and shade 9, not permanent +4.
  expect(run.stats.thresholds).toBe(2);
  combat(run).dread = 0;
  combat(run).enemies.forEach((e) => (e.step = 0));
  run = resolve(run, { type: "end" }).run;
  expect(run.hp).toBe(21);
});
test("Howls occur after relief and do not change the chosen response", () => {
  const run = setup(8),
    c = combat(run);
  c.enemies = [makeEnemy(run, "stag"), makeEnemy(run, "hollow")];
  const hollow = c.enemies[1];
  if (!hollow) throw new Error("Missing Hollow");
  hollow.step = 1;
  const o = observe(run, "recurring");
  if (o.kind !== "combat") throw new Error("Missing observation");
  expect(o.response?.dreadAfter).toBe(4);
  expect(o.enemies[1]?.intent.amount).toBe(28); // 21 + Fury 3 + high-Dread 4 after Howl.
  const next = resolve(run, { type: "end" }).run;
  expect(next.hp).toBe(42);
  expect(combat(next).dread).toBe(6);
  c.dread = 3;
  const minorLater = resolve(run, { type: "end" }).run;
  expect(minorLater.hp).toBe(49); // Howl reaches 5; no same-phase Fury.
  expect(minorLater.stats.thresholds).toBe(0);
});
test("7 plus 1 triggers major; reducing before end avoids it", () => {
  const run = setup(7),
    c = combat(run);
  const pass = makeCard(run, "pass"),
    unseen = makeCard(run, "unseen");
  c.hand = [pass, unseen];
  const raised = resolve(run, {
    type: "play",
    uid: pass.uid,
    target: null,
  }).run;
  expect(combat(raised).dread).toBe(8);
  expect(dreadResponse(combat(raised)).band).toBe("major");
  const lowered = resolve(raised, {
    type: "play",
    uid: unseen.uid,
    target: null,
  }).run;
  expect(dreadResponse(combat(lowered)).band).toBe("minor");
  expect(combat(resolve(raised, { type: "end" }).run).dread).toBe(4);
});
test("Fury does not buff guard or Howl and respects Weak on Drain", () => {
  const run = setup(8),
    c = combat(run);
  c.enemies = [makeEnemy(run, "soldier"), makeEnemy(run, "stag"), makeEnemy(run, "shade")];
  const shade = c.enemies[2];
  if (!shade) throw new Error("Missing shade");
  shade.weak = 1;
  shade.hp = 10;
  const next = resolve(run, { type: "end" }).run;
  expect(next.hp).toBe(64); // floor((6+3)*.75)
  expect(combat(next).enemies[0]?.block).toBe(8);
  expect(combat(next).enemies[2]?.hp).toBe(16);
  expect(combat(next).dread).toBe(6);
});
test("Quiet bell is inert in recurring mode", () => {
  const run = setup(4);
  grantRelic(run, "charm");
  expect(resolve(run, { type: "end" }).run.hp).toBe(55);
});
test("recurring CLI fights finish and reproduce with public planners", () => {
  const config = configSchema.parse({
    rules: "recurring",
    fixture: { variant: "base", deckId: "exposed" },
    encounterId: "fury",
    seed: "identity-cli",
    policy: "planner-v2",
    searchBudget: 256,
  });
  const a = new HeadlessFight(config).auto();
  expect(a.outcome).toBe("win");
  expect(a).toEqual(new HeadlessFight(config).auto());
  expect(a.dreadEvents.some((e) => e.event === "major")).toBe(true);
});

test("Work discards instead of playing or exhausting and limits each turn", () => {
  const run = setup(7),
    c = combat(run);
  c.objective = { kind: "escape", progress: 0, target: 6, worked: 0 };
  c.hand = [makeCard(run, "spark"), makeCard(run, "flame"), makeCard(run, "bread")];
  const [spark, flame, bread] = c.hand;
  if (!spark || !flame || !bread) throw new Error("Missing cards");
  let next = resolve(run, { type: "work", uid: spark.uid }).run;
  expect(combat(next).energy).toBe(2);
  expect(combat(next).dread).toBe(7);
  expect(combat(next).discard).toContainEqual(spark);
  expect(combat(next).exhaust).toHaveLength(0);
  expect(next.stats.cards).toBe(0);
  expect(combat(next).objective?.progress).toBe(1);
  next = resolve(next, { type: "work", uid: flame.uid }).run;
  expect(next.stats.damage).toBe(0);
  expect(resolve(next, { type: "work", uid: bread.uid }).error).toContain("twice");
  next = resolve(next, { type: "end" }).run;
  expect(combat(next).objective?.worked).toBe(0);
  expect(combat(next).objective?.progress).toBe(2);
});
test("Work requires an objective, a card in hand and energy, independent of printed cost", () => {
  const run = setup(),
    c = combat(run),
    card = makeCard(run, "flame");
  c.hand = [card];
  expect(resolve(run, { type: "work", uid: card.uid }).error).not.toBeNull();
  c.objective = { kind: "escape", progress: 0, target: 6, worked: 0 };
  expect(resolve(run, { type: "work", uid: 99999 }).error).not.toBeNull();
  c.energy = 0;
  expect(resolve(run, { type: "work", uid: card.uid }).run).toBe(run);
  c.energy = 1;
  expect(resolve(run, { type: "work", uid: card.uid }).error).toBeNull();
});
test("Work completes with enemies alive and grants exactly one reward", () => {
  const run = setup(),
    c = combat(run),
    card = makeCard(run, "flame");
  c.hand = [card];
  c.objective = { kind: "escape", progress: 5, target: 6, worked: 0 };
  const result = resolve(run, { type: "work", uid: card.uid });
  expect(result.run.scene.kind).toBe("reward");
  expect(result.run.stats.battles).toBe(1);
  expect(result.run.stats.kills).toBe(0);
  expect(result.run.gold).toBe(75);
  expect(resolve(result.run, { type: "work", uid: card.uid }).error).not.toBeNull();
  const claimed = resolve(result.run, { type: "reward", card: null }).run;
  expect(claimed.gold).toBe(75);
  expect(resolve(claimed, { type: "reward", card: null }).error).not.toBeNull();
});
test("cleared danger automatically finishes guaranteed remaining Work", () => {
  const run = setup(),
    c = combat(run),
    card = makeCard(run, "strike");
  c.hand = [card];
  c.objective = { kind: "escape", progress: 1, target: 6, worked: 0 };
  c.enemies = [{ ...makeEnemy(run, "wolf"), hp: 1 }];
  const result = resolve(run, {
    type: "play",
    uid: card.uid,
    target: c.enemies[0]?.uid ?? null,
  });
  expect(result.run.scene.kind).toBe("reward");
  expect(result.run.stats.battles).toBe(1);
});
test("JSON CLI completes Escape using legal Work commands", () => {
  const child = Bun.spawnSync([
    "bun",
    "scripts/lab/playtest-cli.ts",
    "fight",
    JSON.stringify({
      rules: "recurring",
      fixture: { variant: "base", deckId: "quiet" },
      encounterId: "escape",
      seed: "escape-cli",
      policy: "offense",
      searchBudget: 256,
    }),
  ]);
  expect(child.exitCode).toBe(0);
  const result = JSON.parse(child.stdout.toString());
  expect(result.outcome).toBe("win");
  expect(result.trace.some((a: { type: string }) => a.type === "work")).toBe(true);
});
