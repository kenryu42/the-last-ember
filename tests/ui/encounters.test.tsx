import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ACTS, EVENTS } from "../../src/game/content/world";
import { generateRoute } from "../../src/game/engine/journey/route";
import { makeEnemy } from "../../src/game/engine/combat/enemy";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { startCombat } from "../../src/game/engine/combat/setup";
import { parseSave } from "../../src/game/validation/save";
import { shouldAutoEndTurn } from "../../src/game/selectors/turn";
import {
  ArrivalTransition,
  EncounterIntro,
  approachDuration,
  encounterArt,
} from "../../src/ui/journey/encounters";
import { StopScene } from "../../src/ui/stops/StopScene";

test("encounter artwork follows the actual formation without mutating enemy order", () => {
  const run = newRun("encounter-art");
  run.act = 2;
  startCombat(run, "elite");
  const before = structuredClone(run);
  expect(encounterArt(run)?.src).toBe("/assets/encounters/mountain/crow-wraith-wraith.webp");
  expect(run).toEqual(before);
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  run.scene.enemies.reverse();
  expect(encounterArt(run)?.src).toBe("/assets/encounters/mountain/crow-wraith-wraith.webp");
  run.scene.enemies = [makeEnemy(run, "wolf"), makeEnemy(run, "crow")];
  run.act = 1;
  expect(encounterArt(run)?.src).toBe("/assets/encounters/ruins/crow-wolf.webp");
});

test("every reachable encounter formation, Act stop and story has bundled full-scene art", async () => {
  const sources = new Set<string>();
  const add = (run: ReturnType<typeof newRun>) => {
    const art = encounterArt(run);
    if (!art) throw new Error("Missing encounter artwork mapping");
    sources.add(art.src);
  };
  for (let act = 0; act < ACTS.length; act++) {
    for (const type of ["battle", "elite", "boss"] as const) {
      for (let seed = 0; seed < 64; seed++) {
        const run = newRun(`encounter-${seed}`);
        run.act = act;
        startCombat(run, type);
        add(run);
      }
    }
    const run = newRun("stops");
    run.act = act;
    run.scene = { kind: "camp", used: false };
    add(run);
    run.scene = {
      kind: "shop",
      cards: [],
      relic: null,
      healed: false,
      removed: false,
    };
    add(run);
    for (let event = 0; event < EVENTS.length; event++) {
      run.scene = { kind: "event", event, resolved: null };
      add(run);
    }
  }
  const escape = newRun("escape-art", "recurring", {
    kind: "escape",
    target: 4,
    escapeAct: 1,
  });
  escape.act = 1;
  escape.row = 0;
  startCombat(escape, "battle");
  add(escape);
  expect(sources.size).toBe(32);
  const missing: string[] = [];
  for (const source of sources)
    if (!(await Bun.file(`public${source}`).exists())) missing.push(source);
  expect(missing).toEqual([]);
});

test("approach uses the selected trail and retains the previous crossroads image", () => {
  const from = newRun("approach");
  from.row = 1;
  from.location = "0-1-1";
  const node = from.route.find((node) => node.id === "0-2-2");
  if (!node) throw new Error("Missing right trail");
  const destination = resolve(from, { type: "travel", node: node.id }).run;
  const html = renderToStaticMarkup(
    <ArrivalTransition
      from={from}
      node={node}
      destination={destination}
      speed={0.5}
      reduced={false}
      complete={() => {}}
    />,
  );
  expect(html).toContain("/assets/journey/forest-3.webp");
  expect(html).toContain("transform-origin:90% 43%");
  expect(html).toContain("Following the right trail");
  expect(html).toContain("Skip approach");
  expect(html).toContain("--approach-duration:2200ms");
  expect(html).not.toContain("data-node");
  expect(html).not.toContain("Prepare for battle");
});

test("approach speed scales while reduced motion stays a short fade", () => {
  expect(approachDuration(0.5, false)).toBe(2200);
  expect(approachDuration(1, false)).toBe(1100);
  expect(approachDuration(2, false)).toBe(550);
  expect(approachDuration(0.5, true)).toBe(160);
  expect(approachDuration(2, true)).toBe(160);
});

test("battle introduction offers preparation without combat or bearer controls", () => {
  const run = newRun("intro", "recurring", {
    kind: "escape",
    target: 4,
    ember: true,
  });
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  run.scene.introPending = true;
  const html = renderToStaticMarkup(
    <EncounterIntro run={run} combat={run.scene} enter={() => {}} />,
  );
  expect(html).toContain("Prepare for battle");
  expect(html).toContain("encounter-illustration");
  expect(html).not.toContain("End turn");
  expect(html).not.toContain("data-card");
  expect(html).not.toContain("Who carries the Ember");
  run.scene.energy = 0;
  run.scene.hand = [];
  run.scene.ember = { window: "closed", bearer: "Mara", used: false };
  expect(shouldAutoEndTurn(run)).toBe(false);
  delete run.scene.introPending;
  expect(shouldAutoEndTurn(run)).toBe(true);
});

test("pending battle introduction survives save parsing without rerolling the encounter", () => {
  const before = newRun("saved-intro");
  before.route = generateRoute(before);
  const result = resolve(before, { type: "travel", node: "0-0-1" });
  expect(result.error).toBeNull();
  const run = result.run;
  if (run.scene.kind !== "combat") throw new Error("Expected initial battle");
  run.scene.introPending = true;
  expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
  run.scene.turn = 2;
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
  delete run.scene.introPending;
  expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
});

test("noncombat illustrations expose real choices without an extra continue gate", () => {
  const run = newRun("stop-art");
  run.scene = { kind: "camp", used: false };
  let html = renderToStaticMarkup(<StopScene run={run} dispatch={() => {}} inspect={() => {}} />);
  expect(html).toContain("/assets/encounters/forest/camp.webp");
  expect(html).toContain("Rest by the fire");
  expect(html).not.toContain("Prepare for battle");
  run.scene = { kind: "event", event: 4, resolved: null };
  html = renderToStaticMarkup(<StopScene run={run} dispatch={() => {}} inspect={() => {}} />);
  expect(html).toContain("/assets/encounters/events/crossing.webp");
  expect(html).toContain("Follow her path");
  expect(html).toContain("Repair the ropeway");
  run.scene = { kind: "reward", cards: [], relic: null, gold: 20, boss: false };
  expect(encounterArt(run)).toBeNull();
});
