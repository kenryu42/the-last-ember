import { expect, test } from "bun:test";
import { generateRoute, newRun } from "../src/game/engine";
import type { RouteNode } from "../src/game/model";
import {
  createPlaytestRun,
  PLAYTEST_DECKS,
  PLAYTEST_ENCOUNTERS,
} from "../src/game/playtest-fixtures";
import { parseSave } from "../src/game/storage";

test("each road trades one future option; every full path visits camp and boss", () => {
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
      for (let row = 0; row < 4; row++) {
        const lanes = route.filter((n) => n.row === row);
        expect(lanes.map((n) => n.links)).toEqual([
          [`${act}-${row + 1}-0`, `${act}-${row + 1}-1`],
          [`${act}-${row + 1}-0`, `${act}-${row + 1}-2`],
          [`${act}-${row + 1}-1`, `${act}-${row + 1}-2`],
        ]);
        for (const a of lanes)
          for (const b of lanes) {
            if (a === b) continue;
            expect(a.links.some((id) => !b.links.includes(id))).toBe(true);
          }
        expect(new Set(lanes.flatMap((n) => n.links)).size).toBe(3);
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
      for (const node of route.filter((n) => n.row === 4))
        expect(node.links).toEqual([`${act}-5-1`]);
      for (const start of route.filter((n) => n.row === 0)) visit(start, []);
      expect(paths).toHaveLength(48);
    }
  }
});

test("route contents and RNG, and all 18 benchmark starts, retain their pre-topology fingerprints", () => {
  // Captured on the transferred baseline before changing links. Only links are omitted.
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
        nodes: route.map(({ links, ...node }) => node),
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
          route: run.route.map(({ links, ...node }) => node),
        });
      }
  expect(
    new Bun.CryptoHasher("sha256").update(JSON.stringify(starts)).digest("hex"),
  ).toBe("22f009a371c97336863975846eb19f7271874560320268f3b95f98560ccee619");
});

test("only current roads load; obsolete three-exit roads are rejected", () => {
  const run = newRun("lantern");
  expect(parseSave(JSON.stringify(run))).toEqual({ kind: "valid", run });
  const node = run.route.find((node) => node.row === 0 && node.lane === 1);
  if (!node) throw new Error("Missing road");
  node.links = ["0-1-0", "0-1-1", "0-1-2"];
  expect(parseSave(JSON.stringify(run)).kind).toBe("error");
});
