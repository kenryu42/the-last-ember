import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkBoundaries } from "../../scripts/check-boundaries";

function check(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "ember-boundaries-"));
  try {
    for (const [path, content] of Object.entries(files)) {
      const file = join(root, "src", path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    return checkBoundaries(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("rejects cross-layer dependencies, including dynamic and type-only imports", () => {
  expect(
    check({
      "game/rule.ts": 'export const rule = () => import("../lab/policy");',
      "lab/policy.ts":
        'import type { Settings } from "../platform/browser/settings"; export type Config = Settings;',
      "ui/board.ts": 'export { observe } from "../lab/observation";',
      "platform/browser/settings.ts": 'export { App } from "../../app/App";',
    }),
  ).toHaveLength(4);
});

test("rejects ambient browser APIs but accepts game text mentioning them", () => {
  expect(
    check({
      "game/save.ts": 'export const save = () => localStorage.getItem("save");',
    }),
  ).toHaveLength(1);
  expect(
    check({
      "game/text.ts": 'export const text = "Keep this document in your inventory";',
    }),
  ).toEqual([]);
});

test("allows the engine's bearer window field", () => {
  expect(
    check({
      "game/bearer.ts":
        'export const ember = { window: "choose" }; export const choosing = ember.window === "choose";',
    }),
  ).toEqual([]);
});

test("checks inline type imports even when erased from JavaScript", () => {
  expect(
    check({
      "game/config.ts":
        'import { type Settings } from "../platform/browser/settings"; export type Config = Settings;',
    }),
  ).toHaveLength(1);
});

test("accepts shared engine selectors and development-only laboratory consumers", () => {
  expect(
    check({
      "game/selectors/dread.ts": "export const dread = 4;",
      "ui/combat/board.ts": 'export { dread } from "../../game/selectors/dread";',
      "ui/devtools/playtest.ts": 'export { observe } from "../../lab/observation";',
      "lab/observation.ts": 'export { dread as observe } from "../game/selectors/dread";',
    }),
  ).toEqual([]);
});
