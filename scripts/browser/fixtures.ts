import { newRun } from "../../src/game/engine/run";
import { generateRoute } from "../../src/game/engine/journey/route";
import { makeCard } from "../../src/game/engine/rewards";
import { makeEnemy } from "../../src/game/engine/combat/enemy";
import { startCombat } from "../../src/game/engine/combat/setup";
import { parseSave } from "../../src/game/validation/save";
import type { Run } from "../../src/game/model";
import { CARDS } from "../../src/game/content/cards";

// Isolated browser fixtures supplement, never replace, legal full-run tests.
const destination = process.argv[2] ?? "/tmp";
async function write(name: string, run: Run) {
  const text = JSON.stringify(run);
  if (parseSave(text).kind !== "valid") throw new Error(`Invalid ${name}`);
  await Bun.write(`${destination}/ember-${name}.json`, text);
}
const run = newRun("combat-study");
run.deck = [
  "guard",
  "double",
  "spark",
  "flame",
  "volley",
  "defiance",
  "unseen",
  "pass",
  "arrow",
  "challenge",
  "strike",
  "bread",
].map((id) => makeCard(run, id));
run.location = run.route[0]?.id ?? null;
run.row = 0;
run.visited = run.location ? [run.location] : [];
startCombat(run, "battle");
if (run.scene.kind !== "combat") throw new Error("Expected combat");
run.scene.hand = run.deck.slice(0, 10);
run.scene.draw = run.deck.slice(10);
run.scene.discard = [];
run.scene.exhaust = [];
run.scene.dread = 3;
run.scene.reaction = "reinforce";
const wolf = makeEnemy(run, "wolf");
wolf.hp = 40;
wolf.maxHp = 40;
wolf.block = 10;
run.scene.enemies = [wolf, makeEnemy(run, "sentinel"), makeEnemy(run, "soldier")];
await write("combat", run);
const defeat = structuredClone(run);
defeat.hp = 1;
await write("defeat", defeat);
for (const act of [0, 1, 2]) {
  const boss = newRun(`boss-study-${act}`);
  boss.act = act;
  boss.route = generateRoute(boss);
  boss.row = 5;
  boss.location = `${act}-5-1`;
  boss.visited = [boss.location];
  startCombat(boss, "boss");
  await write(`boss-${act}`, boss);
}
const victory = newRun("ending-study");
victory.act = 2;
victory.route = generateRoute(victory);
victory.row = 5;
victory.location = "2-5-1";
victory.visited = [victory.location];
victory.scene = { kind: "ending", won: true };
await write("victory", victory);
const shop = newRun("merchant-study");
const shopNode = shop.route.find((node) => node.kind === "shop");
if (!shopNode) throw new Error("Missing merchant");
shop.row = shopNode.row;
shop.location = shopNode.id;
shop.visited = [shopNode.id];
shop.gold = 180;
shop.hp = 33;
shop.scene = {
  kind: "shop",
  cards: ["inferno", "oath", "sunrise"],
  relic: "coal",
  healed: false,
  removed: false,
};
await write("shop", shop);
for (let index = 0; index < 8; index++) {
  const event = newRun(`event-study-${index}`);
  const node = event.route.find((node) => node.kind === "event");
  if (!node) throw new Error("Missing event");
  event.row = node.row;
  event.location = node.id;
  event.visited = [node.id];
  event.scene = { kind: "event", event: index, resolved: null };
  await write(`event-${index}`, event);
}
const gallery = newRun("card-art-study");
gallery.deck = CARDS.flatMap((def) => [
  makeCard(gallery, def.id),
  { ...makeCard(gallery, def.id), upgraded: true },
]);
await write("gallery", gallery);
console.log(`Wrote isolated fixtures to ${destination}`);
