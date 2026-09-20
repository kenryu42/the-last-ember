import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
  journeyLegalActions,
  journeyObservation,
  simulateJourney,
} from "../src/game/laboratory-journey";
import { newRun, resolve } from "../src/game/engine";
import { runSchema } from "../src/game/model";
import { parseSave } from "../src/game/storage";

test("public-only journey completes all stops and replays through canonical saves", () => {
  const result = simulateJourney("lab-journey-check:0", "strategic");
  expect(result.outcome).toBe("win");
  expect(result.stops).toBe(18);
  let run = newRun(result.seed);
  const scenes = new Set<string>();
  for (const action of result.trace) {
    scenes.add(run.scene.kind);
    expect(journeyLegalActions(run)).toContainEqual(action);
    const observation = JSON.stringify(journeyObservation(run));
    for (const field of ['"rng":', '"seed":', '"nextId":'])
      expect(observation).not.toContain(field);
    const full = resolve(run, action);
    expect(resolve(run, action, "adventure", { captureFrames: false })).toEqual(
      { ...full, frames: [] },
    );
    run = full.run;
    expect(parseSave(JSON.stringify(run)).kind).toBe("valid");
  }
  expect(run.scene).toEqual({ kind: "ending", won: true });
  expect(run.hp).toBe(result.hp);
  expect(journeyLegalActions(run)).toEqual([]);
  expect([...scenes]).toContain("camp");
  expect([...scenes]).toContain("reward");
});

test("shield-aware progression changes the first eligible reward, takes one payoff, and keeps the prior trace", () => {
  const seed = "shield-development:5";
  const control = simulateJourney(seed, "strategic", 96);
  const candidate = simulateJourney(seed, "strategic", 96, "shield-aware");
  const rewards = candidate.trace.filter(
    (a) => a.type === "reward" && a.card === "shield",
  );
  expect(rewards).toHaveLength(1);
  const first = candidate.trace.findIndex(
    (a) => a.type === "reward" && a.card === "shield",
  );
  expect(first).toBeGreaterThan(0);
  expect(control.trace.slice(0, first)).toEqual(
    candidate.trace.slice(0, first),
  );
  expect(control.trace[first]).not.toEqual(candidate.trace[first]);
  expect(candidate.decisions.some((d) => d.card === "shield")).toBe(true);
  expect(candidate.progression).toBe("shield-aware");
});

test("checkpoint CLI recognizes final-boss victory and rejects ambiguous policy records", () => {
  const result = simulateJourney("lab-journey-check:0", "strategic");
  const dir = mkdtempSync(join(tmpdir(), "lab-checkpoint-"));
  try {
    const path = join(dir, "journey.jsonl");
    const line = JSON.stringify(result) + "\n";
    writeFileSync(path, line);
    const command = [
      "bun",
      "scripts/lab-checkpoint.ts",
      path,
      result.seed,
      String(result.trace.length - 1),
      "strategic",
      "256",
    ];
    const replay = Bun.spawnSync(command);
    expect(replay.exitCode).toBe(0);
    const record = z
      .object({ outcome: z.string(), steps: z.array(z.unknown()) })
      .parse(JSON.parse(replay.stdout.toString()));
    expect(record.outcome).toBe("win");
    expect(record.steps.length).toBeGreaterThan(0);
    writeFileSync(path, line + line);
    const ambiguous = Bun.spawnSync(command);
    expect(ambiguous.exitCode).toBe(1);
    expect(ambiguous.stderr.toString()).toContain("Ambiguous seed");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("checkpoint CLI uses explicit experiment settings and rejects missing rules", () => {
  const run = newRun(
    "checkpoint-recurring",
    "recurring",
    {
      kind: "escape",
      target: 4,
      ember: true,
    },
    "hushed-coal",
  );
  const bearer = { type: "bearer", hero: "Eryn" } as const;
  const travel = { type: "travel", node: "0-0-1" } as const;
  const checkpoint = resolve(resolve(run, bearer).run, travel).run;
  expect(checkpoint.scene.kind).toBe("combat");
  const record = {
    seed: run.seed,
    dreadRules: run.dreadRules,
    prototype: run.prototype,
    startingRelic: "hushed-coal",
    trace: [bearer, travel, journeyLegalActions(checkpoint)[0]],
  };
  const dir = mkdtempSync(join(tmpdir(), "checkpoint-rules-"));
  try {
    const path = join(dir, "journey.jsonl");
    const command = [
      "bun",
      "scripts/lab-checkpoint.ts",
      path,
      run.seed,
      "2",
      "strategic",
      "256",
    ];
    writeFileSync(path, JSON.stringify(record) + "\n");
    const replay = Bun.spawnSync(command);
    expect(replay.exitCode).toBe(0);
    const result = z
      .object({ checkpoint: runSchema, outcome: z.string() })
      .parse(JSON.parse(replay.stdout.toString()));
    expect(result.checkpoint).toEqual(checkpoint);
    expect(result.outcome).not.toBe("timeout");
    const { dreadRules, ...missingRules } = record;
    writeFileSync(path, JSON.stringify(missingRules) + "\n");
    expect(Bun.spawnSync(command).exitCode).toBe(1);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("machine choices include every legal camp, shop and event selection", () => {
  const run = newRun("all-choices");
  run.scene = { kind: "camp", used: false };
  expect(journeyLegalActions(run)).toHaveLength(run.deck.length + 1);
  run.scene = {
    kind: "shop",
    cards: ["needle", null, "cinder"],
    relic: "coal",
    healed: false,
    removed: false,
  };
  run.gold = 0;
  expect(journeyLegalActions(run)).toEqual([{ type: "leave" }]);
  run.gold = 100;
  run.hp = 50;
  expect(journeyLegalActions(run)).toHaveLength(
    1 + 2 + 1 + 1 + run.deck.length,
  );
  for (let event = 0; event < 8; event++) {
    run.scene = { kind: "event", event, resolved: null };
    const actions = journeyLegalActions(run);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) expect(resolve(run, action).error).toBeNull();
  }
});

test("journey reports pair seeds and budgets, retain losses, and reject inconsistent records", () => {
  const row = (seed: string, budget: number, hp: number) => ({
    seed,
    bot: "search",
    budget,
    hp,
    outcome: hp ? "win" : "loss",
    planning: { engineCalls: 7, incompleteDecisions: 0 },
    decisions: [{ engineCalls: 7 }],
    trace: [{ type: "end" }],
    unusedEnergy: 2,
    generatorUnusedUpperBound: 1,
  });
  const rows = [
    row("b", 256, 20),
    row("a", 4096, 0),
    row("a", 256, 10),
    row("b", 4096, 24),
  ];
  const report = (records: typeof rows) =>
    Bun.spawnSync(["python3", "scripts/lab-report.py", "--journeys"], {
      stdin: Buffer.from(records.map((r) => JSON.stringify(r)).join("\n")),
    });
  const result = report(rows);
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain("2 pairs, 0 unmatched records");
  expect(result.stdout.toString()).toContain("Mean HP delta -3.00");
  expect(result.stdout.toString()).toContain(
    "Control-only/candidate-only wins: 1/0",
  );
  expect(report([...rows, row("a", 256, 10)]).exitCode).not.toBe(0);
  expect(
    report([{ ...row("a", 256, 10), decisions: [{ engineCalls: 8 }] }])
      .exitCode,
  ).not.toBe(0);
  const progressionRows = [
    row("a", 256, 10),
    { ...row("a", 256, 14), progression: "shield-aware" },
  ];
  const progressionReport = report(progressionRows);
  expect(progressionReport.exitCode).toBe(0);
  expect(progressionReport.stdout.toString()).toContain("Mean HP delta 4.00");
  expect(progressionReport.stdout.toString()).toContain(
    "search/256/shield-aware",
  );
});
