import { newRun } from "../../src/game/engine/run";
import { resolve } from "../../src/game/engine/resolve";
import { parseSave } from "../../src/game/validation/save";
import { journeyAction } from "../../tests/support/pilot";
const seeds = process.argv.slice(2);
for (const seed of seeds.length ? seeds : ["lantern", "briar", "warmth", "beacon", "home"]) {
  let run = newRun(seed),
    actions = 0;
  while (run.scene.kind !== "ending" && actions < 2000) {
    const action = journeyAction(run),
      result = resolve(run, action);
    if (result.error) throw new Error(result.error);
    run = result.run;
    actions++;
    if (parseSave(JSON.stringify(run)).kind !== "valid")
      throw new Error(`Save invalid after ${JSON.stringify(action)}`);
  }
  console.log(
    JSON.stringify({
      seed,
      ending: run.scene.kind === "ending" ? (run.scene.won ? "win" : "loss") : "timeout",
      act: run.act + 1,
      hp: run.hp,
      actions,
      deck: run.deck.length,
      relics: run.relics,
      stats: run.stats,
    }),
  );
}
