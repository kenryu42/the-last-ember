import { expect, test } from "bun:test";
import { CARDS, EVENTS, cardDef, value } from "../src/game/content";
import { makeEnemy, newRun, resolve, startCombat } from "../src/game/engine";
import { flameBranchSchema } from "../src/game/model";
import {
  evaluateFlameBranches,
  journeyLegalActions,
  simulateJourney,
} from "../src/game/laboratory-journey";
import { parseSave } from "../src/game/storage";

test.each(flameBranchSchema.options)(
  "camp branch %s preserves identity, saves, and printed effects",
  (branch) => {
    const run = newRun("branch-test", "recurring", {
      kind: "escape",
      target: 4,
      ember: true,
      branchUpgrades: true,
    });
    const node = run.route.find((n) => n.kind === "camp");
    const flame = run.deck.find((c) => c.def === "flame");
    if (!node || !flame) throw new Error("Missing fixture");
    run.location = node.id;
    run.row = node.row;
    run.actBearer = "Aldren";
    run.scene = { kind: "camp", used: false };
    const action = { type: "upgrade", uid: flame.uid, branch } as const;
    expect(resolve(run, { type: "upgrade", uid: flame.uid }).error).toBe(
      "Choose Veiled Flame or Wildfire.",
    );
    expect(journeyLegalActions(run)).toContainEqual(action);
    const result = resolve(run, action);
    expect(result.error).toBeNull();
    const upgraded = result.run.deck.find((c) => c.uid === flame.uid);
    expect(upgraded).toEqual({ ...flame, def: branch, upgraded: true });
    expect(parseSave(JSON.stringify(result.run))).toEqual({
      kind: "valid",
      run: result.run,
    });
    expect(resolve(result.run, action).error).not.toBeNull();
    expect(CARDS.some((c) => c.id === branch)).toBe(false);
    startCombat(result.run, "battle");
    const c = result.run.scene;
    if (c.kind !== "combat" || !upgraded) throw new Error("Missing combat");
    c.ember = { window: "closed", bearer: "Aldren", used: false };
    c.hand = [upgraded];
    c.enemies = [makeEnemy(result.run, "wolf"), makeEnemy(result.run, "wolf")];
    c.enemies.forEach((e) => (e.hp = e.maxHp = 50));
    const target = c.enemies[0]?.uid ?? null;
    const played = resolve(result.run, {
      type: "play",
      uid: upgraded.uid,
      target: branch === "wildfire" ? null : target,
      ...(target !== null ? { empower: target } : {}),
    }).run;
    if (played.scene.kind !== "combat") throw new Error("Unexpected end");
    expect(played.scene.enemies.map((e) => e.hp)).toEqual(
      branch === "wildfire" ? [31, 36] : [27, 50],
    );
    expect(played.scene.dread).toBe(branch === "wildfire" ? 5 : 2);
    expect(played.scene.energy).toBe(1);
  },
);

test("unbranched control upgrades Ancient flame numerically; non-Flame cannot branch", () => {
  expect(
    value(
      cardDef("flame").effects[0] ?? { kind: "hit", amount: 0, upgrade: 0 },
      true,
    ),
  ).toBe(24);
  const run = newRun("wrong-branch", "recurring", {
    kind: "escape",
    target: 4,
    branchUpgrades: true,
  });
  run.scene = { kind: "camp", used: false };
  const card = run.deck[0];
  if (!card) throw new Error("Missing card");
  expect(
    resolve(run, { type: "upgrade", uid: card.uid, branch: "wildfire" }).error,
  ).not.toBeNull();
});

test.each(flameBranchSchema.options)(
  "event-selected Ancient flame offers %s exactly once",
  (branch) => {
    const run = newRun("event-branches", "recurring", {
      kind: "escape",
      target: 4,
      branchUpgrades: true,
    });
    const node = run.route.find((n) => n.kind === "event");
    const event = EVENTS.findIndex((e) => e.choices.some((c) => c.upgrade));
    const index = EVENTS[event]?.choices.findIndex((c) => c.upgrade);
    const flame = run.deck.find((c) => c.def === "flame");
    if (!node || index === undefined || !flame)
      throw new Error("Missing fixture");
    run.location = node.id;
    run.row = node.row;
    run.scene = { kind: "event", event, resolved: null };
    run.deck.forEach((c) => {
      c.upgraded = c.uid !== flame.uid;
    });
    const chosen = resolve(run, { type: "choice", index });
    expect(chosen.error).toBeNull();
    expect(chosen.run.hp).toBe(62);
    expect(chosen.run.scene).toMatchObject({ pendingUpgrade: flame.uid });
    expect(parseSave(JSON.stringify(chosen.run)).kind).toBe("valid");
    expect(journeyLegalActions(chosen.run)).toEqual(
      flameBranchSchema.options.map((b) => ({
        type: "upgrade",
        uid: flame.uid,
        branch: b,
      })),
    );
    expect(resolve(chosen.run, { type: "leave" }).error).not.toBeNull();
    expect(resolve(chosen.run, { type: "choice", index }).error).not.toBeNull();
    expect(
      resolve(chosen.run, { type: "upgrade", uid: flame.uid }).error,
    ).not.toBeNull();
    const done = resolve(chosen.run, {
      type: "upgrade",
      uid: flame.uid,
      branch,
    });
    expect(done.error).toBeNull();
    expect(done.run.hp).toBe(62);
    expect(done.run.deck.find((c) => c.uid === flame.uid)).toEqual({
      ...flame,
      def: branch,
      upgraded: true,
    });
    expect(parseSave(JSON.stringify(done.run)).kind).toBe("valid");
    expect(
      resolve(done.run, { type: "upgrade", uid: flame.uid, branch }).error,
    ).not.toBeNull();
    expect(resolve(done.run, { type: "leave" }).error).toBeNull();
    if (chosen.run.scene.kind !== "event") throw new Error("Missing event");
    chosen.run.scene.pendingUpgrade = 99999;
    expect(parseSave(JSON.stringify(chosen.run)).kind).toBe("error");

    delete run.prototype;
    const control = resolve(run, { type: "choice", index }).run;
    expect(control.deck.find((c) => c.uid === flame.uid)).toEqual({
      ...flame,
      upgraded: true,
    });
    expect(resolve(control, { type: "leave" }).error).toBeNull();
  },
);

test("branch continuations share formations, preserve input, and ignore live hidden RNG", () => {
  const run = newRun("branch-public");
  run.actBearer = "Aldren";
  const before = structuredClone(run);
  const trials = evaluateFlameBranches(run, 9);
  expect(run).toEqual(before);
  run.rng = 987654;
  run.seed = "unseen-future";
  expect(evaluateFlameBranches(run, 9)).toEqual(trials);
  expect(trials.map((t) => t.trials.map((s) => s.formation))[0]).toEqual(
    trials.map((t) => t.trials.map((s) => s.formation))[1],
  );
  expect(
    trials.every(
      (t) => t.trials.length === 4 && t.trials.every((s) => !s.timeout),
    ),
  ).toBe(true);
  expect(trials.some((t) => t.trials.some((s) => s.formation.length > 1))).toBe(
    true,
  );
  expect(
    trials.every((t) => t.trials.every((s) => s.actBearer === "Aldren")),
  ).toBe(true);
  // Distinct decks must produce distinct evaluations; their ranking is not a rule.
  expect(trials.map((t) => t.branch)).toEqual(["veiled-flame", "wildfire"]);
  expect(trials[0]?.utility).not.toBe(trials[1]?.utility);
});

test("continuation policy changes the branch, not the preceding upgrade decision", () => {
  const prototype = {
    kind: "escape",
    target: 4,
    ember: true,
    branchUpgrades: true,
  } as const;
  const control = simulateJourney(
    "identity-followup-v1:0",
    "search",
    256,
    "build-aware",
    "recurring",
    prototype,
    "black-lantern",
  );
  const candidate = simulateJourney(
    "identity-followup-v1:0",
    "search",
    256,
    "continuation",
    "recurring",
    prototype,
    "black-lantern",
  );
  const first = candidate.trace.findIndex(
    (action, index) =>
      JSON.stringify(action) !== JSON.stringify(control.trace[index]),
  );
  expect(first).toBeGreaterThan(0);
  expect(control.trace[first]).toEqual({
    type: "upgrade",
    uid: 9,
    branch: "veiled-flame",
  });
  expect(candidate.trace[first]).toEqual({
    type: "upgrade",
    uid: 9,
    branch: "wildfire",
  });
  expect(candidate.outcome).toBe("win");
});
