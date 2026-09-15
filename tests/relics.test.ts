import { expect, test } from "bun:test";
import {
  grantRelic,
  heal,
  hitDamage,
  intention,
  makeCard,
  makeEnemy,
  newRun,
  resolve,
  startCombat,
} from "../src/game/engine";
import type { Combat, Run } from "../src/game/model";

function combat(run: Run): Combat {
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  return run.scene;
}
function setup() {
  const run = newRun("relics");
  startCombat(run, "battle");
  return run;
}
test("setup hooks apply once, including first-turn energy and bonus cards", () => {
  const run = newRun("hooks");
  for (const id of ["ribbon", "buckler", "flint", "map", "feather"])
    grantRelic(run, id);
  expect(run.maxHp).toBe(80);
  expect(run.hp).toBe(80);
  grantRelic(run, "ribbon");
  expect(run.maxHp).toBe(80);
  startCombat(run, "battle");
  expect(combat(run).energy).toBe(4);
  expect(combat(run).block).toBe(8);
  expect(combat(run).hand).toHaveLength(7);
  const next = resolve(run, { type: "end" }).run;
  expect(combat(next).energy).toBe(3);
  expect(combat(next).hand).toHaveLength(6);
  expect(combat(next).block).toBe(0);
});
test("damage relics use exact Dread boundaries and apply before Vulnerable", () => {
  const run = setup(),
    c = combat(run),
    enemy = makeEnemy(run, "wolf");
  grantRelic(run, "lens");
  grantRelic(run, "coal");
  enemy.vulnerable = 1;
  for (const [dread, expected] of [
    [3, 13],
    [4, 10],
    [5, 10],
    [6, 15],
    [10, 15],
  ]) {
    if (dread === undefined || expected === undefined)
      throw new Error("bad fixture");
    c.dread = dread;
    expect(hitDamage(run, c, enemy, 7)).toBe(expected);
  }
});
test("thread applies per block effect and bowl per healing effect, capped", () => {
  const run = setup();
  grantRelic(run, "thread");
  grantRelic(run, "bowl");
  run.hp = 41;
  expect(heal(run, 5)).toBe(8);
  expect(run.hp).toBe(49);
  const card = makeCard(run, "bash");
  run.deck = [card];
  combat(run).hand = [card];
  combat(run).draw = [];
  combat(run).enemies = [makeEnemy(run, "wolf")];
  const next = resolve(run, {
    type: "play",
    uid: card.uid,
    target: combat(run).enemies[0]?.uid ?? null,
  }).run;
  expect(combat(next).block).toBe(7);
  run.hp = 69;
  expect(heal(run, 20)).toBe(1);
});
test("kettle and purse trigger on victory, not on every kill or reward claim", () => {
  const run = setup();
  grantRelic(run, "kettle");
  grantRelic(run, "purse");
  run.hp = 40;
  const card = makeCard(run, "volley");
  run.deck = [card];
  combat(run).hand = [card];
  combat(run).draw = [];
  combat(run).enemies = [makeEnemy(run, "crow"), makeEnemy(run, "wolf")];
  combat(run).enemies.forEach((e) => (e.hp = 3));
  const won = resolve(run, { type: "play", uid: card.uid, target: null }).run;
  expect(won.hp).toBe(43);
  expect(won.gold).toBe(87);
  expect(won.stats.kills).toBe(2);
  const claimed = resolve(won, { type: "reward", card: null }).run;
  expect(claimed.hp).toBe(43);
  expect(claimed.gold).toBe(87);
});
test("boss phase changes and Hollow high-Dread behavior are included in intent", () => {
  const run = setup(),
    c = combat(run);
  for (const kind of ["roots", "marshal", "hollow"] satisfies (
    "roots" | "marshal" | "hollow"
  )[]) {
    const e = makeEnemy(run, kind);
    e.step = kind === "marshal" ? 0 : 1;
    c.dread = 0;
    const normal = intention(e, c).amount;
    e.hp = Math.floor(e.maxHp / 2) + 1;
    expect(intention(e, c).amount).toBe(normal);
    e.hp = Math.floor(e.maxHp / 2);
    expect(intention(e, c).amount).toBe(normal + 3);
    c.dread = 6;
    expect(intention(e, c).amount).toBe(
      normal + 3 + (kind === "hollow" ? 4 : 0),
    );
  }
});
test("upgrades have independently calculated damage, block, healing and energy", () => {
  const expected: [string, number, number, number, number, number][] = [
    ["strike", 10, 0, 0, 2, 0],
    ["guard", 0, 10, 0, 2, 0],
    ["arrow", 8, 0, 0, 2, 0],
    ["unseen", 0, 8, 0, 2, 0],
    ["flame", 24, 0, 0, 1, 3],
    ["defiance", 10, 0, 0, 2, 0],
    ["pass", 0, 15, 0, 2, 1],
    ["bash", 7, 7, 0, 2, 0],
    ["shield", 6, 0, 0, 2, 0],
    ["stand", 11, 23, 0, 1, 0],
    ["challenge", 0, 0, 0, 3, 1],
    ["oath", 0, 13, 0, 2, 0],
    ["rally", 0, 7, 0, 4, 0],
    ["needle", 17, 0, 0, 2, 0],
    ["volley", 14, 0, 0, 1, 0],
    ["scout", 0, 0, 0, 3, 0],
    ["feint", 0, 0, 0, 3, 1],
    ["silence", 0, 0, 0, 2, 0],
    ["double", 12, 0, 0, 2, 0],
    ["trail", 0, 0, 0, 3, 0],
    ["spark", 0, 0, 0, 5, 2],
    ["inferno", 22, 0, 0, 1, 4],
    ["cinder", 16, 0, 0, 2, 2],
    ["resolve", 0, 10, 0, 2, 0],
    ["ward", 0, 18, 0, 2, 2],
    ["remember", 0, 0, 0, 2, 1],
    ["sunrise", 0, 0, 12, 1, 2],
    ["bread", 0, 0, 8, 2, 0],
    ["courage", 0, 5, 0, 3, 0],
    ["lantern", 0, 0, 0, 2, 0],
    ["sacrifice", 0, 0, 0, 6, 3],
    ["home", 0, 16, 0, 1, 0],
  ];
  for (const [id, damage, block, healing, energy, dread] of expected) {
    const run = setup(),
      card = makeCard(run, id);
    card.upgraded = true;
    run.deck = [card];
    run.hp = 30;
    const c = combat(run);
    c.hand = [card];
    c.draw = [];
    c.discard = [];
    c.exhaust = [];
    const enemy = makeEnemy(run, "wolf");
    enemy.hp = 100;
    enemy.maxHp = 100;
    c.enemies = [enemy];
    const next = resolve(run, {
        type: "play",
        uid: card.uid,
        target: enemy.uid,
      }).run,
      n = combat(next);
    expect([
      100 - (n.enemies[0]?.hp ?? 0),
      n.block,
      next.hp - 30,
      n.energy,
      n.dread,
    ]).toEqual([damage, block, healing, energy, dread]);
  }
});
