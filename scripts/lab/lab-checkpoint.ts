import { z } from "zod";
import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { assertInvariants } from "../../src/lab/simulation";
import { botSchema, labConfigSchema } from "../../src/lab/config";
import { selectAction } from "../../src/lab/policies/selection";
import { journeyLegalActions, journeyObservation } from "../../src/lab/journey";
import { legalActions } from "../../src/lab/legal-actions";
import { observe } from "../../src/lab/observation";
import { runSchema, startingRelicSchema } from "../../src/game/model";

// Offline diagnosis only. Policies still receive public observations, never the
// true saved state. Stop at this fight's end to eliminate progression confounding.
try {
  const [path, seed, index, bot, budget] = z
    .tuple([
      z.string(),
      z.string(),
      z.coerce.number().int().nonnegative(),
      botSchema,
      labConfigSchema.shape.searchBudget,
    ])
    .parse(process.argv.slice(2).map((v, i) => (i === 4 ? Number(v) : v)));
  const schema = z.object({
    seed: runSchema.shape.seed,
    dreadRules: runSchema.shape.dreadRules,
    prototype: runSchema.shape.prototype,
    startingRelic: startingRelicSchema.optional(),
    trace: z.array(z.unknown()),
  });
  const records = (await Bun.file(path).text())
    .trim()
    .split("\n")
    .map((line) => schema.parse(JSON.parse(line)));
  const matches = records.filter((r) => r.seed === seed);
  if (matches.length > 1) throw new Error("Ambiguous seed: provide a single policy arm");
  const record = matches[0];
  if (!record || index >= record.trace.length) throw new Error("Checkpoint not found");
  let run = newRun(seed, record.dreadRules, record.prototype, record.startingRelic);
  for (const raw of record.trace.slice(0, index)) {
    const action = journeyLegalActions(run).find((a) => JSON.stringify(a) === JSON.stringify(raw));
    if (!action) throw new Error("Illegal recorded action");
    const result = resolve(run, action);
    if (result.error) throw new Error(result.error);
    run = result.run;
    assertInvariants(run);
  }
  if (run.scene.kind !== "combat") throw new Error("Checkpoint is not in combat");
  const checkpoint = structuredClone(run);
  const steps = [];
  while (run.scene.kind === "combat" && steps.length < 500) {
    const observation = observe(run, run.dreadRules === "recurring" ? "recurring" : "control");
    const legal = legalActions(observation);
    const action = selectAction(
      observation,
      legal,
      bot,
      `journey-policy:${seed}:${index + steps.length}`,
      budget,
    );
    if (!legal.some((a) => JSON.stringify(a) === JSON.stringify(action)))
      throw new Error("Illegal bot action");
    const result = resolve(run, action);
    if (result.error) throw new Error(result.error);
    assertInvariants(result.run);
    steps.push({
      before: journeyObservation(run),
      legal,
      action,
      after: journeyObservation(result.run),
    });
    run = result.run;
  }
  process.stdout.write(
    JSON.stringify({
      seed,
      index,
      bot,
      budget,
      checkpoint,
      outcome:
        run.scene.kind === "reward" || (run.scene.kind === "ending" && run.scene.won)
          ? "win"
          : run.scene.kind === "ending"
            ? "loss"
            : "timeout",
      hp: run.hp,
      steps,
    }) + "\n",
  );
} catch (error) {
  process.stderr.write(
    String(error) +
      "\nUsage: bun scripts/lab/lab-checkpoint.ts <journey.jsonl> <exact-seed> <action-index> <bot> <budget>\n",
  );
  process.exitCode = 1;
}
