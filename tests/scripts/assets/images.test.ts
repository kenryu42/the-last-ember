import { expect, test } from "bun:test";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { images } from "../../../scripts/assets/images";

function fixture(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "ember-images-"));
  try {
    mkdirSync(join(root, "artwork/source"), { recursive: true });
    mkdirSync(join(root, "public/assets"), { recursive: true });
    writeFileSync(join(root, "artwork/exceptions.json"), "{}");
    writeFileSync(join(root, "artwork/exports.json"), "{}");
    copyFileSync(
      join(import.meta.dir, "fixtures/painting.png"),
      join(root, "artwork/source/painting.png"),
    );
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("exports real artwork, keeps sources intact and skips unchanged exports", () =>
  fixture((root) => {
    const source = join(root, "artwork/source/painting.png");
    const original = readFileSync(source);
    expect(() => images(root, "check")).toThrow("painting.png");
    expect(images(root, "optimize").exported).toBe(1);
    const output = join(root, "public/assets/painting.webp");
    expect(readFileSync(output).toString("ascii", 8, 12)).toBe("WEBP");
    const decoded = join(root, "decoded.pam");
    const decoder = spawnSync("dwebp", [output, "-pam", "-o", decoded], { encoding: "utf8" });
    expect(decoder.status).toBe(0);
    expect(readFileSync(decoded).subarray(0, 100).toString()).toContain("WIDTH 16\nHEIGHT 12");
    expect(readFileSync(source)).toEqual(original);
    const modified = statSync(output).mtimeMs;
    expect(images(root, "optimize").exported).toBe(0);
    expect(statSync(output).mtimeMs).toBe(modified);
    expect(images(root, "check").count).toBe(1);
    rmSync(output);
    expect(() => images(root, "check")).toThrow("Missing export");
    expect(images(root, "optimize").exported).toBe(1);
  }));

test("detects changed sources and regenerates them", () =>
  fixture((root) => {
    images(root, "optimize");
    const source = join(root, "artwork/source/painting.png");
    const output = join(root, "public/assets/painting.webp");
    const before = readFileSync(output);
    copyFileSync(join(import.meta.dir, "fixtures/changed.png"), source);
    expect(() => images(root, "check")).toThrow("Stale export");
    expect(images(root, "optimize").exported).toBe(1);
    expect(readFileSync(output)).not.toEqual(before);
    expect(images(root, "check").count).toBe(1);
  }));

test("rejects unmanaged images anywhere in public and does not overwrite them", () =>
  fixture((root) => {
    const output = join(root, "public/stray.PNG");
    writeFileSync(output, "unmanaged");
    expect(() => images(root, "optimize")).toThrow("Unmanaged image");
    expect(readFileSync(output, "utf8")).toBe("unmanaged");
  }));

test("catches direct export edits and missing sources", () =>
  fixture((root) => {
    images(root, "optimize");
    writeFileSync(join(root, "public/assets/painting.webp"), "edited");
    expect(() => images(root, "check")).toThrow("Modified export");
    expect(() => images(root, "optimize")).toThrow("Modified export");
    rmSync(join(root, "artwork/source/painting.png"));
    expect(() => images(root, "check")).toThrow("Missing source");
  }));

test("rejects colliding output names before writing anything", () =>
  fixture((root) => {
    copyFileSync(
      join(root, "artwork/source/painting.png"),
      join(root, "artwork/source/painting.jpg"),
    );
    expect(() => images(root, "optimize")).toThrow("collision");
    expect(existsSync(join(root, "public/assets/painting.webp"))).toBe(false);
  }));

test("allows explicit exceptions but requires a reason", () =>
  fixture((root) => {
    writeFileSync(join(root, "public/icon.svg"), "<svg/>");
    writeFileSync(
      join(root, "artwork/exceptions.json"),
      JSON.stringify({ "icon.svg": "Vector icon" }),
    );
    expect(images(root, "optimize").exported).toBe(1);
    writeFileSync(join(root, "artwork/exceptions.json"), JSON.stringify({ "icon.svg": "" }));
    expect(() => images(root, "check")).toThrow();
  }));

test("encoder errors preserve the previous export and registry", () =>
  fixture((root) => {
    images(root, "optimize");
    const output = join(root, "public/assets/painting.webp");
    const original = readFileSync(output);
    const registry = readFileSync(join(root, "artwork/exports.json"));
    writeFileSync(join(root, "artwork/source/painting.png"), "invalid image");
    expect(() => images(root, "optimize")).toThrow("cwebp");
    expect(readFileSync(output)).toEqual(original);
    expect(readFileSync(join(root, "artwork/exports.json"))).toEqual(registry);
  }));
