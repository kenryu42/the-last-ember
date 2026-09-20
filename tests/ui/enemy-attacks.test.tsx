import { expect, test } from "bun:test";
import { ENEMIES } from "../../src/game/content/enemies";
import { makeEnemy } from "../../src/game/engine/combat/enemy";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { startCombat } from "../../src/game/engine/combat/setup";
import { frameAttack } from "../../src/ui/combat/attack-kind";

test("each enemy's real attack frame selects its Pixi effect, including lethal hits", () => {
  for (const def of ENEMIES) {
    const run = newRun(`attack-${def.id}`);
    startCombat(run, "battle");
    if (run.scene.kind !== "combat") throw new Error("Expected combat");
    const enemy = makeEnemy(run, def.id);
    enemy.step = def.pattern.findIndex((intent) => intent.kind === "attack");
    // The actor is identified by UID, not position or name in the feedback text.
    const decoy = makeEnemy(run, "wolf");
    decoy.hp = 0;
    run.scene.enemies = [decoy, enemy];
    run.scene.block = 0;
    run.hp = 1;
    const result = resolve(run, { type: "end" });
    const frame = result.frames.find((frame) => frame.cue === "enemy");
    if (!frame) throw new Error(`Missing attack for ${def.id}`);
    frame.text = "Localized combat feedback";
    expect(frameAttack(frame)).toBe(def.id);
    expect(result.run.hp).toBe(0);
  }
});

test("non-attack frames do not select a Pixi attack", () => {
  const run = newRun("no-attack");
  expect(frameAttack({ run, cue: "draw", target: null, text: "" })).toBeNull();
  expect(frameAttack({ run, cue: "enemy", target: 999, text: "" })).toBeNull();
  expect(frameAttack(null)).toBeNull();
});
test.each(["blade", "arrow", "spell"] as const)(
  "%s cards select their own effect",
  (cue) => {
    expect(
      frameAttack({ run: newRun("card-attack"), cue, target: 1, text: "" }),
    ).toBe(cue);
  },
);
