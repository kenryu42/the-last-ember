import { expect, test } from "bun:test";
import { cardDef } from "../../src/game/content/cards";
import { intention, thresholdStrength } from "../../src/game/selectors/intentions";
import { makeCard } from "../../src/game/engine/rewards";
import { makeEnemy } from "../../src/game/engine/combat/enemy";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { startCombat } from "../../src/game/engine/combat/setup";
import type { Action, Combat, Run } from "../../src/game/model";
import {
  beginRecord,
  DecisionClock,
  exportFight,
  exportFightCsv,
  projectPhase,
  recordAction,
  summarize,
} from "../../src/lab/recording";
import { thresholdState } from "../../src/game/selectors/dread";
import { createPlaytestRun } from "../../src/lab/fixtures/combat";

function combat(run: Run): Combat {
  if (run.scene.kind !== "combat") throw Error("Expected combat");
  return run.scene;
}
function setup(reaction: Combat["reaction"] = "fury") {
  const run = newRun("rules-diagnostic");
  startCombat(run, "battle");
  const c = combat(run);
  c.enemies = [makeEnemy(run, "wolf")];
  c.reaction = reaction;
  return run;
}
const config = {
  rules: "candidate",
  deckId: "quiet",
  encounterId: "fury",
  seed: "test",
  player: 'a,"b',
  variant: "base",
} as const;

test("default adventure and explicit control combat resolve identically", () => {
  for (const reaction of ["fury", "reinforce", "ward"] as const) {
    const run = setup(reaction);
    combat(run).dread = 8;
    const adventure = resolve(run, { type: "end" });
    expect(resolve(run, { type: "end" }, "control")).toEqual(adventure);
    const c = combat(adventure.run);
    c.dread = 0;
    expect(resolve(adventure.run, { type: "end" }, "control")).toEqual(
      resolve(adventure.run, { type: "end" }),
    );
    expect(c.enemies[0]?.strength).toBe(reaction === "fury" ? 5 : reaction === "ward" ? 4 : 3);
  }
});

test("candidate exact boundaries, both unlocks and independent suppression with Quiet bell", () => {
  for (const shift of [0, 1])
    for (const dread of [3 + shift, 4 + shift, 7 + shift, 8 + shift]) {
      const run = setup();
      if (shift) run.relics = ["charm"];
      combat(run).dread = dread;
      const next = resolve(run, { type: "end" }, "candidate").run;
      const c = combat(next);
      expect(c.fired).toEqual(
        dread < 4 + shift ? [] : dread < 8 + shift ? [4 + shift] : [4 + shift, 8 + shift],
      );
      expect(c.enemies[0]?.strength).toBe(0);
      expect(next.hp).toBe(dread < 4 + shift ? 63 : dread < 8 + shift ? 61 : 58);
      c.dread = 3 + shift;
      expect(thresholdStrength(next, c)).toBe(0);
      c.dread = 4 + shift;
      expect(thresholdStrength(next, c)).toBe(dread >= 4 + shift ? 2 : 0);
      c.dread = 8 + shift;
      expect(thresholdStrength(next, c)).toBe(dread >= 8 + shift ? 5 : dread >= 4 + shift ? 2 : 0);
    }
});

test("candidate summons and ward happen once, are not undone, and summons wait", () => {
  for (const reaction of ["reinforce", "ward"] as const) {
    const run = setup(reaction);
    combat(run).dread = 8;
    const first = resolve(run, { type: "end" }, "candidate").run;
    const c = combat(first);
    expect(first.hp).toBe(reaction === "ward" ? 59 : 60);
    expect(c.enemies.length).toBe(reaction === "ward" ? 1 : 2);
    if (reaction === "ward") expect(c.enemies[0]?.block).toBe(10);
    else expect(c.enemies[1]?.step).toBe(0);
    c.dread = 0;
    expect(thresholdStrength(first, c)).toBe(0);
    expect(c.enemies[0]?.block).toBe(reaction === "ward" ? 10 : 0);
    c.dread = 7;
    expect(thresholdStrength(first, c)).toBe(0);
    c.dread = 8;
    expect(thresholdStrength(first, c)).toBe(reaction === "ward" ? 4 : 3);
    const second = resolve(first, { type: "end" }, "candidate").run;
    expect(second.stats.thresholds).toBe(2);
    expect(combat(second).enemies.length).toBe(c.enemies.length);
  }
});

test("Howl reactivates unlocked strength for later enemies but cannot unlock mid-phase", () => {
  for (const unlocked of [false, true]) {
    const run = setup();
    const c = combat(run);
    c.enemies = [makeEnemy(run, "stag"), makeEnemy(run, "wolf")];
    c.dread = 3;
    c.fired = unlocked ? [4] : [];
    const frozen = structuredClone(run);
    const preview = projectPhase(run, "candidate");
    expect(run).toEqual(frozen);
    expect(preview).toEqual(resolve(run, { type: "end" }, "candidate"));
    expect(preview.run.hp).toBe(unlocked ? 61 : 63);
    expect(combat(preview.run).dread).toBe(5);
    expect(combat(preview.run).fired).toEqual(unlocked ? [4] : []);
    expect(preview.frames[0]?.text).toContain("+2 Dread");
    expect(preview.frames[1]?.text).toContain(unlocked ? "9 health lost" : "7 health lost");
  }
});

test("Weak floors after candidate strength, half-health boss and Hollow Dread modifiers", () => {
  const run = setup("ward");
  const c = combat(run);
  const boss = makeEnemy(run, "hollow");
  boss.hp = boss.maxHp / 2;
  boss.weak = 1;
  boss.step = 1;
  c.dread = 8;
  c.fired = [4, 8];
  expect(intention(boss, c, thresholdStrength(run, c)).amount).toBe(24); // floor((21+3+4+4)*.75)
  expect(intention({ ...boss, hp: boss.maxHp / 2 + 1 }, c, thresholdStrength(run, c)).amount).toBe(
    21,
  );
  c.dread = 7;
  expect(intention(boss, c, thresholdStrength(run, c)).amount).toBe(21);
  c.dread = 5;
  expect(intention(boss, c, thresholdStrength(run, c)).amount).toBe(18);
});

test("suppressed damage metric holds boss state and Dread fixed and counts actual pre-block Weak delta", () => {
  const run = setup();
  const c = combat(run);
  c.dread = 3;
  c.fired = [4, 8];
  c.block = 100;
  const enemy = c.enemies[0];
  if (!enemy) throw Error();
  enemy.weak = 1;
  const result = resolve(run, { type: "end" }, "candidate");
  expect(result.accounting.suppressedAttackDamage).toBe(4); // floor(12*.75) - floor(7*.75)
  expect(result.run.hp).toBe(70); // not health saved
});

test("boss drain healing changes the next half-health condition, not the attack already resolved", () => {
  const run = setup("ward"),
    c = combat(run);
  const boss = makeEnemy(run, "hollow");
  boss.hp = 80;
  boss.step = 2;
  boss.weak = 1;
  c.enemies = [boss];
  c.fired = [4, 8];
  c.dread = 8;
  const next = resolve(run, { type: "end" }, "candidate").run;
  expect(next.hp).toBe(51); // floor((15+3+4+4)*.75) = 19
  expect(combat(next).enemies[0]?.hp).toBe(99);
  expect(projectPhase(next, "candidate").run.hp).toBe(17); // 26+4+4, no half-health +3 or expired Weak
});

test("lethal first enemy stops later Howl and suppression accounting", () => {
  const run = setup(),
    c = combat(run);
  run.hp = 1;
  c.dread = 3;
  c.fired = [4];
  c.enemies.push(makeEnemy(run, "stag"), makeEnemy(run, "wolf"));
  const result = resolve(run, { type: "end" }, "candidate");
  expect(result.run.scene).toEqual({ kind: "ending", won: false });
  expect(result.accounting.suppressedAttackDamage).toBe(2);
  expect(result.frames.filter((f) => f.cue === "enemy").length).toBe(1);
  expect(result.frames.some((f) => f.text.includes("+2 Dread"))).toBe(false);
});

test("candidate preserves Vulnerable floor before block, Dread clamp and rejects progression", () => {
  const run = setup(),
    c = combat(run);
  const enemy = c.enemies[0];
  if (!enemy) throw Error();
  enemy.vulnerable = 1;
  enemy.block = 2;
  c.dread = 9;
  c.hand = [makeCard(run, "cinder")];
  const card = c.hand[0];
  if (!card) throw Error();
  const next = resolve(run, { type: "play", uid: card.uid, target: enemy.uid }, "candidate").run;
  expect(combat(next).dread).toBe(10);
  expect(combat(next).enemies[0]?.hp).toBe(8); // 24 - (floor(12*1.5)-2)
  expect(resolve(run, { type: "reward", card: null }, "candidate").error).toBe(
    "Benchmark mode only permits combat actions.",
  );
  combat(next).hand = [makeCard(next, "silence")];
  combat(next).dread = 1;
  const silence = combat(next).hand[0];
  if (!silence) throw Error();
  expect(
    combat(resolve(next, { type: "play", uid: silence.uid, target: null }, "candidate").run).dread,
  ).toBe(0);
});

test("final kill wins immediately without pending threshold, keeps winning turn accounting", () => {
  const run = setup();
  const c = combat(run);
  c.dread = 8;
  c.turn = 3;
  run.stats.turns = 2;
  c.hand = [makeCard(run, "strike")];
  const enemy = c.enemies[0],
    card = c.hand[0];
  if (!enemy || !card) throw Error();
  enemy.hp = 1;
  const action: Action = { type: "play", uid: card.uid, target: enemy.uid };
  const result = resolve(run, action, "candidate");
  expect(result.run.scene).toEqual({ kind: "ending", won: true });
  expect(result.run.stats.thresholds).toBe(0);
  expect(result.run.stats.turns).toBe(2);
  expect(result.run.gold).toBe(run.gold);
  const record = recordAction(beginRecord(config, run), run, action, result, 120, 600);
  expect(record.result).toEqual({
    outcome: "win",
    finalHealth: 70,
    playerTurns: 3,
    durationMs: 600,
  });
  expect(record.actions[0]?.unusedEnergy).toBeNull();
  expect(summarize(record)).toMatchObject({
    played: 1,
    largestTurnCards: 1,
    largestTurnDamage: 1,
    killedBeforeFirstAction: 1,
    dreadEnd: 8,
  });
  expect(JSON.parse(exportFight(record, { surprise: "none" })).questionnaire).toEqual({
    surprise: "none",
  });
  expect(exportFightCsv(record)).toContain('"a,""b"');
  expect(exportFightCsv({ ...record, config: { ...record.config, player: "=1+1" } })).toContain(
    '"\'=1+1"',
  );
});

test("draw counts obey cap, exclude retain, and distinguish losing end from next turn", () => {
  const run = setup();
  const c = combat(run);
  c.hand = Array.from({ length: 8 }, () => makeCard(run, "oath"));
  c.draw = Array.from({ length: 10 }, () => makeCard(run, "strike"));
  const result = resolve(run, { type: "end" }, "candidate");
  expect(result.accounting.drawn).toBe(2);
  expect(combat(result.run).hand.length).toBe(10);
  const record = recordAction(beginRecord(config, run), run, { type: "end" }, result, 100, 200);
  expect(record.actions[0]?.retained.length).toBe(8);
  expect(record.actions[0]?.unplayed.length).toBe(8);
  expect(record.actions[0]?.unusedEnergy).toBe(3);
  run.hp = 1;
  const loss = resolve(run, { type: "end" }, "candidate");
  expect(loss.accounting.drawn).toBe(0);
  expect(
    recordAction(beginRecord(config, run), run, { type: "end" }, loss, 100, 200).result
      ?.playerTurns,
  ).toBe(1);
});

test("telemetry records unlock, suppression and Howl reactivation in order", () => {
  const run = setup();
  combat(run).dread = 4;
  const unlock = resolve(run, { type: "end" }, "candidate");
  let record = recordAction(beginRecord(config, run), run, { type: "end" }, unlock, 1, 1);
  expect(record.actions[0]?.thresholdEvents).toEqual([{ at: 4, event: "unlock", dread: 4 }]);
  const next = unlock.run;
  const c = combat(next);
  c.hand = [makeCard(next, "unseen")];
  const card = c.hand[0];
  if (!card) throw Error();
  const action: Action = { type: "play", uid: card.uid, target: null };
  const lower = resolve(next, action, "candidate");
  record = recordAction(record, next, action, lower, 1, 2);
  expect(record.actions[1]?.thresholdEvents).toEqual([{ at: 4, event: "suppressed", dread: 2 }]);
  const low = lower.run;
  combat(low).enemies = [makeEnemy(low, "stag"), makeEnemy(low, "wolf")];
  const howl = resolve(low, { type: "end" }, "candidate");
  record = recordAction(record, low, { type: "end" }, howl, 1, 3);
  expect(record.actions[2]?.thresholdEvents).toEqual([{ at: 4, event: "reactivate", dread: 4 }]);
  expect(thresholdState(low, combat(low), "candidate")[0]?.state).toBe("suppressed");
});

test("clock excludes hidden, paused and resolution intervals and drains once per accepted action", () => {
  const clock = new DecisionClock();
  clock.set(true, 0);
  clock.set(false, 100);
  clock.set(true, 1000);
  expect(clock.take(1050)).toBe(150);
  clock.set(true, 2000);
  clock.set(false, 2010);
  clock.set(true, 3000);
  expect(clock.take(3020)).toBe(30);
  expect(clock.take(3030)).toBe(0);
});

test("diagnostic ablations replace slots before shuffle without changing IDs or RNG", () => {
  for (const deckId of ["exposed", "defense"] as const) {
    const base = createPlaytestRun({
      deckId,
      encounterId: "ward",
      seed: "ember-v02-a",
    });
    const variant = createPlaytestRun({
      deckId,
      encounterId: "ward",
      seed: "ember-v02-a",
      variant: "ablation",
    });
    expect(variant.rng).toBe(base.rng);
    expect(combat(variant).hand.map((c) => c.uid)).toEqual(combat(base).hand.map((c) => c.uid));
    expect(variant.deck.filter((c) => c.def === "strike").length).toBe(2);
    expect(variant.deck.filter((c) => c.def === "bash").length).toBe(deckId === "defense" ? 2 : 0);
    const replaced = base.deck
      .filter((card, i) => card.def !== variant.deck[i]?.def)
      .map((card) => card.def);
    expect(replaced).toEqual(deckId === "defense" ? ["shield", "shield"] : ["spark", "sacrifice"]);
  }
});

test("small deterministic automated smoke completes six unmodified benchmark fights", () => {
  for (const rules of ["control", "candidate"] as const)
    for (const deckId of ["quiet", "exposed", "defense"] as const) {
      let run = createPlaytestRun({
        seed: "smoke-1",
        deckId,
        encounterId: "fury",
      });
      let record = beginRecord({ ...config, rules, deckId }, run);
      for (let i = 0; i < 200 && run.scene.kind === "combat"; i++) {
        const c = run.scene;
        const card = c.hand.find((card) => cardDef(card.def).cost <= c.energy);
        const action: Action = card
          ? {
              type: "play",
              uid: card.uid,
              target: c.enemies.find((e) => e.hp > 0)?.uid ?? null,
            }
          : { type: "end" };
        const result = resolve(run, action, rules);
        expect(result.error).toBeNull();
        record = recordAction(record, run, action, result, 0, i);
        run = result.run;
      }
      expect(record.result).not.toBeNull();
      expect(run.scene.kind).toBe("ending");
    }
});
