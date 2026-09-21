import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { z } from "zod";
import { FADING_STRIKE } from "../../src/game/content/cards";
import { evaluateRewards } from "../../src/lab/journey";
import { runSchema } from "../../src/game/model";

const rowSchema = z.object({
  seed: z.string(),
  bot: z.string(),
  history: z.array(z.object({ before: runSchema })),
  rewardEvaluations: z.array(
    z.object({
      index: z.number().int(),
      alternatives: z.array(z.object({ card: z.string().nullable(), utility: z.number() })),
    }),
  ),
});
const fresh = z.string().min(1).parse(process.argv[2]);
const effect = FADING_STRIKE.effects.find((e) => e.kind === "precision");
if (!effect) throw new Error("Missing precision effect");
const original = effect.amount;
const results = [];
try {
  for (const prefix of ["concealment-v1", fresh]) {
    for (const relic of ["shieldfire", "hushed-coal", "black-lantern"]) {
      const file = `experiments/identity/concealment-${relic}-sampled-${prefix}.jsonl.gz`;
      for (const line of gunzipSync(readFileSync(file)).toString().trim().split("\n")) {
        const row = rowSchema.parse(JSON.parse(line));
        for (const decision of row.rewardEvaluations) {
          if (!decision.alternatives.some((a) => a.card === FADING_STRIKE.id)) continue;
          const context = row.history[decision.index]?.before;
          if (context?.scene.kind !== "reward") throw new Error("Missing reward context");
          const variants = [];
          for (const base of [4, 5, 6]) {
            // Isolated single-process balance probe. Restore content before exit.
            effect.amount = base;
            const alternatives = evaluateRewards(context, context.scene.cards);
            if (
              base === 4 &&
              alternatives.some((a, i) => a.utility !== decision.alternatives[i]?.utility)
            )
              throw new Error("Baseline evaluator drift");
            variants.push({ base, alternatives });
          }
          results.push({
            seed: row.seed,
            bot: row.bot,
            relic,
            index: decision.index,
            context,
            variants,
          });
        }
      }
    }
  }
} finally {
  effect.amount = original;
}
mkdirSync("artifacts/identity", { recursive: true });
writeFileSync(
  "artifacts/identity/fading-tuning.jsonl.gz",
  gzipSync(results.map((r) => JSON.stringify(r)).join("\n") + "\n"),
);
for (const base of [4, 5, 6]) {
  let beatsSkip = 0,
    best = 0,
    trials = 0,
    timeouts = 0;
  for (const row of results) {
    const variant = row.variants.find((v) => v.base === base);
    const candidate = variant?.alternatives.find((a) => a.card === FADING_STRIKE.id);
    const skip = variant?.alternatives.find((a) => a.card === null);
    if (!variant || !candidate || !skip) throw new Error("Missing variant");
    beatsSkip += Number(candidate.utility > skip.utility);
    best += Number(
      variant.alternatives.reduce((a, b) => (b.utility > a.utility ? b : a)).card ===
        FADING_STRIKE.id,
    );
    for (const option of variant.alternatives) {
      trials += option.trials.length;
      timeouts += option.trials.filter((t) => t.timeout).length;
    }
  }
  process.stdout.write(
    JSON.stringify({
      base,
      offers: results.length,
      beatsSkip,
      best,
      trials,
      timeouts,
    }) + "\n",
  );
}
