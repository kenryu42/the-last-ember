import { expect, test } from "bun:test";
import { HeadlessFight } from "../../src/lab/runner";
import { PlaytestProtocol } from "../../src/lab/protocol";
import { chooseAction, planV2 } from "../../src/lab/policies/planner";
import { configSchema, policySchema } from "../../src/lab/headless-config";
import { createHeadlessRun } from "../../src/lab/fixtures/headless";
import { legalActions } from "../../src/lab/legal-actions";
import { observe } from "../../src/lab/observation";
import { createPlaytestRun } from "../../src/lab/fixtures/combat";
import { makeCard } from "../../src/game/engine/rewards";
import { makeEnemy } from "../../src/game/engine/combat/enemy";
import { resolve } from "../../src/game/engine/resolve";

const config = configSchema.parse({
  rules: "candidate",
  fixture: { deckId: "exposed", variant: "base" },
  encounterId: "fury",
  seed: "ember-v02-a",
});
const policies = [...policySchema.options, "planner-v2"] as const;

test("CLI-only mixed diagnostic preserves slots/RNG, exact content and original fixtures", () => {
  for (const encounterId of ["fury", "reinforce", "ward"] as const) {
    const original = createPlaytestRun({
      deckId: "exposed",
      encounterId,
      seed: "mixed-fixture-check",
    });
    const mixedConfig = configSchema.parse({
      ...config,
      encounterId,
      seed: "mixed-fixture-check",
      fixture: { deckId: "exposed", variant: "diagnostic-mixed" },
    });
    const mixed = createHeadlessRun(mixedConfig);
    expect(mixed.deck.map((c) => c.def)).toEqual([
      "defiance",
      "defiance",
      "cinder",
      "cinder",
      "resolve",
      "resolve",
      "unseen",
      "unseen",
      "spark",
      "sacrifice",
      "silence",
      "bread",
    ]);
    expect(mixed.rng).toBe(original.rng);
    expect(mixed.nextId).toBe(original.nextId);
    expect(mixed.deck.map((c) => c.uid)).toEqual(
      original.deck.map((c) => c.uid),
    );
    if (mixed.scene.kind !== "combat" || original.scene.kind !== "combat")
      throw new Error("Fixture");
    expect(mixed.scene.hand.map((c) => c.uid)).toEqual(
      original.scene.hand.map((c) => c.uid),
    );
    expect(mixed.scene.draw.map((c) => c.uid)).toEqual(
      original.scene.draw.map((c) => c.uid),
    );
    expect(mixed.scene.enemies).toEqual(original.scene.enemies);
    expect(original.deck.filter((c) => c.def === "guard")).toHaveLength(2);
    expect(
      createHeadlessRun({
        ...mixedConfig,
        fixture: { deckId: "exposed", variant: "base" },
      }),
    ).toEqual(original);
    const fight = new HeadlessFight(mixedConfig).auto();
    const replay = new HeadlessFight(mixedConfig);
    fight.trace.forEach((a) => replay.step(a));
    expect(replay.result()).toEqual(fight);
    expect(fight.config.fixture.variant).toBe("diagnostic-mixed");
  }
  expect(
    configSchema.safeParse({
      ...config,
      fixture: { deckId: "quiet", variant: "diagnostic-mixed" },
    }).success,
  ).toBe(false);
});

test("mutating an observation cannot mutate engine content or the running fight", () => {
  const fight = new HeadlessFight({ ...config, encounterId: "reinforce" });
  const before = fight.view();
  const exposed = fight.view().observation;
  if (exposed.kind !== "combat") throw new Error("Fixture");
  for (const enemy of exposed.enemies) {
    enemy.intent.amount = 999;
    enemy.pattern.forEach((intent) => {
      intent.amount = 999;
    });
    enemy.hp = 1;
  }
  exposed.hand.splice(0);
  exposed.drawComposition.reverse();
  expect(fight.view()).toEqual(before);
});

test("headless config rejects invalid boundaries rather than normalizing them", () => {
  for (const patch of [
    { rules: "adventure" },
    { seed: " " },
    { seed: " a" },
    { seed: "x".repeat(81) },
    { maxTurns: 0 },
    { maxActions: 2001 },
    { searchBudget: 257 },
    { policy: "oracle" },
    { rng: 1 },
    { fixture: { variant: "ablation", deckId: "quiet" } },
  ])
    expect(configSchema.safeParse({ ...config, ...patch }).success).toBe(false);
});

test("invalid protocol commands and actions preserve observation and replay record", () => {
  const protocol = new PlaytestProtocol();
  expect(protocol.handle({ op: "observe" })).toMatchObject({ ok: false });
  protocol.handle({ op: "start", config });
  const before = protocol.handle({ op: "observe" });
  const record = protocol.handle({ op: "result" });
  for (const input of [
    { op: "step", action: { type: "play", uid: 99999, target: null } },
    { op: "step", action: { type: "end", rng: 7 } },
    { op: "start", config: { ...config, seed: "" } },
    { op: "step", action: { type: "travel", node: "0-0-0" } },
    null,
  ]) {
    expect(protocol.handle(input)).toMatchObject({
      ok: false,
      outcome: "error",
    });
    expect(protocol.handle({ op: "observe" })).toEqual(before);
    expect(protocol.handle({ op: "result" })).toEqual(record);
  }
});

test("all policies are deterministic, replay exact engine outcomes and agree with telemetry", () => {
  for (const policy of policies) {
    const c = { ...config, policy };
    const result = new HeadlessFight(c).auto();
    expect(new HeadlessFight(c).auto()).toEqual(result);
    let run = createHeadlessRun(c);
    let drawn = 5;
    let suppressed = 0;
    let winningTurn = 0;
    for (const action of result.trace) {
      if (run.scene.kind === "combat") winningTurn = run.scene.turn;
      const step = resolve(run, action, c.rules);
      expect(step.error).toBeNull();
      drawn += step.accounting.drawn;
      suppressed += step.accounting.suppressedAttackDamage;
      run = step.run;
    }
    expect(result.finalHealth).toBe(run.hp);
    expect(result.metrics.drawn).toBe(drawn);
    expect(result.metrics.suppressedAttackDamage).toBe(suppressed);
    expect(result.metrics.played).toBe(run.stats.cards);
    expect(result.playerTurns).toBe(winningTurn);
    expect(result.actionCount).toBe(result.telemetry.length);
    expect(run.scene).toEqual({
      kind: "ending",
      won: result.outcome === "win",
    });
  }
});

test("hidden draw order, shuffle RNG and route state cannot influence policy choices", () => {
  const a = createHeadlessRun(config);
  if (a.scene.kind !== "combat") throw new Error("Fixture");
  // Force draw options so the test exercises speculative draws, not only attacks.
  a.scene.hand = [
    makeCard(a, "remember"),
    makeCard(a, "spark"),
    makeCard(a, "cinder"),
  ];
  a.scene.draw = [
    makeCard(a, "guard"),
    makeCard(a, "defiance"),
    makeCard(a, "bread"),
  ];
  const b = structuredClone(a);
  if (b.scene.kind !== "combat") throw new Error("Fixture");
  b.scene.draw.reverse();
  b.rng = 123456;
  b.seed = "private-other";
  b.route.reverse();
  b.nextId += 50;
  const oa = observe(a, "candidate"),
    ob = observe(b, "candidate");
  expect(ob).toEqual(oa);
  const encoded = JSON.stringify(oa);
  for (const key of [
    '"rng"',
    '"seed"',
    '"nextId"',
    '"route"',
    '"draw"',
    '"log"',
  ])
    expect(encoded).not.toContain(key + ":");
  for (const policy of policies)
    for (const seed of ["belief-v1", "belief-v2"])
      expect(chooseAction(oa, policy, seed, 96)).toEqual(
        chooseAction(ob, policy, seed, 96),
      );
  // Actual draws differ. Equality above is not a fixture with irrelevant hidden state.
  const card = a.scene.hand[0];
  if (!card) throw new Error("Fixture");
  const drawnA = resolve(
    a,
    { type: "play", uid: card.uid, target: null },
    "candidate",
  ).run.scene;
  const drawnB = resolve(
    b,
    { type: "play", uid: card.uid, target: null },
    "candidate",
  ).run.scene;
  if (drawnA.kind !== "combat" || drawnB.kind !== "combat")
    throw new Error("Fixture");
  expect(drawnA.hand.map((c) => c.def)).not.toEqual(
    drawnB.hand.map((c) => c.def),
  );
});

test("turn/action limits stop accepted actions and terminal wins take precedence", () => {
  const actions = new HeadlessFight({ ...config, maxActions: 1 });
  actions.step({ type: "end" });
  expect(actions.outcome()).toBe("timeout");
  const before = actions.result();
  expect(() => actions.step({ type: "end" })).toThrow();
  expect(actions.result()).toEqual(before);
  const turns = new HeadlessFight({ ...config, maxTurns: 1 });
  turns.step({ type: "end" });
  expect(turns.outcome()).toBe("timeout");
  expect(turns.view().legalActions).toEqual([]);
  const full = new HeadlessFight(config).auto();
  expect(
    new HeadlessFight({ ...config, maxActions: full.actionCount }).auto()
      .outcome,
  ).toBe(full.outcome);
});

test("legal actions match engine acceptance and reject null attack targets without mutation", () => {
  const run = createHeadlessRun(config);
  for (const action of legalActions(observe(run, config.rules)))
    expect(resolve(run, action, config.rules).error).toBeNull();
  const fight = new HeadlessFight(config);
  const attack = fight
    .view()
    .legalActions.find((a) => a.type === "play" && a.target !== null);
  if (!attack || attack.type !== "play") throw new Error("Missing attack");
  const before = fight.result();
  expect(() => fight.step({ ...attack, target: null })).toThrow();
  expect(fight.result()).toEqual(before);
});

test("crafted diagnostic: planner sees block-then-Iron-answer lethal missed by one-step offense", () => {
  const run = createPlaytestRun({
    deckId: "defense",
    seed: "crafted-shield-line",
    encounterId: "ward",
  });
  if (run.scene.kind !== "combat") throw new Error("Fixture");
  run.scene.hand = [
    { ...makeCard(run, "volley"), upgraded: true },
    makeCard(run, "pass"),
    { ...makeCard(run, "shield"), upgraded: true },
  ];
  run.scene.energy = 2;
  run.scene.enemies = [makeEnemy(run, "sentinel")];
  const enemy = run.scene.enemies[0];
  if (!enemy) throw new Error("Fixture");
  enemy.hp = 17;
  enemy.step = 1; // Guard intent: block has no immediate prevention value.
  const o = observe(run, "control");
  const offense = chooseAction(o, "offense", "diagnostic", 96);
  const planner = chooseAction(o, "planner", "diagnostic", 96);
  expect(offense).toMatchObject({ type: "play", uid: run.scene.hand[0]?.uid });
  expect(planner).toMatchObject({ type: "play", uid: run.scene.hand[1]?.uid });
  const blocked = resolve(run, planner, "control").run;
  const shield = run.scene.hand[2];
  if (!shield) throw new Error("Fixture");
  expect(
    resolve(
      blocked,
      { type: "play", uid: shield.uid, target: enemy.uid },
      "control",
    ).run.scene,
  ).toEqual({ kind: "ending", won: true });
});

test("CLI malformed JSON recovers in protocol and batch reports errors with nonzero exit", () => {
  const input = `oops\n${JSON.stringify({ op: "start", config })}\n${JSON.stringify({ op: "observe" })}\n`;
  const protocol = Bun.spawnSync(
    ["bun", "scripts/lab/playtest-cli.ts", "protocol"],
    { stdin: Buffer.from(input) },
  );
  expect(protocol.exitCode).toBe(0);
  const lines = protocol.stdout
    .toString()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(lines[0]).toMatchObject({ outcome: "error" });
  expect(lines[1]).toEqual(lines[2]);
  const batch = Bun.spawnSync(["bun", "scripts/lab/playtest-cli.ts", "batch"], {
    stdin: Buffer.from(
      `null\n${JSON.stringify({ ...config, maxActions: 1 })}\n`,
    ),
  });
  expect(batch.exitCode).toBe(1);
  expect(batch.stdout.toString()).toContain('"outcome":"timeout"');
});

test("crafted diagnostic: free energy and draw chain is finite and pays exposure", () => {
  let run = createHeadlessRun({
    ...config,
    seed: "crafted-chain",
    encounterId: "fury",
  });
  if (run.scene.kind !== "combat") throw new Error("Fixture");
  const spark = makeCard(run, "spark"),
    sacrifice = makeCard(run, "sacrifice"),
    remember = makeCard(run, "remember");
  run.scene.hand = [spark, sacrifice, remember];
  run.scene.draw = [
    makeCard(run, "guard"),
    makeCard(run, "cinder"),
    makeCard(run, "defiance"),
  ];
  run.scene.discard = [];
  let draws = 0;
  for (const card of [spark, sacrifice, remember]) {
    const result = resolve(
      run,
      { type: "play", uid: card.uid, target: null },
      "candidate",
    );
    expect(result.error).toBeNull();
    draws += result.accounting.drawn;
    run = result.run;
  }
  if (run.scene.kind !== "combat") throw new Error("Fixture");
  expect(run.scene.energy).toBe(5);
  expect(run.scene.dread).toBe(6);
  expect(draws).toBe(3);
  expect(run.scene.exhaust.map((c) => c.def)).toEqual(["spark", "sacrifice"]);
  expect(run.scene.discard.map((c) => c.def)).toEqual(["remember"]);
  expect(
    resolve(run, { type: "play", uid: spark.uid, target: null }, "candidate")
      .error,
  ).not.toBeNull();
});

test("crafted diagnostic: delaying lethal for bread trades a turn and Dread for health, but attacks reverse the benefit", () => {
  for (const rules of ["control", "candidate"] as const) {
    const run = createPlaytestRun({
      deckId: "quiet",
      seed: "crafted-heal-delay",
      encounterId: "fury",
    });
    if (run.scene.kind !== "combat") throw new Error("Fixture");
    run.hp = 60;
    const strike = makeCard(run, "strike"),
      bread = makeCard(run, "bread");
    run.scene.hand = [strike, bread];
    run.scene.draw = [];
    run.scene.discard = [];
    run.scene.energy = 1;
    const wolf = makeEnemy(run, "wolf");
    wolf.hp = 7;
    wolf.step = 2;
    run.scene.enemies = [wolf];
    const lethal = { type: "play", uid: strike.uid, target: wolf.uid } as const;
    const immediate = resolve(run, lethal, rules).run;
    expect(immediate.scene).toEqual({ kind: "ending", won: true });
    expect(immediate.hp).toBe(60);
    const healed = resolve(
      run,
      { type: "play", uid: bread.uid, target: null },
      rules,
    ).run;
    const waited = resolve(healed, { type: "end" }, rules).run;
    if (waited.scene.kind !== "combat") throw new Error("Fixture");
    expect(waited.scene.turn).toBe(2);
    expect(waited.scene.dread).toBe(2);
    const delayed = resolve(waited, lethal, rules).run;
    expect(delayed.scene).toEqual({ kind: "ending", won: true });
    expect(delayed.hp).toBe(65);
    // Change only the public enemy phase from Howl to its first attack.
    wolf.step = 0;
    const unsafeHeal = resolve(
      run,
      { type: "play", uid: bread.uid, target: null },
      rules,
    ).run;
    const unsafeWait = resolve(unsafeHeal, { type: "end" }, rules).run;
    expect(unsafeWait.hp).toBe(56); // 60 + 5 - (7 base + 2 Act II strength).
  }
});

test("reachable mixed recovery preserves exact action sequence but pre-block suppression is not health saved", () => {
  const c = configSchema.parse({
    ...config,
    fixture: { deckId: "exposed", variant: "diagnostic-mixed" },
    seed: "ember-v02-recovery-005",
    policy: "offense",
  });
  const candidate = new HeadlessFight(c).auto();
  const control = new HeadlessFight({ ...c, rules: "control" }).auto();
  expect(candidate.trace).toEqual(control.trace);
  expect(candidate.actionCount).toBe(19);
  expect(candidate.playerTurns).toBe(4);
  expect(candidate.finalHealth).toBe(43);
  expect(control.finalHealth).toBe(41);
  expect(candidate.metrics.suppressedAttackDamage).toBe(4);
  expect(candidate.dreadEvents).toEqual([
    { at: 4, event: "unlock", dread: 4 },
    { at: 4, event: "suppressed", dread: 3 },
    { at: 4, event: "reactivate", dread: 5 },
  ]);
});

test("mixed planner adverse pair is a sequence tradeoff, not more damage from candidate rules", () => {
  const c = configSchema.parse({
    ...config,
    fixture: { deckId: "exposed", variant: "diagnostic-mixed" },
    seed: "ember-v02-recovery-000",
    policy: "planner",
  });
  const candidate = new HeadlessFight(c).auto();
  const control = new HeadlessFight({ ...c, rules: "control" }).auto();
  expect(control.trace.slice(0, 16)).toEqual(candidate.trace.slice(0, 16));
  expect(control.trace[16]).toEqual({ type: "play", uid: 19, target: null });
  expect(candidate.trace[16]).toEqual({ type: "play", uid: 24, target: null });
  expect([control.finalHealth, control.playerTurns]).toEqual([56, 6]);
  expect([candidate.finalHealth, candidate.playerTurns]).toEqual([53, 5]);
  for (const rules of ["control", "candidate"] as const) {
    const cautious = new HeadlessFight({ ...c, rules });
    control.trace.forEach((action) => cautious.step(action));
    expect(cautious.result().finalHealth).toBe(56);
    const faster = new HeadlessFight({ ...c, rules });
    candidate.trace.forEach((action) => faster.step(action));
    expect(faster.result().finalHealth).toBe(53);
    expect(faster.outcome()).toBe("win");
  }
});

test("planner-v2 budgets include all three beliefs and all projected end phases", () => {
  const o = observe(createHeadlessRun(config), "candidate");
  for (const budget of [1, 3, 6, 18, 96, 256]) {
    const result = planV2(o, "budget-development", budget);
    expect(result.samples).toBe(3);
    expect(result.engineCalls).toBeLessThanOrEqual(budget);
    expect(legalActions(o)).toContainEqual(result.action);
    expect(planV2(o, "budget-development", budget)).toEqual(result);
  }
  expect(planV2(o, "budget-development", 1).engineCalls).toBe(0);
});

test("planner-v2 end phase respects Howl reactivation, locked thresholds, Weak, Ward8 and defeat", () => {
  const run = createHeadlessRun(config);
  if (run.scene.kind !== "combat") throw new Error("Fixture");
  run.hp = 30;
  run.scene.hand = [];
  run.scene.draw = [];
  run.scene.discard = [];
  const stag = makeEnemy(run, "stag"),
    wolf = makeEnemy(run, "wolf");
  run.scene.enemies = [stag, wolf];
  run.scene.dread = 3;
  run.scene.fired = [];
  let plan = planV2(observe(run, "candidate"), "phase-test", 3);
  expect(plan.engineCalls).toBe(3); // Exactly one end action in each independent belief.
  expect(plan.value).toBe(-27); // Locked 4 cannot unlock on Howl; wolf hits for 7+2.
  run.scene.fired = [4];
  plan = planV2(observe(run, "candidate"), "phase-test", 3);
  expect(plan.value).toBe(-33); // Howl reactivates +2; wolf hits for 11.
  wolf.weak = 1;
  expect(planV2(observe(run, "candidate"), "phase-test", 3).value).toBe(-24); // floor(11*.75)=8.
  wolf.weak = 0;
  run.scene.reaction = "ward";
  run.scene.fired = [];
  run.scene.dread = 8;
  expect(planV2(observe(run, "candidate"), "phase-test", 3).value).toBe(-39); // Ward8 unlocks +4 before 13-damage attack.
  run.hp = 5;
  expect(planV2(observe(run, "candidate"), "phase-test", 3).value).toBe(
    -100000,
  );
});

test("planner-v2 can extend a presently lethal phase into a surviving multi-card defense", () => {
  const run = createHeadlessRun(config);
  if (run.scene.kind !== "combat") throw new Error("Fixture");
  run.hp = 5;
  run.scene.energy = 0;
  const rally = makeCard(run, "rally"),
    guard = makeCard(run, "guard");
  run.scene.hand = [rally, guard];
  run.scene.enemies = [makeEnemy(run, "wraith")];
  const result = planV2(observe(run, "candidate"), "rescue-test", 96);
  expect(result.action).toEqual({ type: "play", uid: rally.uid, target: null });
  expect(result.value).toBeGreaterThan(-1);
  const first = resolve(run, result.action, "candidate").run;
  const second = resolve(
    first,
    { type: "play", uid: guard.uid, target: null },
    "candidate",
  ).run;
  expect(resolve(second, { type: "end" }, "candidate").run.hp).toBe(5);
});

test("reachable Ward8 line suppresses strength without repeating the ward, and v2 uses recovery", () => {
  const c = configSchema.parse({
    ...config,
    fixture: { deckId: "exposed", variant: "diagnostic-mixed" },
    encounterId: "ward",
    seed: "ember-v02-recovery-011",
    policy: "defense",
  });
  const source = new HeadlessFight(c).auto();
  expect(source.telemetry[9]?.thresholdEvents).toEqual([
    { at: 8, event: "unlock", dread: 9 },
  ]);
  expect(source.telemetry[15]?.thresholdEvents).toEqual([
    { at: 8, event: "suppressed", dread: 7 },
  ]);
  for (const rules of ["control", "candidate"] as const) {
    const exact = new HeadlessFight({ ...c, rules });
    source.trace.forEach((action) => exact.step(action));
    expect(exact.result().finalHealth).toBe(rules === "control" ? 25 : 36);
    expect(
      exact.result().dreadEvents.filter((e) => e.event === "unlock"),
    ).toHaveLength(2);
    const branch = new HeadlessFight({
      ...c,
      rules,
      policy: "planner-v2",
      planningSeed: "phase-study",
      searchBudget: 256,
    });
    source.trace.slice(0, 15).forEach((action) => branch.step(action));
    expect(branch.view().observation).toMatchObject({
      hp: 51,
      turn: 4,
      energy: 2,
      dread: 9,
    });
    const result = branch.auto();
    expect(result.trace[15]).toEqual({ type: "play", uid: 19, target: null });
    expect([result.outcome, result.finalHealth, result.playerTurns]).toEqual([
      "win",
      rules === "control" ? 44 : 48,
      6,
    ]);
    expect(result.metrics.suppressedAttackDamage).toBe(
      rules === "control" ? 0 : 4,
    );
  }
});
