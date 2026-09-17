import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { z } from "zod";
import { draw, resolve, shuffle } from "../src/game/engine";
import { startingRelicSchema } from "../src/game/model";
import {
  createHeadlessRun,
  observe,
  planV2,
} from "../src/game/playtest-headless";

const seeds = [
  ...Array.from({ length: 5 }, (_, i) => `block-study-v1:${i}`),
  process.argv[2] ?? crypto.randomUUID(),
];
const study = z
  .enum(["block", "concealment"])
  .parse(process.argv[3] ?? "block");
const cards =
  study === "block"
    ? ["shield", "break-formation"]
    : ["needle", "silence", "fading-strike"];
const rows = [];
for (const deck of ["quiet", "exposed", "defense"] as const)
  for (const encounter of ["fury", "escape"] as const)
    for (const relic of [null, ...startingRelicSchema.options])
      for (const weight of [1.5, 3])
        for (const seed of seeds)
          for (const card of cards) {
            let run = createHeadlessRun({
              fixture: { variant: "base", deckId: deck },
              encounterId: encounter,
              rules: "recurring",
              ember: true,
              seed,
              ...(relic ? { startingRelic: relic } : {}),
            });
            if (run.scene.kind !== "combat") throw new Error("Missing combat");
            const slot = run.deck[0];
            if (!slot) throw new Error("Missing card");
            slot.def = card;
            run.scene.draw = shuffle(run, run.deck);
            run.scene.hand = [];
            draw(run, run.scene, 5);
            const initial = structuredClone(run);
            const trace = [];
            for (
              let step = 0;
              step < 200 && run.scene.kind === "combat" && run.scene.turn <= 30;
              step++
            ) {
              const before = run.scene;
              const action = planV2(
                observe(run, "recurring"),
                `block-policy:${seed}:${step}`,
                256,
                weight,
              ).action;
              const selected =
                action.type === "play" || action.type === "work"
                  ? before.hand.find((c) => c.uid === action.uid)
                  : null;
              const result = resolve(run, action, "recurring", {
                captureFrames: false,
              });
              if (result.error) throw new Error(result.error);
              trace.push({
                turn: before.turn,
                block: before.block,
                energy: before.energy,
                dread: before.dread,
                hp: run.hp,
                action,
                card: selected?.def ?? null,
                hpAfter: result.run.hp,
                accounting: result.accounting,
                after: result.run.scene,
              });
              run = result.run;
            }
            rows.push({
              deck,
              encounter,
              relic,
              weight,
              seed,
              card,
              initial,
              trace,
              won: run.scene.kind === "ending" && run.scene.won,
              timeout: run.scene.kind === "combat",
              hp: run.hp,
              turns: run.stats.turns,
            });
          }
writeFileSync(
  `experiments/identity/${study}-study.jsonl.gz`,
  gzipSync(rows.map((r) => JSON.stringify(r)).join("\n") + "\n"),
);
process.stdout.write(
  JSON.stringify({
    seeds,
    runs: rows.length,
    wins: rows.filter((r) => r.won).length,
    timeouts: rows.filter((r) => r.timeout).length,
  }) + "\n",
);
