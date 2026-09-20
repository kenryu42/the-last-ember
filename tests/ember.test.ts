import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JourneyCrossroads } from "../src/ui/scenes";
import { cardDef } from "../src/game/content";
import {
  makeCard,
  makeEnemy,
  newRun,
  resolve,
  startCombat,
} from "../src/game/engine";
import {
  HeadlessFight,
  configSchema,
  legalActions,
  observe,
  planV2,
} from "../src/game/playtest-headless";
import type { Combat, Hero, Run } from "../src/game/model";
import { parseSave } from "../src/game/storage";
import {
  journeyLegalActions,
  simulateJourney,
} from "../src/game/laboratory-journey";

function c(run: Run): Combat {
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  return run.scene;
}
function setup(hero: Hero, cards: string[]) {
  const run = newRun("ember", "recurring", {
    kind: "escape",
    target: 4,
    ember: true,
  });
  startCombat(run, "battle");
  c(run).hand = cards.map((id) => makeCard(run, id));
  c(run).enemies = [makeEnemy(run, "wolf"), makeEnemy(run, "shade")];
  c(run).enemies.forEach((e) => (e.hp = e.maxHp = 100));
  return resolve(run, { type: "bearer", hero }).run;
}
function play(run: Run, index = 0, empower?: number) {
  const card = c(run).hand[index];
  if (!card) throw new Error("Missing card");
  const result = resolve(run, {
    type: "play",
    uid: card.uid,
    target: c(run).enemies[0]?.uid ?? null,
    empower,
  });
  expect(result.error).toBeNull();
  return result;
}
test("Act bearer choice precedes actions and stays locked on later turns", () => {
  const run = newRun("ember-timing", "recurring", {
    kind: "escape",
    target: 4,
    ember: true,
  });
  startCombat(run, "battle");
  expect(c(run).hand.length).toBe(5);
  expect(legalActions(observe(run, "recurring"))).toEqual([
    { type: "bearer", hero: "Mara" },
    { type: "bearer", hero: "Eryn" },
    { type: "bearer", hero: "Aldren" },
  ]);
  expect(resolve(run, { type: "end" }).error).toContain("starting");
  let next = resolve(run, { type: "bearer", hero: "Mara" }).run;
  expect(next.actBearer).toBe("Mara");
  expect(c(next).dread).toBe(0);
  expect(resolve(next, { type: "bearer", hero: "Eryn" }).error).not.toBeNull();
  next = resolve(next, { type: "end" }).run;
  expect(c(next).hand.length).toBe(5);
  c(next).dread = 7;
  const rejected = resolve(next, { type: "bearer", hero: "Aldren" });
  expect(rejected.error).toContain("locked");
  expect(rejected.run).toEqual(next);
  expect(c(rejected.run).dread).toBe(7);
  expect(
    legalActions(observe(next, "recurring")).some((a) => a.type === "bearer"),
  ).toBe(false);
});
test("each Act requires a bearer before travel, without drawing or consuming RNG", () => {
  let run = newRun("act-start", "recurring", {
    kind: "escape",
    target: 4,
    ember: true,
  });
  for (const hero of ["Eryn", "Aldren", "Mara"] as const) {
    expect(run.row).toBe(-1);
    expect(run.actBearer).toBeNull();
    expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
    const node = run.route.find((n) => n.row === 0);
    if (!node) throw new Error("Missing opening node");
    expect(journeyLegalActions(run)).toEqual([
      { type: "bearer", hero: "Mara" },
      { type: "bearer", hero: "Eryn" },
      { type: "bearer", hero: "Aldren" },
    ]);
    const rejected = resolve(run, { type: "travel", node: node.id });
    expect(rejected.error).toContain("starting Ember bearer");
    expect(rejected.run).toEqual(run);
    const choice = resolve(run, { type: "bearer", hero });
    expect(choice.error).toBeNull();
    expect(choice.run).toEqual({ ...run, actBearer: hero });
    run = choice.run;
    expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
    expect(resolve(run, { type: "bearer", hero: "Mara" }).error).toContain(
      "locked",
    );
    const travel = resolve(run, { type: "travel", node: node.id });
    expect(travel.error).toBeNull();
    run = travel.run;
    expect(c(run).ember).toEqual({
      window: "closed",
      bearer: hero,
      used: false,
    });
    expect(c(run).hand).toHaveLength(5);
    expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
    const missingBearer = structuredClone(run);
    missingBearer.actBearer = null;
    c(missingBearer).ember = { window: "choose", bearer: null, used: false };
    expect(parseSave(JSON.stringify(missingBearer)).kind).toBe("error");
    if (run.act < 2) {
      run.scene = {
        kind: "reward",
        cards: [],
        relic: null,
        gold: 0,
        boss: true,
      };
      run = resolve(run, { type: "reward", card: null }).run;
    }
  }
});

test("Act-start screen exposes three choices, then reveals the crossroads", () => {
  let run = newRun("bearer-screen", "recurring", {
    kind: "escape",
    target: 4,
    ember: true,
  });
  const render = () =>
    renderToStaticMarkup(
      createElement(JourneyCrossroads, {
        run,
        dispatch: () => {},
        busy: false,
      }),
    );
  const choice = render();
  for (const hero of ["Mara", "Eryn", "Aldren"]) {
    expect(choice).toContain(`aria-label="Choose ${hero}"`);
    expect(choice).toContain(`/assets/bearer-${hero.toLowerCase()}.webp`);
  }
  expect(choice).toContain("Locked for this Act");
  expect(choice).toContain("cannot change until you clear this Act");
  expect(choice).not.toContain("Encounter &amp; opening hand");
  expect(choice).not.toContain('aria-label="Combat"');
  expect(choice).not.toContain('aria-label="Choose a path"');
  run = resolve(run, { type: "bearer", hero: "Eryn" }).run;
  const crossroads = render();
  expect(crossroads).toContain('aria-label="Choose a path"');
  expect(crossroads).not.toContain("bearer-selection");
});

test("bearer persists through encounters and passive use resets each turn and fight", () => {
  let run = setup("Eryn", ["guard"]);
  c(run).ember = { bearer: "Eryn", window: "closed", used: true };
  run = resolve(run, { type: "end" }).run;
  expect(c(run).ember).toEqual({
    bearer: "Eryn",
    window: "closed",
    used: false,
  });
  c(run).ember = { bearer: "Eryn", window: "closed", used: true };
  startCombat(run, "battle");
  expect(c(run).ember).toEqual({
    bearer: "Eryn",
    window: "closed",
    used: false,
  });
  expect(run.actBearer).toBe("Eryn");
  expect(c(run).dread).toBe(0);
  expect(resolve(run, { type: "bearer", hero: "Mara" }).error).toContain(
    "locked",
  );
});

test("a full journey chooses once per Act and round-trips the locked bearer through every stop", () => {
  const prototype = {
    kind: "escape",
    target: 4,
    ember: true,
    branchUpgrades: true,
    blockConversion: true,
    concealment: true,
    escapeAct: 1,
  } as const;
  const result = simulateJourney(
    "act-bearer:0",
    "strategic",
    96,
    "static",
    "recurring",
    prototype,
  );
  expect(result.outcome).toBe("win");
  let run = newRun(result.seed, "recurring", prototype);
  const chosenActs: number[] = [];
  const stops = new Set<string>();
  for (const action of result.trace) {
    stops.add(run.scene.kind);
    expect(journeyLegalActions(run)).toContainEqual(action);
    const before = run;
    const next = resolve(run, action);
    expect(next.error).toBeNull();
    run = next.run;
    if (action.type === "bearer") {
      expect(before.actBearer).toBeNull();
      expect(before.scene.kind).toBe("map");
      expect(before.row).toBe(-1);
      expect(chosenActs).not.toContain(before.act);
      chosenActs.push(before.act);
      expect(run.actBearer).toBe(action.hero);
    } else if (run.act !== before.act) {
      expect(before.scene.kind).toBe("reward");
      expect(run.actBearer).toBeNull();
    } else expect(run.actBearer).toBe(before.actBearer);
    const loaded = parseSave(JSON.stringify(run));
    expect(loaded).toEqual({ kind: "valid", run });
    if (loaded.kind === "valid") run = loaded.run;
    if (run.actBearer !== null) {
      expect(journeyLegalActions(run).some((a) => a.type === "bearer")).toBe(
        false,
      );
      expect(
        resolve(run, {
          type: "bearer",
          hero: run.actBearer === "Mara" ? "Eryn" : "Mara",
        }).error,
      ).not.toBeNull();
    }
  }
  expect(chosenActs).toEqual([0, 1, 2]);
  expect(stops.has("camp")).toBe(true);
  expect(stops.has("map")).toBe(true);
  expect(run.scene).toEqual({ kind: "ending", won: true });
});

test("Work does not activate a passive or unlock the Act bearer", () => {
  let run = setup("Mara", ["guard"]);
  run = resolve(run, { type: "end" }).run;
  c(run).hand = [makeCard(run, "guard")];
  c(run).objective = { kind: "escape", target: 4, progress: 0, worked: 0 };
  const card = c(run).hand[0];
  if (!card) throw new Error("Missing guard");
  const worked = resolve(run, { type: "work", uid: card.uid }).run;
  expect(c(worked).ember?.used).toBe(false);
  expect(c(worked).block).toBe(0);
  expect(
    resolve(worked, { type: "bearer", hero: "Eryn" }).error,
  ).not.toBeNull();
  const played = play(run).run;
  expect(
    resolve(played, { type: "bearer", hero: "Eryn" }).error,
  ).not.toBeNull();
});
test("Mara adds 3 to only the first Block effect regardless of card owner", () => {
  let run = setup("Mara", ["unseen", "guard"]);
  run = play(run).run;
  expect(c(run).block).toBe(8);
  run = play(run).run;
  expect(c(run).block).toBe(15);
  run = resolve(run, { type: "end" }).run;
  c(run).hand = [makeCard(run, "guard")];
  expect(c(play(run).run).block).toBe(10);
});
test("Eryn adds 2 reduction to only the first lowering card, clamped at zero", () => {
  const run = setup("Eryn", ["unseen", "silence"]);
  c(run).dread = 9;
  const first = play(run);
  expect(c(first.run).dread).toBe(5);
  expect(first.accounting.ember?.dreadReduced).toBe(2);
  expect(c(play(first.run).run).dread).toBe(1);
  const low = setup("Eryn", ["unseen"]);
  c(low).dread = 3;
  const lowered = play(low);
  expect(c(lowered.run).dread).toBe(0);
  expect(lowered.accounting.ember?.dreadReduced).toBe(1);
});
test("Aldren optionally adds one Dread and 5 to exactly one AoE hit", () => {
  const run = setup("Aldren", ["inferno", "cinder"]);
  const secondEnemy = c(run).enemies[1];
  if (!secondEnemy) throw new Error("Missing enemy");
  const ordinary = play(run);
  expect(c(ordinary.run).ember?.used).toBe(false);
  const empowered = play(run, 0, secondEnemy.uid);
  expect(c(empowered.run).enemies.map((e) => e.hp)).toEqual([83, 78]);
  expect(c(empowered.run).dread).toBe(5);
  const card = c(empowered.run).hand[0];
  if (!card) throw new Error("Missing cinder");
  expect(
    resolve(empowered.run, {
      type: "play",
      uid: card.uid,
      target: secondEnemy.uid,
      empower: secondEnemy.uid,
    }).error,
  ).not.toBeNull();
  expect(cardDef("flame").tags).toContain("Spell");
  expect(cardDef("volley").tags).toBeUndefined();
});
test("public CLI planner chooses a bearer and reproducibly completes a fight", () => {
  const config = configSchema.parse({
    rules: "recurring",
    fixture: { deckId: "exposed", variant: "base" },
    encounterId: "fury",
    seed: "ember-cli",
    ember: true,
    policy: "planner",
    searchBudget: 256,
  });
  const result = new HeadlessFight(config).auto();
  expect(result.outcome).toBe("win");
  expect(result.trace[0]?.type).toBe("bearer");
  expect(result).toEqual(new HeadlessFight(config).auto());
});

test("equal starting-bearer search budgets reach Aldren's profitable spell line", () => {
  const run = setup("Mara", ["cinder"]);
  run.actBearer = null;
  c(run).ember = { window: "choose", bearer: null, used: false };
  c(run).energy = 1;
  for (const budget of [96, 256]) {
    const plan = planV2(observe(run, "recurring"), "fair-bearers", budget);
    expect(plan.action).toEqual({ type: "bearer", hero: "Aldren" });
    expect(plan.engineCalls).toBeLessThanOrEqual(budget);
  }
});

test("recurring objective and bearer saves round-trip and reject mixed rules", () => {
  let run = newRun("save-ember", "recurring", {
    kind: "escape",
    target: 4,
    ember: true,
  });
  const node = run.route.find((n) => n.row === 0);
  if (!node) throw new Error("Missing opening node");
  run = resolve(run, { type: "bearer", hero: "Eryn" }).run;
  run = resolve(run, { type: "travel", node: node.id }).run;
  const load = (state: Run) => parseSave(JSON.stringify(state));
  expect(load(run)).toEqual({ kind: "valid", run });
  run = resolve(run, { type: "end" }).run;
  expect(load(run)).toEqual({ kind: "valid", run });
  c(run).fired = [];
  expect(load(run).kind).toBe("error");
  delete c(run).fired;
  const mismatched = structuredClone(run);
  mismatched.actBearer = "Mara";
  expect(load(mismatched).kind).toBe("error");
  const obsolete = {
    ...run,
    scene: { ...c(run), ember: { ...c(run).ember, window: "pass" } },
  };
  expect(parseSave(JSON.stringify(obsolete)).kind).toBe("error");
  c(run).ember = { window: "choose", bearer: null, used: false };
  expect(load(run).kind).toBe("error");
});
