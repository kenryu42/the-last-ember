import { expect, test } from "bun:test";
import { BREAK_FORMATION, cardDef, needsTarget } from "../src/game/content";
import {
  makeEnemy,
  newRun,
  resolve,
  rewardPool,
  startCombat,
} from "../src/game/engine";
import { parseSave } from "../src/game/storage";

function setup(upgraded = false) {
  const run = newRun(
    "block-conversion",
    "recurring",
    { kind: "escape", target: 4, ember: true, blockConversion: true },
    "shieldfire",
  );
  const card = run.deck[0];
  if (!card) throw new Error("Missing card");
  card.def = BREAK_FORMATION.id;
  card.upgraded = upgraded;
  expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Missing combat");
  const c = run.scene;
  c.hand = [card];
  c.block = 9;
  c.energy = 0;
  c.ember = { bearer: "Mara", window: "closed", used: false };
  const enemy = makeEnemy(run, "wolf");
  enemy.hp = enemy.maxHp = 50;
  enemy.block = 3;
  enemy.vulnerable = 2;
  c.enemies = [enemy];
  return { run, card, enemy };
}
test.each([
  [false, 34],
  [true, 29],
] as const)(
  "Block conversion %s spends once before damage and costs no energy",
  (upgraded, hp) => {
    const { run, card, enemy } = setup(upgraded);
    const result = resolve(run, {
      type: "play",
      uid: card.uid,
      target: enemy.uid,
    });
    expect(result.error).toBeNull();
    if (result.run.scene.kind !== "combat") throw new Error("Expected combat");
    const c = result.run.scene;
    expect(c.block).toBe(0);
    expect(c.energy).toBe(0);
    expect(c.enemies[0]?.hp).toBe(hp);
    expect(c.enemies[0]?.block).toBe(0);
    expect(c.ember?.used).toBe(false);
    expect(c.discard).toContainEqual(card);
    expect(
      resolve(result.run, { type: "play", uid: card.uid, target: enemy.uid })
        .error,
    ).not.toBeNull();
  },
);
test("invalid target and Work do not spend Block; the attack is not a Spell", () => {
  const { run, card } = setup();
  expect(needsTarget(cardDef(card.def))).toBe(true);
  expect(cardDef(card.def).tags).toBeUndefined();
  expect(
    resolve(run, { type: "play", uid: card.uid, target: null }).error,
  ).not.toBeNull();
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  expect(run.scene.block).toBe(9);
  run.scene.energy = 1;
  run.scene.objective = { kind: "escape", target: 4, progress: 0, worked: 0 };
  const next = resolve(run, { type: "work", uid: card.uid }).run;
  if (next.scene.kind !== "combat") throw new Error("Expected combat");
  expect(next.scene.block).toBe(9);
  expect(next.scene.objective?.progress).toBe(1);
  expect(next.stats.cards).toBe(0);
});
test("conversion eligibility adds one design without changing historical offers", () => {
  const control = newRun("pool");
  const candidate = newRun("pool", "recurring", {
    kind: "escape",
    target: 4,
    blockConversion: true,
  });
  expect(rewardPool(control)).toHaveLength(30);
  expect(rewardPool(candidate)).toHaveLength(31);
  expect(
    rewardPool(candidate).filter((c) => c.id !== BREAK_FORMATION.id),
  ).toEqual(rewardPool(control));
  expect(new Set(rewardPool(candidate).map((c) => c.id)).size).toBe(31);
});
