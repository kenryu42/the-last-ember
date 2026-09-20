import { expect, test } from "bun:test";
import { cardDef } from "../src/game/content";
import {
  cardCost,
  makeCard,
  makeEnemy,
  newRun,
  resolve,
  startCombat,
} from "../src/game/engine";
import type { Combat, Run, StartingRelic } from "../src/game/model";
import {
  HeadlessFight,
  configSchema,
  legalActions,
  observe,
} from "../src/game/playtest-headless";
import { parseSave } from "../src/game/storage";
import { simulateJourney } from "../src/game/laboratory-journey";

function combat(run: Run): Combat {
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  return run.scene;
}
test("normal new journeys have no implicit starting relic", () => {
  const run = newRun("no-starting-choice", "recurring", {
    kind: "escape",
    target: 4,
    ember: true,
    branchUpgrades: true,
    blockConversion: true,
    concealment: true,
    escapeAct: 1,
  });
  expect(run.relics).toEqual([]);
  expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
  startCombat(run, "battle");
  expect(combat(run).relicTurn).toBeUndefined();
});
function setup(relic: StartingRelic, cards: string[]) {
  const run = newRun(
    "starting-relics",
    "recurring",
    { kind: "escape", target: 4, ember: true },
    relic,
  );
  startCombat(run, "battle");
  const c = combat(run);
  c.ember = { window: "closed", bearer: "Eryn", used: false };
  c.hand = cards.map((id) => makeCard(run, id));
  c.enemies = [makeEnemy(run, "wolf")];
  const enemy = c.enemies[0];
  if (!enemy) throw new Error("Missing enemy");
  enemy.hp = enemy.maxHp = 200;
  return run;
}
function play(run: Run, index = 0) {
  const c = combat(run),
    card = c.hand[index];
  if (!card) throw new Error("Missing card");
  const result = resolve(run, {
    type: "play",
    uid: card.uid,
    target: c.enemies[0]?.uid ?? null,
  });
  expect(result.error).toBeNull();
  return result.run;
}
test.each([
  [20, 6],
  [10, 3],
  [3, 0],
])(
  "Shieldfire retains remaining Block: %i becomes %i after 7 damage",
  (block, expected) => {
    const run = setup("shieldfire", []);
    combat(run).block = block;
    expect(combat(resolve(run, { type: "end" }).run).block).toBe(expected);
  },
);
test("Hushed Coal includes Eryn, triggers once, and resets next turn", () => {
  let run = setup("hushed-coal", ["unseen", "silence"]);
  combat(run).dread = 6;
  const drawBefore = combat(run).draw.length;
  run = play(run);
  expect(combat(run).dread).toBe(2);
  expect(combat(run).energy).toBe(3);
  expect(combat(run).draw.length).toBe(drawBefore - 1);
  expect(combat(run).relicTurn?.coalUsed).toBe(true);
  combat(run).dread = 7;
  run = play(run);
  expect(combat(run).dread).toBe(3);
  expect(combat(run).energy).toBe(2);
  run = resolve(run, { type: "end" }).run;
  expect(combat(run).relicTurn?.coalUsed).toBe(false);
});
test.each([
  [5, false],
  [6, true],
  [7, true],
  [8, false],
])("Coal exact crossing boundary from %i", (dread, triggers) => {
  const run = setup("hushed-coal", ["silence"]);
  combat(run).ember = { window: "closed", bearer: "Mara", used: false };
  combat(run).dread = dread;
  expect(combat(play(run)).relicTurn?.coalUsed).toBe(triggers);
});
test("Black Lantern discounts only the first Spell, including zero-cost spells, and resets", () => {
  let run = setup("black-lantern", ["cinder", "flame"]);
  combat(run).energy = 0;
  const first = combat(run).hand[0];
  if (!first) throw new Error("Missing spell");
  expect(legalActions(observe(run, "recurring"))).toContainEqual({
    type: "play",
    uid: first.uid,
    target: combat(run).enemies[0]?.uid ?? null,
  });
  run = play(run);
  expect(combat(run).energy).toBe(0);
  expect(combat(run).dread).toBe(3); // 2 printed + 1 Lantern.
  expect(cardCost(run, combat(run), cardDef("flame"))).toBe(2);
  run = resolve(run, { type: "end" }).run;
  expect(cardCost(run, combat(run), cardDef("flame"))).toBe(1);
  const zero = play(setup("black-lantern", ["spark"]));
  expect(combat(zero).energy).toBe(4); // No negative cost.
  expect(combat(zero).dread).toBe(3);
  expect(combat(zero).relicTurn?.lanternUsed).toBe(true);
});
test("Work triggers neither Coal nor Lantern", () => {
  for (const relic of ["hushed-coal", "black-lantern"] as const) {
    const run = setup(relic, ["silence", "spark"]),
      c = combat(run);
    c.dread = 7;
    c.objective = { kind: "escape", progress: 0, target: 4, worked: 0 };
    const card = c.hand[relic === "hushed-coal" ? 0 : 1];
    if (!card) throw new Error("Missing card");
    const next = resolve(run, { type: "work", uid: card.uid }).run;
    expect(combat(next).relicTurn).toEqual({
      coalUsed: false,
      lanternUsed: false,
    });
    expect(combat(next).energy).toBe(2);
    expect(combat(next).dread).toBe(7);
  }
});
test("starting relic save round-trip and public CLI simulation", () => {
  const run = newRun("relic-save", "recurring", undefined, "black-lantern");
  expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
  const config = configSchema.parse({
    rules: "recurring",
    startingRelic: "black-lantern",
    ember: true,
    fixture: { deckId: "exposed", variant: "base" },
    encounterId: "escape",
    seed: "relic-cli",
    policy: "planner-v2",
    searchBudget: 256,
  });
  const result = new HeadlessFight(config).auto();
  expect(result.outcome).toBe("win");
  expect(result).toEqual(new HeadlessFight(config).auto());
});

test("build-aware acquisition finds existing concealment without changing prior decisions", () => {
  const prototype = { kind: "escape", target: 4, ember: true } as const;
  // This seed offers Quiet as snowfall on the three-path route.
  const control = simulateJourney(
    "identity-v1:18",
    "conservative",
    256,
    "static",
    "recurring",
    prototype,
    "hushed-coal",
  );
  const candidate = simulateJourney(
    "identity-v1:18",
    "conservative",
    256,
    "build-aware",
    "recurring",
    prototype,
    "hushed-coal",
  );
  expect(
    candidate.trace.some((a) => a.type === "reward" && a.card === "silence"),
  ).toBe(true);
  expect(
    control.trace.some((a) => a.type === "reward" && a.card === "silence"),
  ).toBe(false);
  const first = candidate.trace.findIndex(
    (a, i) => JSON.stringify(a) !== JSON.stringify(control.trace[i]),
  );
  expect(first).toBeGreaterThan(0);
  const decision = candidate.trace[first];
  if (!decision) throw new Error("Expected acquisition policies to diverge");
  expect(["reward", "buy"]).toContain(decision.type);
});

test("save boundary rejects missing once-per-turn relic state", () => {
  const run = newRun("relic-save", "recurring", undefined, "black-lantern");
  const node = run.route.find((n) => n.row === 0);
  if (!node) throw new Error("Missing node");
  const next = resolve(run, { type: "travel", node: node.id }).run;
  expect(parseSave(JSON.stringify(next)).kind).toBe("valid");
  delete combat(next).relicTurn;
  expect(parseSave(JSON.stringify(next)).kind).toBe("error");
});
