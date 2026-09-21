import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { z } from "zod";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { progressionSchema, simulateJourney } from "../../src/lab/journey";
import { labConfigSchema } from "../../src/lab/config";
import { simulate } from "../../src/lab/simulation";
import { PLAYTEST_DECKS, PLAYTEST_ENCOUNTERS } from "../../src/lab/fixtures/combat";
import type { Action, Frame, Resolution, Run } from "../../src/game/model";
import { startingRelicSchema } from "../../src/game/model";

// Omit the seed prefix for fresh entropy. Persist it so every run remains replayable.
const label = z
  .enum([
    "baseline",
    "recurring",
    "escape",
    "escape-v2",
    "bearer",
    "bearer-v2",
    "branches",
    "conversion",
    "concealment",
    "late-escape",
  ])
  .parse(process.argv[2]);
const prefix = process.argv[3] ?? crypto.randomUUID();
const count = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .parse(process.argv[4] ?? 10);
const startingRelic = startingRelicSchema.optional().parse(process.argv[5]);
const progression = progressionSchema.parse(process.argv[6] ?? "static");
const recordedLabel = `${label}${startingRelic ? `-${startingRelic}` : ""}${progression === "static" ? "" : `-${progression}`}`;
const bots = ["resource", "conservative", "search", "search-tempo", "strategic"] as const;
type Row =
  | ({
      kind: "journey";
      label: string;
      finalDeck: Run["deck"];
      relics: string[];
      history: {
        before: Run;
        action: Action;
        frames: Frame[];
        after: Run;
        accounting: Resolution["accounting"];
      }[];
    } & ReturnType<typeof simulateJourney>)
  | ({ kind: "fight"; label: string } & ReturnType<typeof simulate>);
const rows: Row[] = [];
for (const bot of bots) {
  for (let i = 0; i < count; i++) {
    const seed = `${prefix}:${i}`;
    const rules = label === "baseline" ? "original" : "recurring";
    const prototype: Run["prototype"] =
      label.startsWith("escape") ||
      label.startsWith("bearer") ||
      label === "branches" ||
      label === "conversion" ||
      label === "concealment" ||
      label === "late-escape"
        ? {
            kind: "escape",
            target: label === "escape" ? 6 : 4,
            ...(label.startsWith("bearer") ||
            label === "branches" ||
            label === "conversion" ||
            label === "concealment" ||
            label === "late-escape"
              ? { ember: true }
              : {}),
            ...(label === "branches" ||
            label === "conversion" ||
            label === "concealment" ||
            label === "late-escape"
              ? { branchUpgrades: true }
              : {}),
            ...(label === "conversion" || label === "concealment" || label === "late-escape"
              ? { blockConversion: true }
              : {}),
            ...(label === "concealment" || label === "late-escape" ? { concealment: true } : {}),
            ...(label === "late-escape" ? { escapeAct: 1 } : {}),
          }
        : undefined;
    const journey = simulateJourney(seed, bot, 256, progression, rules, prototype, startingRelic);
    let run = newRun(seed, rules, prototype, startingRelic);
    const history = journey.trace.map((action) => {
      const before = run;
      const result = resolve(run, action);
      if (result.error) throw new Error(result.error);
      run = result.run;
      return {
        before,
        action,
        frames: result.frames,
        after: run,
        accounting: result.accounting,
      };
    });
    rows.push({
      kind: "journey",
      label: recordedLabel,
      ...journey,
      finalDeck: run.deck,
      relics: run.relics,
      history,
    });
    if (progression !== "static") continue; // Acquisition changes do not affect fixed-deck fights.
    for (const deck of PLAYTEST_DECKS) {
      for (const encounter of [...PLAYTEST_ENCOUNTERS, ...(prototype ? [{ id: "escape" }] : [])]) {
        const config = labConfigSchema.parse({
          seed,
          planningSeed: `identity-policy:${seed}`,
          bot,
          rules: label === "baseline" ? "control" : "recurring",
          fixture: { variant: "base", deckId: deck.id },
          encounterId: encounter.id,
          searchBudget: 256,
          ...(encounter.id === "escape" ? { objectiveTarget: prototype?.target } : {}),
          ...(prototype?.ember ? { ember: true } : {}),
          ...(startingRelic ? { startingRelic } : {}),
        });
        rows.push({
          kind: "fight",
          label: recordedLabel,
          ...simulate(config, true),
        });
      }
    }
  }
  process.stderr.write(`${label}: ${bot} complete\n`);
}
mkdirSync("artifacts/identity", { recursive: true });
const path = `artifacts/identity/${recordedLabel}-${prefix.replaceAll(/[^a-zA-Z0-9_-]/g, "_")}`;
writeFileSync(`${path}.jsonl.gz`, gzipSync(rows.map((r) => JSON.stringify(r)).join("\n") + "\n"));
const summary = bots.flatMap((bot) =>
  (progression === "static" ? ["journey", "fight"] : ["journey"]).map((kind) => {
    const selected = rows.filter(
      (r) => r.kind === kind && ("bot" in r ? r.bot : r.config.bot) === bot,
    );
    return {
      bot,
      kind,
      runs: selected.length,
      wins: selected.filter((r) => r.outcome === "win").length,
      losses: selected.filter((r) => r.outcome === "loss").length,
      timeouts: selected.filter((r) => r.outcome === "timeout").length,
      meanHealth:
        selected.reduce((n, r) => n + ("hp" in r ? r.hp : r.finalHealth), 0) / selected.length,
      meanTurns:
        selected.reduce((n, r) => n + ("stats" in r ? r.stats.turns : r.turns), 0) /
        selected.length,
    };
  }),
);
writeFileSync(
  `${path}.json`,
  JSON.stringify(
    {
      label: recordedLabel,
      prefix,
      count,
      progression,
      startingRelic,
      summary,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(JSON.stringify({ path, summary }, null, 2) + "\n");
