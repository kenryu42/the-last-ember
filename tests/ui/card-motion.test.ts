import { expect, test } from "bun:test";
import { draw, startCombat } from "../../src/game/engine/combat/setup";
import { makeCard } from "../../src/game/engine/rewards";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { discardedHand, drawSequence } from "../../src/ui/combat/card-motion";

function fixture() {
  const run = newRun("card-motion");
  run.deck = [
    "guard",
    "courage",
    "arrow",
    "flame",
    "strike",
    "home",
    "oath",
    "guard",
    "arrow",
    "strike",
    "guard",
    "arrow",
  ].map((id) => makeCard(run, id));
  startCombat(run, "battle");
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  const combat = run.scene;
  combat.hand = run.deck.slice(0, 3);
  combat.draw = run.deck.slice(3, 5);
  combat.discard = run.deck.slice(5);
  combat.exhaust = [];
  combat.block = 999;
  return { run, combat };
}

test("discard presentation keeps Retain cards and preserves discard order without mutation", () => {
  const { combat } = fixture();
  const original = structuredClone(combat);
  const next = discardedHand(combat);
  expect(next.hand.map((card) => card.def)).toEqual(["courage"]);
  expect(next.discard.map((card) => card.uid)).toEqual([
    ...original.discard.map((card) => card.uid),
    ...original.hand.filter((_, index) => index !== 1).map((card) => card.uid),
  ]);
  expect(next.energy).toBe(0);
  expect(next.draw).toEqual(original.draw);
  expect(combat).toEqual(original);
});

for (const map of [false, true]) {
  test(`end-turn deal follows resolved draws and reshuffles only at depletion, map=${map}`, () => {
    const { run, combat } = fixture();
    if (map) run.relics.push("map");
    const original = structuredClone(run);
    const result = resolve(run, { type: "end" });
    expect(result.error).toBeNull();
    let presented = discardedHand(combat);
    const moves: string[] = [];
    const deals: number[][] = [];
    for (const frame of result.frames) {
      if (frame.run.scene.kind !== "combat") continue;
      const sequence = drawSequence(presented, frame.run.scene);
      for (const step of sequence.steps) {
        moves.push(step.kind);
        if (step.kind === "draw")
          deals.push(step.cards.map((card) => card.uid));
        const zones = [
          ...step.combat.hand,
          ...step.combat.draw,
          ...step.combat.discard,
        ];
        expect(new Set(zones.map((card) => card.uid)).size).toBe(
          run.deck.length,
        );
        expect(zones).toHaveLength(run.deck.length);
      }
      const final = sequence.steps.at(-1)?.combat ?? sequence.initial;
      expect(final.hand).toEqual(frame.run.scene.hand);
      expect(final.draw).toEqual(frame.run.scene.draw);
      expect(final.discard).toEqual(frame.run.scene.discard);
      presented = frame.run.scene;
    }
    expect(moves).toEqual(["draw", "shuffle", "draw"]);
    expect(deals[0]).toEqual(
      original.scene.kind === "combat"
        ? [...original.scene.draw].reverse().map((card) => card.uid)
        : [],
    );
    expect(deals.map((cards) => cards.length)).toEqual([2, map ? 4 : 3]);
    expect(deals.flat()).toEqual(
      presented.hand.slice(1).map((card) => card.uid),
    );
    expect(presented.hand).toHaveLength(map ? 7 : 6);
    expect(run).toEqual(original);
  });
}

test("draw plan respects the hand cap and does not fabricate draws from empty piles", () => {
  const { run, combat } = fixture();
  combat.hand = run.deck.slice(0, 9);
  combat.draw = run.deck.slice(9);
  combat.discard = [];
  const before = structuredClone(combat);
  draw(run, combat, 5);
  const sequence = drawSequence(before, combat);
  expect(sequence.steps.map((step) => step.kind)).toEqual(["draw"]);
  expect(sequence.steps.at(-1)?.combat.hand).toHaveLength(10);
  expect(sequence.steps.at(-1)?.combat.draw).toHaveLength(2);
  const full = structuredClone(combat);
  draw(run, combat, 5);
  expect(drawSequence(full, combat).steps).toEqual([]);
  combat.hand = [];
  combat.draw = [];
  const empty = structuredClone(combat);
  draw(run, combat, 5);
  expect(drawSequence(empty, combat).steps).toEqual([]);
});

test("mid-turn draw uses actual card identities and cannot recycle the resolving card", () => {
  const { run, combat } = fixture();
  const arrow = run.deck.find((card) => card.def === "arrow");
  if (!arrow) throw new Error("Missing True shot");
  combat.hand = [arrow];
  combat.draw = [];
  combat.discard = run.deck.filter((card) => card.uid !== arrow.uid);
  const target = combat.enemies[0];
  if (!target) throw new Error("Missing enemy");
  const result = resolve(run, {
    type: "play",
    uid: arrow.uid,
    target: target.uid,
  });
  expect(result.error).toBeNull();
  let presented = combat;
  const moves = [];
  for (const frame of result.frames) {
    if (frame.run.scene.kind !== "combat") continue;
    const sequence = drawSequence(presented, frame.run.scene);
    for (const step of sequence.steps) {
      moves.push(step.kind);
      expect(
        [...step.combat.hand, ...step.combat.draw, ...step.combat.discard].some(
          (card) => card.uid === arrow.uid,
        ),
      ).toBe(false);
    }
    presented = frame.run.scene;
  }
  expect(moves).toEqual(["shuffle", "draw"]);
});

test("a fatal enemy phase does not deal a new hand", () => {
  const { run, combat } = fixture();
  run.hp = 1;
  combat.block = 0;
  const result = resolve(run, { type: "end" });
  expect(result.run.scene).toEqual({ kind: "ending", won: false });
  let presented = discardedHand(combat);
  for (const frame of result.frames) {
    if (frame.run.scene.kind !== "combat") continue;
    expect(drawSequence(presented, frame.run.scene).steps).toEqual([]);
    presented = frame.run.scene;
  }
});
