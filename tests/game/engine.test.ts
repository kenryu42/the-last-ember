import { describe, expect, test } from "bun:test";
import { CARDS, cardDef, effectText } from "../../src/game/content/cards";
import { EVENTS } from "../../src/game/content/world";
import { RELICS } from "../../src/game/content/relics";
import { draw, startCombat } from "../../src/game/engine/combat/setup";
import { grantRelic, makeCard } from "../../src/game/engine/rewards";
import { intention, thresholds } from "../../src/game/selectors/intentions";
import { makeEnemy } from "../../src/game/engine/combat/enemy";
import { newRun } from "../../src/game/engine/run";
import { reachable } from "../../src/game/selectors/route";
import { resolve } from "../../src/game/engine/resolve";
import type { Action, Combat, Run } from "../../src/game/model";
import {
  defaultSettings,
  settingsSchema,
} from "../../src/platform/browser/settings";
import { parseSave } from "../../src/game/validation/save";

function combat(run: Run): Combat {
  if (run.scene.kind !== "combat")
    throw new Error(`Expected combat, got ${run.scene.kind}`);
  return run.scene;
}
function setup(cards: string[] = ["strike"]) {
  const run = newRun("test");
  const node = run.route.find((node) => node.row === 0);
  if (!node) throw new Error("Missing first stop");
  run.row = node.row;
  run.location = node.id;
  run.visited.push(node.id);
  run.deck = cards.map((id) => makeCard(run, id));
  startCombat(run, "battle");
  const c = combat(run);
  c.hand = [...run.deck];
  c.draw = [];
  c.discard = [];
  c.exhaust = [];
  c.enemies = [makeEnemy(run, "wolf")];
  c.reaction = "fury";
  return run;
}
function act(run: Run, action: Action) {
  const result = resolve(run, action);
  expect(result.error).toBeNull();
  return result.run;
}
function play(run: Run, def: string, targetIndex = 0) {
  const c = combat(run),
    card = c.hand.find((x) => x.def === def);
  if (!card) throw new Error(`Missing ${def}`);
  return act(run, {
    type: "play",
    uid: card.uid,
    target: c.enemies[targetIndex]?.uid ?? null,
  });
}
function first(run: Run) {
  const enemy = combat(run).enemies[0];
  if (!enemy) throw new Error("Missing enemy");
  return enemy;
}

describe("Dread has an end-turn contract", () => {
  test.each([
    [3, []],
    [4, [4]],
    [7, [4]],
    [8, [4, 8]],
    [10, [4, 8]],
  ] satisfies [number, number[]][])("at %i fires %p", (dread, fired) => {
    const run = setup();
    combat(run).dread = dread;
    const next = act(run, { type: "end" });
    expect(combat(next).fired).toEqual(fired);
    expect(first(next).strength).toBe(
      fired.length === 2 ? 5 : fired.length === 1 ? 2 : 0,
    );
  });
  test("crossing then lowering prevents activation; meter clamps both ends", () => {
    let run = setup(["flame", "unseen"]);
    first(run).hp = 200;
    first(run).maxHp = 200;
    combat(run).dread = 2;
    run = play(run, "flame");
    expect(combat(run).dread).toBe(5);
    expect(combat(run).fired).toEqual([]);
    run = play(run, "unseen");
    expect(combat(run).dread).toBe(3);
    run = act(run, { type: "end" });
    expect(combat(run).fired).toEqual([]);
    run = setup(["silence"]);
    combat(run).dread = 1;
    run = play(run, "silence");
    expect(combat(run).dread).toBe(0);
    run = setup(["flame"]);
    first(run).hp = 100;
    first(run).maxHp = 100;
    combat(run).dread = 9;
    run = play(run, "flame");
    expect(combat(run).dread).toBe(10);
  });
  test("no threshold can fire twice after reduction and recrossing", () => {
    let run = setup();
    combat(run).dread = 8;
    run = act(run, { type: "end" });
    combat(run).dread = 0;
    run = act(run, { type: "end" });
    combat(run).dread = 10;
    run = act(run, { type: "end" });
    expect(combat(run).fired).toEqual([4, 8]);
    expect(first(run).strength).toBe(5);
  });
  test("reinforcement waits the arrival phase, then acts", () => {
    let run = setup();
    combat(run).reaction = "reinforce";
    combat(run).dread = 4;
    run = act(run, { type: "end" });
    expect(run.hp).toBe(63);
    expect(combat(run).enemies).toHaveLength(2);
    expect(combat(run).enemies[1]?.step).toBe(0);
    run = act(run, { type: "end" });
    expect(run.hp).toBe(46);
    expect(combat(run).enemies[1]?.step).toBe(1);
  });
  test("both thresholds include newly summoned enemy, without making it act", () => {
    const run = setup();
    combat(run).reaction = "reinforce";
    combat(run).dread = 8;
    const next = act(run, { type: "end" });
    expect(next.hp).toBe(60);
    expect(combat(next).enemies[1]?.strength).toBe(3);
    expect(combat(next).enemies[1]?.step).toBe(0);
  });
  test("a lethal card resolves all effects but victory prevents deferred enemies", () => {
    const run = setup(["flame"]);
    first(run).hp = 3;
    combat(run).dread = 7;
    combat(run).reaction = "reinforce";
    const result = resolve(run, {
      type: "play",
      uid: combat(run).hand[0]?.uid ?? -1,
      target: first(run).uid,
    });
    expect(result.run.scene.kind).toBe("reward");
    expect(result.run.stats.thresholds).toBe(0);
    expect(
      result.frames.some(
        (f) => f.run.scene.kind === "combat" && f.run.scene.dread === 10,
      ),
    ).toBe(true);
  });
  test("ward block is not erased during its arrival phase", () => {
    const run = setup();
    combat(run).reaction = "ward";
    combat(run).dread = 4;
    first(run).block = 5;
    const next = act(run, { type: "end" });
    expect(first(next).block).toBe(10);
  });
  test("quiet bell changes both previews and trigger boundaries", () => {
    const run = setup();
    grantRelic(run, "charm");
    combat(run).dread = 4;
    expect(thresholds(run, combat(run)).map((t) => t.at)).toEqual([5, 9]);
    expect(combat(act(run, { type: "end" })).fired).toEqual([]);
  });
});
describe("combat arithmetic and ordered presentation", () => {
  test.each([
    [0, 63],
    [4, 67],
    [7, 70],
    [12, 70],
  ])("%i block leaves %i health", (block, hp) => {
    const run = setup();
    combat(run).block = block;
    const next = act(run, { type: "end" });
    expect(next.hp).toBe(hp);
    expect(combat(next).block).toBe(0);
  });
  test("lethal enemy damage stops later enemy intentions immediately", () => {
    const run = setup();
    run.hp = 2;
    combat(run).enemies.push(makeEnemy(run, "crow"));
    const result = resolve(run, { type: "end" });
    expect(result.run.hp).toBe(0);
    expect(result.run.scene).toEqual({ kind: "ending", won: false });
    expect(result.frames.filter((f) => f.cue === "enemy")).toHaveLength(1);
    expect(resolve(result.run, { type: "end" }).error).not.toBeNull();
  });
  test("damage uses block, caps overkill, and emits impact snapshots", () => {
    const run = setup(["double"]);
    first(run).hp = 5;
    first(run).block = 2;
    const result = resolve(run, {
      type: "play",
      uid: combat(run).hand[0]?.uid ?? -1,
      target: first(run).uid,
    });
    const hits = result.frames.filter((f) => f.cue === "arrow");
    expect(hits).toHaveLength(2);
    expect(hits[0] && first(hits[0].run).hp).toBe(3);
    expect(hits[1] && first(hits[1].run).hp).toBe(0);
    expect(result.run.stats.damage).toBe(5);
    expect(run.stats.damage).toBe(0);
    expect(first(run).hp).toBe(5);
  });
  test("statuses round down and lose one only after enemy acts", () => {
    let run = setup(["feint", "strike", "challenge"]);
    run = play(run, "feint");
    run = play(run, "strike");
    expect(first(run).hp).toBe(14);
    run = play(run, "challenge");
    expect(intention(first(run), combat(run)).amount).toBe(5);
    run = act(run, { type: "end" });
    expect(run.hp).toBe(65);
    expect(first(run).weak).toBe(1);
    expect(first(run).vulnerable).toBe(1);
  });
  test("illegal target, energy, missing card, and wrong scene are no-ops", () => {
    const run = setup(["flame"]);
    combat(run).energy = 1;
    for (const action of [
      { type: "play", uid: run.deck[0]?.uid ?? -1, target: first(run).uid },
      { type: "play", uid: -1, target: null },
      { type: "rest" },
    ] satisfies Action[]) {
      const result = resolve(run, action);
      expect(result.error).not.toBeNull();
      expect(result.run).toEqual(run);
    }
    combat(run).energy = 3;
    expect(
      resolve(run, { type: "play", uid: run.deck[0]?.uid ?? -1, target: null })
        .run,
    ).toEqual(run);
  });
  test("final guardian victory has no reward or fourth act", () => {
    const run = setup(["strike"]);
    run.act = 2;
    combat(run).type = "boss";
    first(run).hp = 1;
    const next = play(run, "strike");
    expect(next.scene).toEqual({ kind: "ending", won: true });
    expect(next.act).toBe(2);
  });
});
describe("cards and zones", () => {
  test("draw reshuffles mid-draw, preserves unique copies, and honors hand cap", () => {
    const run = newRun("zones");
    startCombat(run, "battle");
    const c = combat(run);
    c.discard = c.draw.splice(0, 5);
    const ids = run.deck.map((c) => c.uid).sort((a, b) => a - b);
    draw(run, c, 9);
    expect(c.hand).toHaveLength(10);
    expect(c.draw).toHaveLength(2);
    const before = structuredClone(c.draw);
    draw(run, c, 3);
    expect(c.draw).toEqual(before);
    expect(
      [...c.hand, ...c.draw, ...c.discard, ...c.exhaust]
        .map((c) => c.uid)
        .sort((a, b) => a - b),
    ).toEqual(ids);
  });
  test("unresolved draw card cannot redraw itself", () => {
    let run = setup(["arrow"]);
    run = play(run, "arrow");
    expect(combat(run).hand).toHaveLength(0);
    expect(combat(run).discard).toHaveLength(1);
  });
  test("exhaust leaves combat and retain survives end turn", () => {
    let run = setup(["scout", "courage", "strike"]);
    run = play(run, "scout");
    expect(combat(run).exhaust.map((c) => c.def)).toEqual(["scout"]);
    const retained = combat(run).hand.find((c) => c.def === "courage")?.uid;
    run = act(run, { type: "end" });
    expect(combat(run).hand.some((c) => c.uid === retained)).toBe(true);
    expect(combat(run).hand.some((c) => c.def === "scout")).toBe(false);
    startCombat(run, "battle");
    expect(
      [...combat(run).draw, ...combat(run).hand].some((c) => c.def === "scout"),
    ).toBe(true);
  });
  const cases: [string, number, number, number, number][] = [
    ["strike", 7, 0, 0, 0],
    ["guard", 0, 7, 0, 0],
    ["arrow", 6, 0, 0, 0],
    ["unseen", 0, 5, 0, 0],
    ["flame", 18, 0, 3, 0],
    ["defiance", 7, 0, 0, 0],
    ["pass", 0, 11, 1, 0],
    ["bash", 5, 5, 0, 0],
    ["shield", 3, 0, 0, 0],
    ["stand", 8, 18, 0, 0],
    ["challenge", 0, 0, 1, 0],
    ["oath", 0, 9, 0, 0],
    ["rally", 0, 4, 0, 0],
    ["needle", 14, 0, 0, 0],
    ["volley", 10, 0, 0, 0],
    ["scout", 0, 0, 0, 0],
    ["feint", 0, 0, 1, 0],
    ["silence", 0, 0, 0, 0],
    ["double", 8, 0, 0, 0],
    ["trail", 0, 0, 0, 0],
    ["spark", 0, 0, 2, 0],
    ["inferno", 17, 0, 4, 0],
    ["cinder", 12, 0, 2, 0],
    ["resolve", 0, 7, 0, 0],
    ["ward", 0, 14, 2, 0],
    ["remember", 0, 0, 1, 0],
    ["sunrise", 0, 0, 2, 8],
    ["bread", 0, 0, 0, 5],
    ["courage", 0, 3, 0, 0],
    ["lantern", 0, 0, 0, 0],
    ["sacrifice", 0, 0, 3, 0],
    ["home", 0, 12, 0, 0],
  ];
  test.each(cases)(
    "%s has independently specified base effects",
    (id, damage, block, dread, heal) => {
      let run = setup([id]);
      run.hp = 40;
      first(run).hp = 100;
      first(run).maxHp = 100;
      run = play(run, id);
      expect(100 - first(run).hp).toBe(damage);
      expect(combat(run).block).toBe(block);
      expect(combat(run).dread).toBe(dread);
      expect(run.hp).toBe(40 + heal);
    },
  );
  test("high Dread, precision, and block scaling change tactical values", () => {
    let run = setup(["defiance", "resolve"]);
    combat(run).dread = 6;
    first(run).hp = 100;
    first(run).maxHp = 100;
    run = play(run, "defiance");
    expect(first(run).hp).toBe(86);
    run = play(run, "resolve");
    expect(combat(run).block).toBe(13);
    run = setup(["needle"]);
    combat(run).dread = 4;
    run = play(run, "needle");
    expect(first(run).hp).toBe(16);
    run = setup(["shield"]);
    combat(run).block = 11;
    run = play(run, "shield");
    expect(first(run).hp).toBe(10);
  });
  test("all upgrades change printed effect and every card is legal at cost", () => {
    for (const def of CARDS) {
      let run = setup([def.id]);
      first(run).hp = 200;
      first(run).maxHp = 200;
      const card = run.deck[0];
      if (!card) throw new Error("no card");
      card.upgraded = true;
      combat(run).hand[0] = { ...card };
      combat(run).energy = def.cost;
      run = play(run, def.id);
      expect(run.stats.cards).toBe(1);
      expect(def.effects.map((e) => effectText(e, false))).not.toEqual(
        def.effects.map((e) => effectText(e, true)),
      );
    }
  });
});
describe("card differentiation", () => {
  test("same-cost cards do not duplicate numeric effects behind names or keywords", () => {
    const duplicates: string[] = [];
    for (const upgraded of [false, true]) {
      const seen = new Map<string, string>();
      for (const def of CARDS) {
        const effects = def.effects.map(
          (effect) =>
            `${effect.kind}:${effect.amount + (upgraded ? effect.upgrade : 0)}`,
        );
        // These effects commute in the current engine. Do not normalize hits,
        // draw, or conditional scaling: their ordering/multiplicity can matter.
        if (
          new Set(def.effects.map((effect) => effect.kind)).size ===
            effects.length &&
          def.effects.every((effect) =>
            ["block", "dread", "energy"].includes(effect.kind),
          )
        )
          effects.sort();
        const key = JSON.stringify([def.cost, effects]);
        const other = seen.get(key);
        if (other)
          duplicates.push(
            `${upgraded ? "improved" : "base"}: ${other}/${def.id}`,
          );
        seen.set(key, def.id);
      }
    }
    expect(duplicates).toEqual([]);
  });

  test.each([false, true])(
    "Hidden trail cycles once without spending energy or granting block, improved=%s",
    (upgraded) => {
      let run = setup(["trail", "needle"]);
      const trail = run.deck[0],
        needle = run.deck[1];
      if (!trail || !needle) throw new Error("Missing fixture cards");
      trail.upgraded = upgraded;
      combat(run).hand = [trail];
      combat(run).draw = [needle];
      combat(run).energy = 1;
      combat(run).dread = 4;
      run = play(run, "trail");
      expect(combat(run).hand.map((card) => card.uid)).toEqual([needle.uid]);
      expect(combat(run).energy).toBe(1);
      expect(combat(run).block).toBe(0);
      expect(combat(run).dread).toBe(upgraded ? 2 : 3);
      expect(combat(run).exhaust.map((card) => card.uid)).toEqual([trail.uid]);
      expect(combat(run).discard).toEqual([]);
      expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
      run = play(run, "needle");
      expect(first(run).hp).toBe(10); // 24 - 14, with precision enabled by Trail.
      run = act(run, { type: "end" });
      expect(combat(run).hand.some((card) => card.uid === trail.uid)).toBe(
        false,
      );
      startCombat(run, "battle");
      expect(
        [...combat(run).hand, ...combat(run).draw].some(
          (card) => card.uid === trail.uid,
        ),
      ).toBe(true);
    },
  );

  test("Small courage keeps its bankable defense rather than drawing a replacement", () => {
    let run = setup(["courage", "needle"]);
    const courage = run.deck[0],
      needle = run.deck[1];
    if (!courage || !needle) throw new Error("Missing fixture cards");
    combat(run).hand = [courage];
    combat(run).draw = [needle];
    combat(run).dread = 4;
    run = play(run, "courage");
    expect(combat(run).block).toBe(3);
    expect(combat(run).dread).toBe(3);
    expect(combat(run).hand).toEqual([]);
    expect(combat(run).draw.map((card) => card.uid)).toEqual([needle.uid]);
    expect(combat(run).discard.map((card) => card.uid)).toEqual([courage.uid]);
    expect(cardDef("courage").retain).toBe(true);
  });

  test.each([
    ["spark", false, 1, 3, false],
    ["spark", true, 2, 3, false],
    ["sacrifice", false, 2, 4, true],
    ["sacrifice", true, 3, 4, true],
  ] satisfies [string, boolean, number, number, boolean][])(
    "%s improved=%s trades %i energy for a distinct exposure cost",
    (id, upgraded, energy, dread, pending) => {
      const run = setup([id]);
      const card = run.deck[0];
      if (!card) throw new Error("Missing fixture card");
      card.upgraded = upgraded;
      combat(run).energy = 0;
      combat(run).dread = 1;
      const next = play(run, id);
      expect(combat(next).energy).toBe(energy);
      expect(combat(next).dread).toBe(dread);
      expect(
        thresholds(next, combat(next)).some((threshold) => threshold.pending),
      ).toBe(pending);
      expect(combat(next).fired).toEqual([]);
      expect(combat(next).exhaust.map((card) => card.uid)).toEqual([card.uid]);
      expect(parseSave(JSON.stringify(next)).kind).toBe("valid");
    },
  );
});
describe("the road, purchases, and saves", () => {
  test("routes are connected and guarantee a camp on every legal path", () => {
    for (let i = 0; i < 50; i++) {
      const run = newRun(`route-${i}`);
      expect(run.route).toHaveLength(18);
      expect(
        run.route.filter((n) => n.row === 2).every((n) => n.kind === "camp"),
      ).toBe(true);
      for (const node of run.route.filter((n) => n.row < 5)) {
        expect(node.links.length).toBeGreaterThan(0);
        expect(
          node.links.every((id) =>
            run.route.some((n) => n.id === id && n.row === node.row + 1),
          ),
        ).toBe(true);
      }
      const node = run.route.find((n) => n.row === 1);
      if (!node) throw new Error("no node");
      expect(reachable(run, node)).toBe(false);
    }
  });
  test("reward claimed once, skip keeps relic, boss heals and advances", () => {
    const run = newRun("reward");
    run.hp = 40;
    run.scene = {
      kind: "reward",
      cards: ["flame", "guard", "arrow"],
      relic: "kettle",
      gold: 65,
      boss: true,
    };
    const next = act(run, { type: "reward", card: null });
    expect(next.deck).toHaveLength(12);
    expect(next.relics).toEqual(["kettle"]);
    expect(next.act).toBe(1);
    expect(next.hp).toBe(54);
    expect(next.row).toBe(-1);
    expect(
      resolve(next, { type: "reward", card: "flame" }).error,
    ).not.toBeNull();
  });
  test("purchases are atomic, sold items stay sold, removal affects one instance", () => {
    let run = newRun("shop");
    run.gold = 100;
    run.scene = {
      kind: "shop",
      cards: ["flame"],
      relic: "coal",
      healed: false,
      removed: false,
    };
    run = act(run, { type: "buy", item: "card", index: 0 });
    expect(run.gold).toBe(60);
    expect(run.deck).toHaveLength(13);
    expect(resolve(run, { type: "buy", item: "card", index: 0 }).run).toEqual(
      run,
    );
    expect(resolve(run, { type: "buy", item: "relic", index: 0 }).run).toEqual(
      run,
    );
    const uid = run.deck.find((c) => c.def === "strike")?.uid ?? -1;
    run = act(run, { type: "buy", item: "remove", index: uid });
    expect(run.gold).toBe(15);
    expect(run.deck.filter((c) => c.def === "strike")).toHaveLength(1);
  });
  test("camp improves selected duplicate only; heal is capped and usable once", () => {
    let run = newRun("camp");
    run.scene = { kind: "camp", used: false };
    const uid = run.deck[0]?.uid ?? -1;
    run = act(run, { type: "upgrade", uid });
    expect(run.deck.filter((c) => c.upgraded)).toHaveLength(1);
    expect(resolve(run, { type: "rest" }).error).not.toBeNull();
    run.scene = { kind: "camp", used: false };
    run.hp = 69;
    run = act(run, { type: "rest" });
    expect(run.hp).toBe(70);
  });
  test("all event choices commit once; unaffordable choice has no effects", () => {
    EVENTS.forEach((event, index) =>
      event.choices.forEach((choice, ci) => {
        const run = newRun(`event-${index}`);
        run.hp = 40;
        run.gold = 100;
        run.scene = { kind: "event", event: index, resolved: null };
        const next = act(run, { type: "choice", index: ci });
        expect(next.gold).toBe(100 + choice.gold);
        expect(next.hp).toBe(40 + choice.hp);
        expect(
          resolve(next, { type: "choice", index: ci }).error,
        ).not.toBeNull();
      }),
    );
    const run = newRun("poor");
    run.gold = 0;
    run.scene = { kind: "event", event: 0, resolved: null };
    expect(resolve(run, { type: "choice", index: 0 }).run).toEqual(run);
  });
  test("every scene round-trips and does not reroll future results", () => {
    const run = setup();
    const scenes: Run["scene"][] = [
      run.scene,
      { kind: "map" },
      { kind: "camp", used: false },
      { kind: "event", event: 3, resolved: null },
      {
        kind: "shop",
        cards: ["flame", null],
        relic: "coal",
        healed: true,
        removed: false,
      },
      { kind: "reward", cards: ["arrow"], relic: null, gold: 25, boss: false },
      { kind: "ending", won: false },
    ];
    for (const scene of scenes) {
      const fixture = structuredClone({ ...run, scene });
      const kind =
        scene.kind === "camp" || scene.kind === "event" || scene.kind === "shop"
          ? scene.kind
          : "battle";
      const node = fixture.route.find((node) => node.kind === kind);
      if (!node) throw new Error("Missing fixture stop");
      fixture.location = node.id;
      fixture.row = node.row;
      if (scene.kind === "ending") fixture.hp = 0;
      const parsed = parseSave(JSON.stringify(fixture));
      expect(parsed.kind).toBe("valid");
      if (parsed.kind === "valid") expect(parsed.run).toEqual(fixture);
    }
    const saved = parseSave(JSON.stringify(run));
    if (saved.kind !== "valid") throw new Error("invalid");
    expect(resolve(saved.run, { type: "end" })).toEqual(
      resolve(run, { type: "end" }),
    );
  });
  test("rejects corrupt, unsupported, unknown cards, duplicate zones; settings independent", () => {
    for (const text of [
      "{broken",
      "null",
      JSON.stringify({ ...newRun("bad"), version: 9 }),
    ])
      expect(parseSave(text).kind).toBe("error");
    const run = setup();
    combat(run).hand.push({
      ...(combat(run).hand[0] ?? { uid: 0, def: "strike", upgraded: false }),
    });
    expect(parseSave(JSON.stringify(run)).kind).toBe("error");
    const other = newRun("bad");
    const card = other.deck[0];
    if (card) card.def = "missing";
    expect(parseSave(JSON.stringify(other)).kind).toBe("error");
    expect(settingsSchema.parse(defaultSettings)).toEqual(defaultSettings);
    expect(
      settingsSchema.safeParse({ ...defaultSettings, music: 2 }).success,
    ).toBe(false);
  });
  test("import rejects unwinnable combat, colliding enemy IDs and route dead ends", () => {
    const edits: ((run: Run) => void)[] = [
      (run) => {
        combat(run).enemies = [];
      },
      (run) => {
        first(run).hp = 0;
      },
      (run) => {
        run.hp = 0;
      },
      (run) => {
        combat(run).enemies.push({ ...first(run) });
      },
      (run) => {
        first(run).uid = run.deck[0]?.uid ?? -1;
      },
      (run) => {
        first(run).uid = run.nextId;
      },
      (run) => {
        const node = run.route[0];
        if (node) node.links = [];
      },
      (run) => {
        const node = run.route[0];
        if (node) run.route.push({ ...node });
      },
    ];
    for (const edit of edits) {
      const run = setup();
      expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
      edit(run);
      expect(parseSave(JSON.stringify(run)).kind).toBe("error");
    }
  });
  test("content identities and references are unique and complete", () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(30);
    expect(RELICS.length).toBeGreaterThanOrEqual(10);
    expect(EVENTS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const event of EVENTS)
      for (const choice of event.choices)
        if (choice.card) expect(cardDef(choice.card)).toBeDefined();
  });
});
