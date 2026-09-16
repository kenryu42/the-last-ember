import { parseArgs } from "node:util";
import { z } from "zod";
import { probeChain } from "../src/game/laboratory-chains";
import { configSchema } from "../src/game/playtest-headless";

try {
  const { values } = parseArgs({
    options: {
      games: { type: "string", default: "1000" },
      seed: { type: "string", default: "lab-chains-v1" },
      turns: { type: "string", default: "1" },
      encounter: { type: "string", default: "ward" },
    },
  });
  const games = z.coerce.number().int().min(1).max(1000000).parse(values.games);
  const turnLimit = z.coerce.number().int().min(1).max(100).parse(values.turns);
  const encounterId = configSchema.shape.encounterId.parse(values.encounter);
  for (let i = 0; i < games; i++) {
    const seed = `${values.seed}:${i}`,
      copies = i % 2 ? 3 : 1,
      upgraded = i % 4 >= 2;
    try {
      process.stdout.write(
        JSON.stringify(
          probeChain(seed, copies, upgraded, { turnLimit, encounterId }),
        ) + "\n",
      );
    } catch (error) {
      process.stdout.write(
        JSON.stringify({
          seed,
          copies,
          upgraded,
          turnLimit,
          encounterId,
          outcome: "error",
          error: String(error),
        }) + "\n",
      );
      throw error;
    }
  }
} catch (error) {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
}
