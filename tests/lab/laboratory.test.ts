import { expect, test } from "bun:test";
import {
  assertInvariants,
  distribution,
  simulate,
  summarizeLab,
} from "../../src/lab/simulation";
import { botSchema, labConfigSchema } from "../../src/lab/config";
import { selectAction } from "../../src/lab/policies/selection";
import { createHeadlessRun } from "../../src/lab/fixtures/headless";
import { legalActions } from "../../src/lab/legal-actions";
import { observe } from "../../src/lab/observation";
import { resolve } from "../../src/game/engine/resolve";

const config = labConfigSchema.parse({
  rules: "control",
  fixture: { deckId: "exposed", variant: "base" },
  encounterId: "fury",
  seed: "lab-regression",
  searchBudget: 256,
});

test("omitting animation snapshots preserves legal and illegal benchmark transitions", () => {
  let frames = 0;
  for (const rules of ["control", "candidate"] as const)
    for (const deckId of ["quiet", "exposed", "defense"] as const)
      for (const encounterId of ["fury", "reinforce", "ward"] as const) {
        let run = createHeadlessRun({
          ...config,
          encounterId,
          fixture: { deckId, variant: "base" },
        });
        for (
          let index = 0;
          index < 80 && run.scene.kind === "combat";
          index++
        ) {
          const o = observe(run, rules);
          const legal = legalActions(o);
          for (const action of [
            ...legal,
            { type: "play", uid: -1, target: null } as const,
          ]) {
            const full = resolve(run, action, rules);
            const compact = resolve(run, action, rules, {
              captureFrames: false,
            });
            expect(compact).toEqual({ ...full, frames: [] });
            frames += full.frames.length;
          }
          run = resolve(
            run,
            selectAction(o, legal, "random", `frames:${index}`, 96),
            rules,
          ).run;
        }
      }
  expect(frames).toBeGreaterThan(100);
});

test("all lab policies obey public observation and replay deterministic legal outcomes", () => {
  for (const bot of botSchema.options) {
    const c = { ...config, bot };
    const result = simulate(c);
    expect(simulate(c)).toEqual(result);
    let run = createHeadlessRun(c);
    let draws = 5;
    for (const action of result.trace) {
      expect(legalActions(observe(run, c.rules))).toContainEqual(action);
      const step = resolve(run, action, c.rules);
      expect(step.error).toBeNull();
      draws += step.accounting.drawn;
      run = step.run;
      assertInvariants(run);
      expect(JSON.parse(JSON.stringify(run))).toEqual(run);
    }
    expect(result.finalHealth).toBe(run.hp);
    expect(result.drawn).toBe(draws);
    expect(Object.values(result.cards).reduce((n, c) => n + c.drawn, 0)).toBe(
      draws,
    );
    expect(Object.values(result.cards).reduce((n, c) => n + c.played, 0)).toBe(
      run.stats.cards,
    );
    expect(result.generated).toBeGreaterThanOrEqual(
      result.spent + result.unused,
    );
    if (run.scene.kind === "ending")
      expect(resolve(run, { type: "end" }, c.rules).error).not.toBeNull();
  }
});

test("random legal fuzz covers every fixture and validates all available actions", () => {
  for (const deckId of ["quiet", "exposed", "defense"] as const)
    for (const encounterId of ["fury", "reinforce", "ward"] as const)
      for (let seed = 0; seed < 10; seed++) {
        const c = labConfigSchema.parse({
          ...config,
          fixture: { deckId, variant: "base" },
          encounterId,
          seed: `fuzz:${seed}`,
          planningSeed: `fuzz-policy:${seed}`,
          bot: "random",
        });
        const r = simulate(c, true);
        for (const step of r.replay) {
          const before = JSON.stringify(step.before);
          for (const action of step.legal)
            expect(resolve(step.before, action, c.rules).error).toBeNull();
          expect(JSON.stringify(step.before)).toBe(before);
          expect(resolve(step.before, step.selected, c.rules).run).toEqual(
            step.after,
          );
        }
      }
});

test("invariants reject missing, duplicated and altered card instances", () => {
  for (const defect of ["missing", "duplicate", "identity"] as const) {
    const run = createHeadlessRun(config);
    if (run.scene.kind !== "combat") throw new Error("fixture");
    const card = run.scene.hand[0];
    if (!card) throw new Error("fixture");
    // Break sharing before changing one zone copy.
    run.scene.hand = structuredClone(run.scene.hand);
    if (defect === "missing") run.scene.hand.pop();
    else if (defect === "duplicate") run.scene.draw.push(card);
    else {
      const copy = run.scene.hand[0];
      if (copy) copy.def = "strike";
    }
    expect(() => assertInvariants(run)).toThrow();
  }
});

test("hidden order/RNG do not influence any new policy", () => {
  const a = createHeadlessRun(config),
    b = structuredClone(a);
  if (b.scene.kind !== "combat") throw new Error("fixture");
  b.scene.draw.reverse();
  b.rng = 17;
  b.seed = "hidden";
  const oa = observe(a, "control"),
    ob = observe(b, "control");
  expect(oa).toEqual(ob);
  for (const bot of botSchema.options)
    expect(selectAction(oa, legalActions(oa), bot, "independent", 256)).toEqual(
      selectAction(ob, legalActions(ob), bot, "independent", 256),
    );
});

test("report quantiles and censored outcomes retain their denominators", () => {
  expect(distribution([9, 1, 4, 2, 100])).toEqual({
    min: 1,
    p25: 2,
    median: 4,
    p75: 9,
    p95: 100,
    max: 100,
  });
  const r = simulate({ ...config, bot: "random", maxActions: 1 });
  expect(r.outcome).toBe("timeout");
  expect(summarizeLab([r])[0]).toMatchObject({
    n: 1,
    wins: 0,
    losses: 0,
    timeouts: 1,
  });
});

test("CLI seed replay reproduces the selected simulation and rejects invalid options", () => {
  const args = ["bun", "scripts/lab/lab.ts"];
  const batch = Bun.spawnSync([
    ...args,
    "simulate",
    "--games",
    "1",
    "--seed",
    "cli-check",
    "--bot",
    "random",
  ]);
  expect(batch.exitCode).toBe(0);
  const result = JSON.parse(batch.stdout.toString());
  const replay = Bun.spawnSync([
    ...args,
    "replay",
    "--seed",
    "cli-check:0",
    "--bot",
    "random",
  ]);
  expect(replay.exitCode).toBe(0);
  expect(JSON.parse(replay.stdout.toString()).trace).toEqual(result.trace);
  const report = Bun.spawnSync([...args, "analyze"], { stdin: batch.stdout });
  expect(report.exitCode).toBe(0);
  expect(JSON.parse(report.stdout.toString())[0].n).toBe(1);
  expect(Bun.spawnSync([...args, "simulate", "--games", "0"]).exitCode).toBe(1);
  const wrongRules = Bun.spawnSync([
    ...args,
    "journey",
    "--games",
    "1",
    "--rules",
    "candidate",
  ]);
  expect(wrongRules.exitCode).toBe(1);
  expect(wrongRules.stderr.toString()).toContain("benchmark-only");
  expect(
    Bun.spawnSync([...args, "simulate", "--progression", "shield-aware"])
      .exitCode,
  ).toBe(1);
});

test("report pairs configurations rather than matching file order", () => {
  const base = simulate({ ...config, bot: "random", maxActions: 1 });
  const rows = [
    {
      ...base,
      finalHealth: 10,
      config: { ...base.config, seed: "a", bot: "search" },
    },
    {
      ...base,
      finalHealth: 22,
      config: { ...base.config, seed: "b", bot: "search-tempo" },
    },
    {
      ...base,
      finalHealth: 18,
      config: { ...base.config, seed: "a", bot: "search-tempo" },
    },
    {
      ...base,
      finalHealth: 20,
      config: { ...base.config, seed: "b", bot: "search" },
    },
  ];
  const command = [
    "python3",
    "scripts/reports/lab-report.py",
    "--pair",
    "bot",
    "--control",
    "search",
    "--candidate",
    "search-tempo",
  ];
  const report = Bun.spawnSync(command, {
    stdin: Buffer.from(rows.map((r) => JSON.stringify(r)).join("\n")),
  });
  expect(report.exitCode).toBe(0);
  expect(report.stdout.toString()).toContain("2 matched pairs");
  expect(report.stdout.toString()).toContain("Mean HP delta 5.000");
  const duplicate = Bun.spawnSync(command, {
    stdin: Buffer.from(
      [...rows, rows[0]].map((r) => JSON.stringify(r)).join("\n"),
    ),
  });
  expect(duplicate.exitCode).not.toBe(0);
});
