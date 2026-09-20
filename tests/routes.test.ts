import { expect, test } from "bun:test";
import { generateRoute, newRun, reachable, resolve } from "../src/game/engine";
import type { RouteNode } from "../src/game/model";
import {
  createPlaytestRun,
  PLAYTEST_DECKS,
  PLAYTEST_ENCOUNTERS,
} from "../src/game/playtest-fixtures";
import { parseSave } from "../src/game/storage";

test("every crossroads offers three paths; every full journey visits camp and guardian", () => {
  for (const seed of [
    "lantern",
    "briar",
    "warmth",
    "beacon",
    "home",
    "route-tradeoff",
  ]) {
    const run = newRun(seed);
    for (const act of [0, 1, 2]) {
      run.act = act;
      const route = generateRoute(run);
      run.route = route;
      for (let row = 0; row < 5; row++) {
        const lanes = route.filter((n) => n.row === row);
        for (const node of lanes) {
          expect(node.links).toEqual(
            [0, 1, 2].map((lane) => `${act}-${row + 1}-${lane}`),
          );
          run.row = row;
          run.location = node.id;
          expect(
            route.filter((next) => reachable(run, next)).map((next) => next.id),
          ).toEqual(node.links);
        }
      }
      const paths: RouteNode[][] = [];
      function visit(node: RouteNode, prefix: RouteNode[]) {
        const path = [...prefix, node];
        if (!node.links.length) {
          expect(node.kind).toBe("boss");
          expect(path).toHaveLength(6);
          expect(path.some((n) => n.kind === "camp")).toBe(true);
          paths.push(path);
        }
        for (const id of node.links) {
          const next = route.find((n) => n.id === id);
          if (!next) throw new Error(`Dead road ${id}`);
          expect(next.row).toBe(node.row + 1);
          visit(next, path);
        }
      }
      for (const start of route.filter((n) => n.row === 0)) visit(start, []);
      expect(paths).toHaveLength(729);
    }
  }
});

test("encounter contents and RNG remain unchanged by the crossroads presentation", () => {
  // Compare existing encounters, excluding the two additional guardian approaches and links.
  const fingerprints = [
    [
      "lantern",
      "9c3dfea4f09f779994c10299ac19ae8a6250bc7c4c69b10b4f0ac0df998a7d84",
    ],
    [
      "route-tradeoff",
      "7a67b4915c79afaa13cd6fb79e62b8e7ac4d6363540254c04102eb8c18c47133",
    ],
    [
      "ember-v02-a",
      "dd02252fe61baab16ff93aaa25f50f7802dd9295afcae61da3b49ee15fb0f9d2",
    ],
  ] as const;
  for (const [seed, expected] of fingerprints) {
    const run = newRun(seed);
    const states = [];
    for (const act of [0, 1, 2]) {
      run.act = act;
      const route = generateRoute(run);
      states.push({
        rng: run.rng,
        nodes: route
          .filter((node) => node.row !== 5 || node.lane === 1)
          .map(({ links, ...node }) => node),
      });
    }
    expect(
      new Bun.CryptoHasher("sha256")
        .update(JSON.stringify(states))
        .digest("hex"),
    ).toBe(expected);
  }
  const starts = [];
  for (const seed of ["ember-v02-a", "ember-v02-b"])
    for (const deck of PLAYTEST_DECKS)
      for (const encounter of PLAYTEST_ENCOUNTERS) {
        const run = createPlaytestRun({
          seed,
          deckId: deck.id,
          encounterId: encounter.id,
        });
        // Rule metadata is explicit now; compare gameplay state, not its encoding.
        const { dreadRules, actBearer, ...state } = run;
        starts.push({
          ...state,
          route: run.route
            .filter((node) => node.row !== 5 || node.lane === 1)
            .map(({ links, ...node }) => node),
        });
      }
  expect(
    new Bun.CryptoHasher("sha256").update(JSON.stringify(starts)).digest("hex"),
  ).toBe("22f009a371c97336863975846eb19f7271874560320268f3b95f98560ccee619");
});

test("current three-path roads round-trip and reject missing, duplicate or backward exits", () => {
  const run = newRun("lantern");
  expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
  const node = run.route.find((node) => node.row === 0 && node.lane === 1);
  if (!node) throw new Error("Missing road");
  for (const links of [
    ["0-1-0", "0-1-1"],
    ["0-1-0", "0-1-1", "0-1-1"],
    ["0-1-0", "0-1-1", "0-0-2"],
  ]) {
    node.links = links;
    expect(parseSave(JSON.stringify(run)).kind).toBe("error");
  }
});

test("each physical path commits its own encounter and cannot backtrack or skip ahead", () => {
  const run = newRun("crossroads-choices");
  run.row = 0;
  run.location = "0-0-1";
  run.visited = [run.location];
  const options = run.route.filter((node) => node.row === 1);
  expect(new Set(options.map((node) => node.kind)).size).toBe(3);
  for (const node of options) {
    const result = resolve(run, { type: "travel", node: node.id });
    expect(result.error).toBeNull();
    expect(result.run.location).toBe(node.id);
    expect(result.run.scene.kind).toBe(
      node.kind === "battle" || node.kind === "elite" || node.kind === "boss"
        ? "combat"
        : node.kind,
    );
    expect(parseSave(JSON.stringify(result.run)).kind).toBe("valid");
  }
  for (const node of ["0-0-0", "0-2-0", "missing"])
    expect(resolve(run, { type: "travel", node }).error).not.toBeNull();
});
