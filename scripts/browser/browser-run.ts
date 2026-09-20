import { z } from "zod";
import { cardDef, needsTarget } from "../../src/game/content/cards";
import { resolve } from "../../src/game/engine/resolve";
import type { Action, Run } from "../../src/game/model";
import { parseSave } from "../../src/game/validation/save";
import { journeyAction } from "../../tests/support/pilot";

// Drives the rendered controls, never writes game state. Start a journey in this
// named browser session first. Reads only this game's local save for assertions.
const session = process.argv[2] ?? "ember",
  max = Number(process.argv[3] ?? 1000);
const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({ result: z.unknown().optional() }).passthrough().optional(),
  error: z.unknown().optional(),
});
async function browser(...args: string[]) {
  const proc = Bun.spawn(
    ["agent-browser", "--session", session, "--restore", ...args, "--json"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const output = await new Response(proc.stdout).text(),
    error = await new Response(proc.stderr).text();
  if ((await proc.exited) !== 0)
    throw new Error(`${args.join(" ")}: ${error} ${output}`);
  const result = responseSchema.parse(JSON.parse(output));
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data?.result;
}
async function state(): Promise<Run> {
  const text = await browser(
    "eval",
    'localStorage.getItem("last-ember.run.v1")',
  );
  const parsed = parseSave(typeof text === "string" ? text : null);
  if (parsed.kind !== "valid") throw new Error("No valid browser run");
  return parsed.run;
}
async function click(selector: string) {
  // Coordinate-based clicks must wait for dialog/card entrance animations.
  // The engine result is committed before presentation, so a save alone is not
  // proof that the next control has reached its final position.
  await browser("scrollintoview", selector);
  await browser(
    "wait",
    "--fn",
    'document.getAnimations().every(a=>a.playState!=="running")',
  );
  await browser("click", selector);
}
async function textClick(text: string) {
  await browser(
    "wait",
    "--fn",
    `Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim().includes(${JSON.stringify(text)})&&!b.disabled)`,
  );
  await browser(
    "eval",
    `(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().includes(${JSON.stringify(text)})&&!b.disabled);if(!b)throw new Error('Missing button '+${JSON.stringify(text)});b.click()})()`,
  );
}
async function ui(action: Action, run: Run) {
  switch (action.type) {
    case "play": {
      await click(`.hand [data-card="${action.uid}"]`);
      const card = run.deck.find((c) => c.uid === action.uid);
      if (
        card &&
        needsTarget(cardDef(card.def)) &&
        run.scene.kind === "combat" &&
        run.scene.enemies.filter((enemy) => enemy.hp > 0).length > 1
      )
        await click(`[data-enemy="${action.target}"]`);
      break;
    }
    case "end":
      await click(".end-turn");
      break;
    case "travel":
      await click(`[data-node="${action.node}"]`);
      break;
    case "reward":
      if (action.card) await click(`.card-choices [data-def="${action.card}"]`);
      else await textClick("Skip card");
      break;
    case "leave":
      await textClick("Return to the road");
      break;
    case "rest":
      await textClick("Rest by the fire");
      break;
    case "choice":
      await browser(
        "eval",
        `document.querySelectorAll('.choice-list button')[${action.index}].click()`,
      );
      break;
    case "upgrade":
      await textClick("Prepare for tomorrow");
      await click(`dialog [data-card="${action.uid}"]`);
      await textClick("Confirm improvement");
      break;
    case "buy":
      if (action.item === "card")
        await click(`.shop-card [data-card="${action.index}"]`);
      else if (action.item === "heal") await textClick("A warming tonic");
      else if (action.item === "relic")
        await browser(
          "eval",
          `document.querySelector('.shop-services button').click()`,
        );
      else {
        await textClick("Travel lighter");
        await click(`dialog [data-card="${action.index}"]`);
        await textClick("Remove · 45 gold");
      }
      break;
  }
  await browser("wait", "--fn", '!document.querySelector("[aria-busy=true]")');
}
let run = await state(),
  count = 0;
const start = Date.now(),
  seen = new Set<string>();
while (run.scene.kind !== "ending" && count < max) {
  const scene = `${run.act + 1}:${run.row + 1}:${run.scene.kind}`;
  if (!seen.has(scene)) {
    seen.add(scene);
    console.log(
      `${scene} hp=${run.hp} deck=${run.deck.length} gold=${run.gold}`,
    );
  }
  const action = journeyAction(run),
    expected = resolve(run, action);
  if (expected.error) throw new Error(expected.error);
  await ui(action, run);
  run = await state();
  count++;
  if (JSON.stringify(run) !== JSON.stringify(expected.run))
    throw new Error(`Browser/engine mismatch after ${JSON.stringify(action)}`);
  if (count % 25 === 0)
    console.log(
      `Verified ${count} actions; ${Math.round((Date.now() - start) / 1000)}s elapsed`,
    );
}
console.log(
  JSON.stringify({
    seed: run.seed,
    scene: run.scene.kind,
    won: run.scene.kind === "ending" ? run.scene.won : null,
    count,
    seconds: Math.round((Date.now() - start) / 1000),
    hp: run.hp,
    visited: run.visited.length,
    stats: run.stats,
    seen: [...seen],
  }),
);
