import { expect, test } from "bun:test";
import { FADING_STRIKE, cardDef } from "../src/game/content";
import {
  makeCard,
  makeEnemy,
  newRun,
  resolve,
  rewardPool,
  startCombat,
} from "../src/game/engine";
import {
  evaluateRewards,
  simulateJourney,
} from "../src/game/laboratory-journey";
import { parseSave } from "../src/game/storage";

function setup(dread: number, eryn = false, upgraded = false) {
  const run = newRun(
    "concealment-test",
    "recurring",
    {
      kind: "escape",
      target: 4,
      ember: true,
      blockConversion: true,
      concealment: true,
    },
    "hushed-coal",
  );
  const card = makeCard(run, FADING_STRIKE.id);
  card.upgraded = upgraded;
  run.deck.push(card);
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Missing combat");
  const c = run.scene;
  c.hand = [card];
  c.draw = [makeCard(run, "strike"), makeCard(run, "guard")];
  c.dread = dread;
  c.energy = 2;
  c.ember = { bearer: eryn ? "Eryn" : "Mara", window: "closed", used: false };
  const enemy = makeEnemy(run, "wolf");
  enemy.hp = enemy.maxHp = 50;
  c.enemies = [enemy];
  return { run, card, enemy };
}

test.each([
  [5, false, false, 3, 40, 1],
  [6, false, false, 4, 46, 1],
  [7, true, false, 3, 40, 2],
  [8, true, false, 4, 46, 1],
  [5, false, true, 3, 37, 1],
  [0, true, false, 0, 40, 1],
] as const)(
  "Fading strike orders recovery before precision: %s/%s/%s",
  (dread, eryn, upgraded, after, hp, energy) => {
    const { run, card, enemy } = setup(dread, eryn, upgraded);
    const result = resolve(run, {
      type: "play",
      uid: card.uid,
      target: enemy.uid,
    });
    expect(result.error).toBeNull();
    if (result.run.scene.kind !== "combat") throw new Error("Missing combat");
    expect(result.run.scene.dread).toBe(after);
    expect(result.run.scene.enemies[0]?.hp).toBe(hp);
    expect(result.run.scene.energy).toBe(energy);
    expect(result.run.scene.relicTurn?.coalUsed).toBe(energy === 2);
    expect(result.run.scene.discard).toContainEqual(card);
  },
);

test("Work and invalid targeting do not lower Dread; Eryn and Coal cannot retrigger", () => {
  const { run, card, enemy } = setup(7, true);
  expect(
    resolve(run, { type: "play", uid: card.uid, target: null }).error,
  ).not.toBeNull();
  if (run.scene.kind !== "combat") throw new Error("Missing combat");
  run.scene.objective = { kind: "escape", target: 4, progress: 0, worked: 0 };
  const work = resolve(run, { type: "work", uid: card.uid }).run;
  if (work.scene.kind !== "combat") throw new Error("Missing combat");
  expect(work.scene.dread).toBe(7);
  expect(work.scene.energy).toBe(1);
  expect(work.scene.objective?.progress).toBe(1);
  expect(work.scene.ember?.used).toBe(false);
  expect(work.scene.relicTurn?.coalUsed).toBe(false);
  expect(work.stats.cards).toBe(0);
  const first = resolve(run, {
    type: "play",
    uid: card.uid,
    target: enemy.uid,
  }).run;
  if (first.scene.kind !== "combat") throw new Error("Missing combat");
  const second = makeCard(first, FADING_STRIKE.id);
  first.scene.hand.push(second);
  first.scene.dread = 7;
  const next = resolve(first, {
    type: "play",
    uid: second.uid,
    target: enemy.uid,
  }).run;
  if (next.scene.kind !== "combat") throw new Error("Missing combat");
  expect(next.scene.dread).toBe(5);
  expect(next.scene.energy).toBe(1);
  expect(next.scene.enemies[0]?.hp).toBe(36);
  expect(cardDef(second.def).tags).toBeUndefined();
});

test("new pool is opt-in and save round trips preserve its cards", () => {
  const run = newRun("concealment-save", "recurring", {
    kind: "escape",
    target: 4,
    blockConversion: true,
    concealment: true,
  });
  run.deck.push(makeCard(run, FADING_STRIKE.id));
  const old = structuredClone(run);
  if (!old.prototype) throw new Error("Missing prototype");
  delete old.prototype.concealment;
  expect(rewardPool(old)).toHaveLength(31);
  expect(rewardPool(run)).toHaveLength(32);
  expect(rewardPool(run).filter((c) => c.id !== FADING_STRIKE.id)).toEqual(
    rewardPool(old),
  );
  expect(new Set(rewardPool(run).map((c) => c.id)).size).toBe(32);
  expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
});

test("exploratory acquisition is reproducible and replays through legal engine actions", () => {
  const prototype = {
    kind: "escape",
    target: 4,
    ember: true,
    blockConversion: true,
    concealment: true,
  } as const;
  const simulate = () =>
    simulateJourney(
      "exploratory-acquisition",
      "search",
      96,
      "exploratory",
      "recurring",
      prototype,
      "hushed-coal",
    );
  const result = simulate();
  expect(simulate()).toEqual(result);
  expect(result.outcome).not.toBe("timeout");
  let run = newRun(result.seed, "recurring", prototype, "hushed-coal");
  let rewards = 0;
  for (const action of result.trace) {
    const next = resolve(run, action);
    expect(next.error).toBeNull();
    run = next.run;
    if (action.type === "reward") rewards++;
  }
  expect(rewards).toBeGreaterThan(2);
  expect(run.scene.kind).toBe("ending");
});

test("sampled rewards include skip and ignore hidden RNG and offer ordering", () => {
  const run = newRun("reward-evaluation");
  const before = structuredClone(run);
  const offers = ["fading-strike", "needle", "break-formation"];
  const scores = evaluateRewards(run, offers);
  const skip = scores[0];
  if (!skip) throw new Error("Missing skip trials");
  expect(scores.map((s) => s.card)).toEqual([null, ...offers]);
  expect(run).toEqual(before);
  run.rng = 19;
  run.seed = "different-hidden-state";
  const reversed = evaluateRewards(run, [...offers].reverse());
  for (const score of scores) {
    expect(reversed.find((s) => s.card === score.card)).toEqual(score);
    expect(score.trials).toHaveLength(4);
    expect(score.trials.every((t) => !t.timeout)).toBe(true);
    expect(score.utility).toBe(
      score.trials.reduce(
        (sum, t) => sum + (t.won ? 10000 : -10000) + 3 * t.hp - t.turns,
        0,
      ),
    );
    expect(score.trials.map((t) => t.formation)).toEqual(
      skip.trials.map((t) => t.formation),
    );
  }
  expect(() => simulateJourney("wrong-rules", "search", 96, "sampled")).toThrow(
    "requires recurring",
  );
});
