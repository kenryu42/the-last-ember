import { z } from "zod";
import type { Run } from "../../game/model";
const historySchema = z.array(
  z.object({
    seed: z.string(),
    won: z.boolean(),
    act: z.number(),
    turns: z.number(),
    cards: z.number(),
    time: z.string(),
  }),
);
export type History = z.infer<typeof historySchema>;
export function loadHistory(): History {
  try {
    const parsed = historySchema.safeParse(
      JSON.parse(localStorage.getItem("last-ember.history") ?? "[]"),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
export function recordEnding(run: Run) {
  if (run.scene.kind !== "ending") return;
  try {
    const history = loadHistory();
    history.unshift({
      seed: run.seed,
      won: run.scene.won,
      act: run.act,
      turns: run.stats.turns,
      cards: run.stats.cards,
      time: new Date().toISOString(),
    });
    localStorage.setItem("last-ember.history", JSON.stringify(history.slice(0, 20)));
  } catch {
    /* History must not interrupt the ending. */
  }
}
