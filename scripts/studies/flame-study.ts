import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { draw } from "../../src/game/engine/combat/setup";
import { makeCard } from "../../src/game/engine/rewards";
import { resolve } from "../../src/game/engine/resolve";
import { shuffle } from "../../src/game/engine/rng";
import { heroSchema, startingRelicSchema } from "../../src/game/model";
import { createHeadlessRun } from "../../src/lab/fixtures/headless";
import { observe } from "../../src/lab/observation";
import { planV2 } from "../../src/lab/policies/planner";

const seeds = ["flame-branches-v1", process.argv[2] ?? crypto.randomUUID()];
const results = [];
for (const formation of ["solo", "group", "escape"] as const)
  for (const dread of [0, 6, 9])
    for (const hero of heroSchema.options)
      for (const relic of [null, ...startingRelicSchema.options])
        for (const seed of seeds)
          for (const branch of ["flame", "veiled-flame", "wildfire"]) {
            let run = createHeadlessRun({
              fixture: { variant: "base", deckId: "quiet" },
              encounterId: formation === "escape" ? "escape" : "fury",
              rules: "recurring",
              seed,
              ember: true,
              ...(relic ? { startingRelic: relic } : {}),
            });
            if (run.scene.kind !== "combat")
              throw new Error("Missing encounter");
            const c = run.scene;
            run.deck = [
              branch,
              "cinder",
              "unseen",
              "needle",
              "guard",
              "pass",
              branch,
              "silence",
              "resolve",
              "arrow",
              "bread",
              "spark",
            ].map((id) => ({ ...makeCard(run, id), upgraded: id === branch }));
            c.draw = shuffle(run, run.deck);
            c.hand = [];
            draw(run, c, 5);
            c.dread = dread;
            c.turn = 2;
            run.actBearer = hero;
            c.ember = { bearer: hero, window: "closed", used: false };
            if (formation === "solo") c.enemies = c.enemies.slice(0, 1);
            const initial = structuredClone(run);
            const trace = [];
            for (
              let step = 0;
              step < 160 && run.scene.kind === "combat" && run.scene.turn < 30;
              step++
            ) {
              const plan = planV2(
                observe(run, "recurring"),
                `branch-policy:${seed}:${step}`,
                256,
              );
              const result = resolve(run, plan.action, "recurring", {
                captureFrames: false,
              });
              if (result.error) throw new Error(result.error);
              trace.push(plan.action);
              run = result.run;
            }
            results.push({
              formation,
              dread,
              hero,
              relic,
              seed,
              branch,
              initial,
              trace,
              won: run.scene.kind === "ending" && run.scene.won,
              timeout: run.scene.kind === "combat",
              hp: run.hp,
              turns: run.stats.turns,
              cardsPlayed: run.stats.cards,
              damage: run.stats.damage,
            });
          }
mkdirSync("artifacts/identity", { recursive: true });
writeFileSync(
  "artifacts/identity/flame-branches.jsonl.gz",
  gzipSync(results.map((r) => JSON.stringify(r)).join("\n") + "\n"),
);
process.stdout.write(
  JSON.stringify({
    seeds,
    fights: results.length,
    wins: results.filter((r) => r.won).length,
    timeouts: results.filter((r) => r.timeout).length,
  }) + "\n",
);
