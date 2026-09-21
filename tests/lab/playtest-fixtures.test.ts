import { describe, expect, test } from "bun:test";
import { CARDS } from "../../src/game/content/cards";
import { draw } from "../../src/game/engine/combat/setup";
import { intention } from "../../src/game/selectors/intentions";
import { resolve } from "../../src/game/engine/resolve";
import type { Card, Combat, Enemy, Run } from "../../src/game/model";
import {
  createPlaytestRun,
  PLAYTEST_DECKS,
  PLAYTEST_ENCOUNTERS,
} from "../../src/lab/fixtures/combat";
import { parseSave } from "../../src/game/validation/save";

function combat(run: Run): Combat {
  if (run.scene.kind !== "combat") throw new Error("Expected combat");
  return run.scene;
}

function counts(cards: readonly Card[]) {
  const result: Record<string, number> = {};
  for (const card of cards) result[card.def] = (result[card.def] ?? 0) + 1;
  return result;
}

const expectedDecks = {
  quiet: {
    needle: 2,
    arrow: 2,
    unseen: 2,
    guard: 2,
    trail: 1,
    silence: 1,
    volley: 1,
    bread: 1,
  },
  exposed: {
    defiance: 2,
    cinder: 2,
    resolve: 2,
    guard: 2,
    spark: 1,
    sacrifice: 1,
    remember: 1,
    bread: 1,
  },
  defense: {
    shield: 2,
    bash: 2,
    pass: 2,
    guard: 2,
    oath: 1,
    rally: 1,
    courage: 1,
    bread: 1,
  },
};
const expectedEnemies = {
  fury: [
    { def: "wraith", hp: 35 },
    { def: "wraith", hp: 35 },
  ],
  reinforce: [
    { def: "sentinel", hp: 46 },
    { def: "soldier", hp: 38 },
  ],
  ward: [
    { def: "sentinel", hp: 46 },
    { def: "sentinel", hp: 46 },
  ],
} satisfies Record<(typeof PLAYTEST_ENCOUNTERS)[number]["id"], Pick<Enemy, "def" | "hp">[]>;
const seeds = ["ember-v02-a", "ember-v02-b"];

describe("isolated v0.2 playtest fixtures", () => {
  test("stable IDs, display names and exactly 20 supported card definitions", () => {
    expect(PLAYTEST_DECKS.map((deck) => deck.id)).toEqual(["quiet", "exposed", "defense"]);
    expect(PLAYTEST_ENCOUNTERS.map((encounter) => encounter.id)).toEqual([
      "fury",
      "reinforce",
      "ward",
    ]);
    for (const fixture of [...PLAYTEST_DECKS, ...PLAYTEST_ENCOUNTERS])
      expect(fixture.name.length).toBeGreaterThan(0);
    const union = new Set(PLAYTEST_DECKS.flatMap((deck) => [...deck.cards]));
    expect(union.size).toBe(20);
    for (const id of union) {
      const def = CARDS.find((card) => card.id === id);
      expect(def).toBeDefined();
      expect(
        def?.effects.some((effect) => effect.kind === "weak" || effect.kind === "vulnerable"),
      ).toBe(false);
    }
  });

  for (const { id: deckId } of PLAYTEST_DECKS) {
    for (const { id: encounterId } of PLAYTEST_ENCOUNTERS) {
      for (const seed of seeds) {
        test(`${deckId}/${encounterId}/${seed}: exact fresh legal combat`, () => {
          const options = { seed, deckId, encounterId };
          const run = createPlaytestRun(options);
          const c = combat(run);
          expect(createPlaytestRun(options)).toEqual(run);
          expect(parseSave(JSON.stringify(run))).toEqual({
            kind: "valid",
            run,
          });
          expect(run).toMatchObject({
            act: 1,
            hp: 70,
            maxHp: 70,
            relics: [],
            stats: {
              turns: 0,
              kills: 0,
              damage: 0,
              cards: 0,
              thresholds: 0,
              battles: 0,
            },
          });
          expect(c).toMatchObject({
            type: "battle",
            turn: 1,
            energy: 3,
            block: 0,
            dread: 0,
            fired: [],
            reaction: encounterId,
            discard: [],
            exhaust: [],
          });
          expect(c.hand).toHaveLength(5);
          expect(c.draw).toHaveLength(7);
          expect(run.deck).toHaveLength(12);
          const zones = [...c.hand, ...c.draw, ...c.discard, ...c.exhaust];
          expect(counts(run.deck)).toEqual(expectedDecks[deckId]);
          expect(counts(zones)).toEqual(expectedDecks[deckId]);
          expect([...zones].sort((a, b) => a.uid - b.uid)).toEqual(run.deck);
          expect(zones.every((card) => !card.upgraded)).toBe(true);
          expect(new Set(zones.map((card) => card.uid)).size).toBe(12);
          expect(c.enemies.map(({ def, hp }) => ({ def, hp }))).toEqual(
            expectedEnemies[encounterId],
          );
          for (const enemy of c.enemies) {
            expect(enemy).toMatchObject({
              maxHp: enemy.hp,
              strength: 2,
              block: 0,
              weak: 0,
              vulnerable: 0,
              step: 0,
              joinsOn: 0,
            });
            expect(intention(enemy, c)).toEqual(
              enemy.def === "soldier"
                ? { kind: "guard", amount: 8 }
                : { kind: "attack", amount: enemy.def === "wraith" ? 11 : 13 },
            );
          }
          const ids = [...zones, ...c.enemies].map(({ uid }) => uid);
          expect(new Set(ids).size).toBe(14);
          expect(ids.every((uid) => uid < run.nextId)).toBe(true);
          draw(run, c, 20);
          expect(c.hand).toHaveLength(10);
          expect(c.draw).toHaveLength(2);
        });
      }
    }
    test(`${deckId}: seed changes card order but encounters do not`, () => {
      const a = createPlaytestRun({
        seed: "ember-v02-a",
        deckId,
        encounterId: "fury",
      });
      const b = createPlaytestRun({
        seed: "ember-v02-b",
        deckId,
        encounterId: "fury",
      });
      expect(combat(a).hand).not.toEqual(combat(b).hand);
      const ward = createPlaytestRun({
        seed: "ember-v02-a",
        deckId,
        encounterId: "ward",
      });
      expect(combat(ward).hand).toEqual(combat(a).hand);
      expect(combat(ward).draw).toEqual(combat(a).draw);
      expect(ward.rng).toBe(a.rng);
    });
  }

  test("mutating or resolving one run cannot contaminate another call or constants", () => {
    const options = {
      seed: "ember-v02-a",
      deckId: "exposed",
      encounterId: "reinforce",
    } as const;
    const first = createPlaytestRun(options);
    const other = createPlaytestRun(options);
    const snapshot = structuredClone(other);
    const definitions = structuredClone({
      decks: PLAYTEST_DECKS,
      encounters: PLAYTEST_ENCOUNTERS,
    });
    expect(resolve(first, { type: "end" }).error).toBeNull();
    first.hp = 1;
    first.relics.push("flint");
    first.stats.cards = 99;
    first.route.length = 0;
    first.visited.push("mutated");
    first.deck.forEach((card) => {
      card.upgraded = true;
    });
    combat(first).enemies.forEach((enemy) => {
      enemy.hp = 1;
    });
    (combat(first).fired ??= []).push(4);
    combat(first).log.push("mutated");
    combat(first).hand.length = 0;
    expect(other).toEqual(snapshot);
    expect(createPlaytestRun(options)).toEqual(snapshot);
    expect({ decks: PLAYTEST_DECKS, encounters: PLAYTEST_ENCOUNTERS }).toEqual(definitions);
  });
});
