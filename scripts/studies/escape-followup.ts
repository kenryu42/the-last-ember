import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { z } from "zod";
import { resolve } from "../../src/game/engine/resolve";
import { startingRelicSchema } from "../../src/game/model";
import type { CombatAction, Run, StartingRelic } from "../../src/game/model";
import { chooseAction, planV2 } from "../../src/lab/policies/planner";
import { createHeadlessRun } from "../../src/lab/fixtures/headless";
import { legalActions } from "../../src/lab/legal-actions";
import { observe } from "../../src/lab/observation";

const count = z.coerce
  .number()
  .int()
  .min(20)
  .max(100)
  .parse(process.argv[2] ?? 24);
const freshSeed = process.argv[3] ?? crypto.randomUUID();
const prefix = "escape-followup-heldout-v1";
const seeds = [
  ...Array.from({ length: count }, (_, index) => `${prefix}:${index}`),
  `fresh:${freshSeed}`,
];
const planners = ["work-first", "threat-first", "health-weighted", "fast-kill"] as const;
type Planner = (typeof planners)[number];
const relics = [null, ...startingRelicSchema.options] as const;
const deckIds = ["quiet", "exposed", "defense"] as const;
const targets = [4, 5] as const;

function selectAction(run: Run, planner: Planner, planningSeed: string): CombatAction {
  const observation = observe(run, "recurring");
  const legal = legalActions(observation);
  if (planner === "work-first") {
    const work = legal.find((action) => action.type === "work");
    if (work) return work;
    return planV2(observation, planningSeed, 256, 3).action;
  }
  if (planner === "health-weighted") return planV2(observation, planningSeed, 256, 8).action;
  const combatOnly =
    observation.kind === "combat"
      ? { ...observation, objective: null, victoryCondition: "kill-all" }
      : observation;
  return chooseAction(
    combatOnly,
    planner === "threat-first" ? "defense" : "offense",
    planningSeed,
    256,
  );
}

function simulateOne({
  target,
  deckId,
  relic,
  seed,
  planner,
}: {
  target: (typeof targets)[number];
  deckId: (typeof deckIds)[number];
  relic: StartingRelic | null;
  seed: string;
  planner: Planner;
}) {
  let run = createHeadlessRun({
    fixture: { variant: "base", deckId },
    encounterId: "escape",
    objectiveTarget: target,
    rules: "recurring",
    seed,
    ...(relic ? { startingRelic: relic } : {}),
  });
  const opening = structuredClone(run);
  const log: {
    step: number;
    turn: number;
    hp: number;
    energy: number;
    block: number;
    dread: number;
    progress: number | null;
    livingEnemies: number;
    action: CombatAction;
    frames: { cue: string; target: number | "party" | null; text: string }[];
    hpAfter: number;
  }[] = [];
  let work = 0;
  let lastLivingEnemies = 0;
  let lastProgress = 0;
  for (let step = 0; step < 400 && run.scene.kind === "combat"; step++) {
    const scene = run.scene;
    lastLivingEnemies = scene.enemies.filter((enemy) => enemy.hp > 0).length;
    lastProgress = scene.objective?.progress ?? 0;
    const action = selectAction(
      run,
      planner,
      `escape-followup-policy:${seed}:${target}:${deckId}:${relic ?? "none"}:${planner}:${step}`,
    );
    if (action.type === "work") work++;
    const result = resolve(run, action, "recurring");
    if (result.error) throw new Error(result.error);
    log.push({
      step,
      turn: scene.turn,
      hp: run.hp,
      energy: scene.energy,
      block: scene.block,
      dread: scene.dread,
      progress: scene.objective?.progress ?? null,
      livingEnemies: lastLivingEnemies,
      action,
      frames: result.frames.map((frame) => ({
        cue: frame.cue,
        target: frame.target,
        text: frame.text,
      })),
      hpAfter: result.run.hp,
    });
    // Final combat snapshots include the killing hit; pre-action counts do not.
    const finalCombat = result.frames
      .map((frame) => frame.run.scene)
      .filter((s) => s.kind === "combat")
      .at(-1);
    if (finalCombat?.kind === "combat") {
      lastLivingEnemies = finalCombat.enemies.filter((enemy) => enemy.hp > 0).length;
      lastProgress = finalCombat.objective?.progress ?? 0;
    }
    run = result.run;
  }
  const won = run.scene.kind === "ending" && run.scene.won;
  return {
    target,
    deckId,
    relic,
    seed,
    entropy: seed.startsWith("fresh:"),
    planner,
    opening,
    outcome: won ? "win" : run.scene.kind === "combat" ? "timeout" : "loss",
    hp: run.hp,
    turns: run.stats.turns,
    work,
    progress: won ? target : lastProgress,
    livingEnemies: won ? lastLivingEnemies : 0,
    trace: log,
  };
}

const rows: ReturnType<typeof simulateOne>[] = [];
for (const target of targets)
  for (const deckId of deckIds)
    for (const relic of relics)
      for (const seed of seeds)
        for (const planner of planners) {
          rows.push(simulateOne({ target, deckId, relic, seed, planner }));
        }

type Row = (typeof rows)[number];
function mean(rows: Row[], value: (row: Row) => number) {
  return rows.reduce((sum, row) => sum + value(row), 0) / rows.length;
}
function utility(row: Row) {
  return {
    win: row.outcome === "win" ? 1 : 0,
    hp: row.hp,
    turns: row.turns,
  };
}
function dominates(left: Row, right: Row) {
  const a = utility(left);
  const b = utility(right);
  const noWorse = a.win >= b.win && a.hp >= b.hp && a.turns <= b.turns;
  const better = a.win > b.win || a.hp > b.hp || a.turns < b.turns;
  return noWorse && better;
}

const cells = targets.flatMap((target) =>
  relics.flatMap((relic) =>
    planners.map((planner) => {
      const selected = rows.filter(
        (row) => row.target === target && row.relic === relic && row.planner === planner,
      );
      return {
        target,
        relic,
        planner,
        runs: selected.length,
        wins: selected.filter((row) => row.outcome === "win").length,
        meanHp: mean(selected, (row) => row.hp),
        meanTurns: mean(selected, (row) => row.turns),
        meanWork: mean(selected, (row) => row.work),
        meanLivingEnemies: mean(selected, (row) => row.livingEnemies),
      };
    }),
  ),
);
const comparisons = targets.flatMap((target) =>
  relics.flatMap((relic) =>
    planners
      .filter((planner) => planner !== "work-first")
      .map((planner) => {
        const rush = rows.filter(
          (row) => row.target === target && row.relic === relic && row.planner === "work-first",
        );
        const alternatives = rows.filter(
          (row) => row.target === target && row.relic === relic && row.planner === planner,
        );
        const pairs = rush.flatMap((left) => {
          const right = alternatives.find(
            (candidate) => candidate.seed === left.seed && candidate.deckId === left.deckId,
          );
          return right ? [{ left, right }] : [];
        });
        return {
          target,
          relic,
          alternative: planner,
          pairs: pairs.length,
          rushDominates: pairs.filter(({ left, right }) => dominates(left, right)).length,
          alternativeDominates: pairs.filter(({ left, right }) => dominates(right, left)).length,
          incomparableOrEqual: pairs.filter(
            ({ left, right }) => !dominates(left, right) && !dominates(right, left),
          ).length,
        };
      }),
  ),
);

mkdirSync("artifacts/identity", { recursive: true });
const base = `artifacts/identity/escape-followup-${freshSeed.replaceAll(/[^a-zA-Z0-9_-]/g, "_")}`;
writeFileSync(
  `${base}.jsonl.gz`,
  gzipSync(rows.map((row) => JSON.stringify(row)).join("\n") + "\n"),
);
writeFileSync(
  `${base}.json`,
  JSON.stringify(
    {
      method: {
        rules: "recurring",
        encounter: "escape",
        decks: deckIds,
        targets,
        planners: {
          "work-first":
            "Take the first legal Work action; otherwise use planV2 at health weight 3.",
          "threat-first":
            "Public one-step defense policy with Work removed from its candidate actions.",
          "health-weighted": "Public planV2 at health weight 8 and budget 256.",
          "fast-kill":
            "Public one-step offense policy with Work removed from its candidate actions.",
        },
        pareto:
          "Win and HP are maximized; turn ends are minimized. Surviving enemies after escape have no utility cost. Work and surviving enemies are reported only.",
      },
      prefix,
      freshSeed,
      seeds,
      rows: rows.length,
      cells,
      comparisons,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  JSON.stringify({ base, rows: rows.length, cells, comparisons }, null, 2) + "\n",
);
