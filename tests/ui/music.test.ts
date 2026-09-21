import { describe, expect, test } from "bun:test";
import { newRun } from "../../src/game/engine/run";
import { startCombat } from "../../src/game/engine/combat/setup";
import type { Combat, Run } from "../../src/game/model";
import { composeBar, deriveSoundscape, REGION_SCORES } from "../../src/ui/audio/music";

function combat(run: Run): Combat {
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  return run.scene;
}

describe("soundscape selection", () => {
  test("maps acts to their musical regions", () => {
    const run = newRun("audio-regions");
    expect(deriveSoundscape(run, false).region).toBe("forest");
    run.act = 1;
    expect(deriveSoundscape(run, false).region).toBe("ruins");
    run.act = 2;
    expect(deriveSoundscape(run, false).region).toBe("mountain");
  });

  test("selects camp, combat, boss, and stable Dread tiers", () => {
    const run = newRun("audio-scenes");
    run.scene = { kind: "camp", used: false };
    expect(deriveSoundscape(run, false).mode).toBe("camp");
    startCombat(run, "battle");
    combat(run).dread = 5;
    const tense = deriveSoundscape(run, false);
    expect(tense.mode).toBe("combat");
    expect(tense.dread).toBe(1);
    combat(run).dread = 7;
    expect(deriveSoundscape(run, false).key).toBe(tense.key);
    combat(run).type = "boss";
    combat(run).dread = 8;
    expect(deriveSoundscape(run, false)).toMatchObject({
      mode: "boss",
      dread: 2,
    });
  });
});

describe("deterministic composition", () => {
  test("each region owns a distinct instrumental identity", () => {
    expect(REGION_SCORES.forest.some((note) => note.instrument === "pluck")).toBe(true);
    expect(REGION_SCORES.ruins.some((note) => note.instrument === "bell")).toBe(true);
    expect(REGION_SCORES.mountain.some((note) => note.instrument === "wind")).toBe(true);
  });

  test("combat adds percussion, camp removes it, and Dread adds tension", () => {
    const base = { region: "mountain", dread: 0, key: "test" } as const;
    const camp = composeBar({ ...base, mode: "camp" });
    const combat = composeBar({ ...base, mode: "combat" });
    const dread = composeBar({ ...base, mode: "combat", dread: 2 });
    expect(camp.some((note) => note.instrument === "drum")).toBe(false);
    expect(combat.filter((note) => note.instrument === "drum").length).toBeGreaterThan(0);
    expect(dread.length).toBeGreaterThan(combat.length);
    expect(composeBar({ ...base, mode: "combat" })).toEqual(combat);
  });

  test("varies four measures deterministically and then repeats", () => {
    const soundscape = {
      region: "forest",
      mode: "explore",
      dread: 0,
      key: "forest:explore:0",
    } as const;
    const measures = [0, 1, 2, 3].map((measure) => composeBar(soundscape, measure));
    expect(new Set(measures.map((notes) => JSON.stringify(notes))).size).toBe(4);
    const measureTwo = composeBar(soundscape, 2);
    expect(composeBar(soundscape, 4)).toEqual(composeBar(soundscape, 0));
    expect(composeBar(soundscape, 2)).toEqual(measureTwo);
    expect(measures.every((notes) => notes.some((note) => note.instrument === "bass"))).toBe(true);
  });

  test("derives title and distinct ending moods while keeping scene keys stable", () => {
    const run = newRun("audio-moods");
    expect(deriveSoundscape(run, true).mode).toBe("title");
    run.scene = { kind: "ending", won: true };
    const victory = deriveSoundscape(run, false);
    run.scene = { kind: "ending", won: false };
    const defeat = deriveSoundscape(run, false);
    expect(victory.mode).toBe("ending");
    expect(defeat.mode).toBe("ending");
    expect(victory.ending).toBe("victory");
    expect(defeat.ending).toBe("defeat");
    expect(composeBar(victory)).not.toEqual(composeBar(defeat));
    expect(victory.key).not.toBe(defeat.key);
  });
});
