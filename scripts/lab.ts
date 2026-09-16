import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { z } from "zod";
import {
  labConfigSchema,
  simulate as simulateGame,
  summarizeLab,
} from "../src/game/laboratory";
import {
  PLAYTEST_DECKS,
  PLAYTEST_ENCOUNTERS,
} from "../src/game/playtest-fixtures";
import {
  progressionSchema,
  simulateJourney,
} from "../src/game/laboratory-journey";

const write = (x: unknown) => process.stdout.write(JSON.stringify(x) + "\n");
function simulate(
  config: Parameters<typeof simulateGame>[0],
  detailed = false,
) {
  try {
    return simulateGame(config, detailed);
  } catch (error) {
    // Preserve the complete reproducer before stopping a campaign on an engine failure.
    write({ version: "lab-1", config, outcome: "error", error: String(error) });
    throw error;
  }
}
try {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      games: { type: "string", default: "100" },
      seed: { type: "string", default: "lab-heldout" },
      deck: { type: "string", default: "exposed" },
      encounter: { type: "string", default: "fury" },
      bot: { type: "string", default: "search" },
      rules: { type: "string", default: "control" },
      variant: { type: "string", default: "base" },
      budget: { type: "string", default: "256" },
      progression: { type: "string", default: "static" },
      suite: { type: "string", default: "smoke" },
      quiet: { type: "boolean", default: false },
    },
  });
  const command = positionals[0];
  if (command !== "journey" && values.progression !== "static")
    throw new Error("--progression applies only to journey simulations");
  const count = z.coerce.number().int().min(1).max(1000000).parse(values.games);
  const config = (i: number, extra = {}) =>
    labConfigSchema.parse({
      rules: values.rules,
      fixture: { deckId: values.deck, variant: values.variant },
      encounterId: values.encounter,
      bot: values.bot,
      seed: `${values.seed}:${i}`,
      planningSeed: `policy:${values.seed}:${i}`,
      searchBudget: Number(values.budget),
      ...extra,
    });
  if (command === "journey") {
    if (values.rules !== "control")
      throw new Error(
        "Journey simulations use adventure rules; --rules candidate is benchmark-only",
      );
    const progression = progressionSchema.parse(values.progression);
    for (let i = 0; i < count; i++) {
      const c = config(i);
      try {
        write(simulateJourney(c.seed, c.bot, c.searchBudget, progression));
      } catch (error) {
        write({
          seed: c.seed,
          bot: c.bot,
          budget: c.searchBudget,
          progression,
          outcome: "error",
          error: String(error),
        });
        throw error;
      }
    }
  } else if (command === "simulate") {
    for (let i = 0; i < count; i++) write(simulate(config(i)));
  } else if (command === "replay") {
    write(
      simulate(
        config(0, { seed: values.seed, planningSeed: `policy:${values.seed}` }),
        true,
      ),
    );
  } else if (command === "analyze") {
    // Validate persisted metrics at the file boundary, retaining only report inputs.
    const rowSchema = z.object({
      config: labConfigSchema,
      outcome: z.enum(["win", "loss", "timeout"]),
      finalHealth: z.number(),
      turns: z.number(),
      actions: z.number(),
      nonGameSignal: z.boolean(),
      comeback: z.boolean(),
      repeatedState: z.boolean(),
      spent: z.number(),
      generated: z.number(),
      unused: z.number(),
      blocked: z.number(),
      forcedPassTurns: z.number(),
      history: z.array(z.object({ legal: z.number() })),
    });
    const rows = [];
    for await (const line of createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    }))
      rows.push(rowSchema.parse(JSON.parse(line)));
    write(summarizeLab(rows));
  } else if (command === "suite") {
    const suite = z
      .enum([
        "smoke",
        "balance",
        "stress",
        "exploit",
        "regression",
        "experiments",
      ])
      .parse(values.suite);
    const bots =
      suite === "stress"
        ? ["random"]
        : suite === "exploit"
          ? ["stall", "resource", "burst"]
          : suite === "balance"
            ? ["random", "greedy", "strategic", "search"]
            : [values.bot];
    for (const deck of PLAYTEST_DECKS)
      for (const encounter of PLAYTEST_ENCOUNTERS)
        for (const bot of bots) {
          for (let i = 0; i < count; i++) {
            const base = config(i, {
              fixture: { deckId: deck.id, variant: "base" },
              encounterId: encounter.id,
              bot,
            });
            const configs =
              suite === "experiments"
                ? [
                    base,
                    ...(deck.id === "quiet"
                      ? []
                      : [
                          {
                            ...base,
                            fixture: { deckId: deck.id, variant: "ablation" },
                          },
                        ]),
                    ...(deck.id === "exposed"
                      ? [
                          {
                            ...base,
                            fixture: {
                              deckId: "exposed",
                              variant: "diagnostic-mixed",
                            },
                          },
                          {
                            ...base,
                            rules: "candidate",
                            fixture: {
                              deckId: "exposed",
                              variant: "diagnostic-mixed",
                            },
                          },
                        ]
                      : []),
                  ].map((c) => labConfigSchema.parse(c))
                : [base];
            for (const c of configs) {
              const result = simulate(c);
              if (suite === "regression") {
                const replay = simulate(c);
                if (JSON.stringify(replay) !== JSON.stringify(result))
                  throw new Error(`Nondeterministic seed ${c.seed}`);
              }
              write(result);
            }
          }
          if (!values.quiet)
            process.stderr.write(
              `${suite}: ${deck.id}/${encounter.id}/${bot} completed\n`,
            );
        }
  } else
    throw new Error(
      "Usage: bun scripts/lab.ts simulate|journey|suite|analyze|replay [--games N --seed S --deck quiet|exposed|defense --encounter fury|reinforce|ward --bot random|greedy|strategic|search|search-tempo|rollout-one|search-two|search-sequence|search-material|burst|stall|resource --budget 1..32768 --progression static|shield-aware --suite smoke|balance|stress|exploit|regression|experiments --quiet]",
    );
} catch (error) {
  process.stderr.write(
    JSON.stringify({
      outcome: "error",
      error: error instanceof Error ? error.message : String(error),
    }) + "\n",
  );
  process.exitCode = 1;
}
