import { z } from "zod";
import { combatActionSchema } from "../game/model";
import { configSchema } from "./headless-config";
import { HeadlessFight } from "./runner";
const commandSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("start"), config: configSchema }),
  z.strictObject({ op: z.literal("observe") }),
  z.strictObject({ op: z.literal("legal") }),
  z.strictObject({ op: z.literal("step"), action: combatActionSchema }),
  z.strictObject({ op: z.literal("result") }),
]);
export class PlaytestProtocol {
  private fight: HeadlessFight | null = null;
  handle(input: unknown): unknown {
    try {
      const command = commandSchema.parse(input);
      if (command.op === "start") {
        const next = new HeadlessFight(command.config);
        this.fight = next;
        return { ok: true, ...next.view() };
      }
      if (!this.fight) throw new Error("Start a fight first");
      switch (command.op) {
        case "observe":
          return { ok: true, ...this.fight.view() };
        case "legal":
          return { ok: true, legalActions: this.fight.view().legalActions };
        case "step":
          return { ok: true, ...this.fight.step(command.action) };
        case "result":
          return { ok: true, result: this.fight.result() };
      }
    } catch (error) {
      return {
        ok: false,
        outcome: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
