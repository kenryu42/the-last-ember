import { makeEnemy } from "./enemy";
import { ACTS } from "../../content/world";
import { enemyDef } from "../../content/enemies";
import type { EnemyKind } from "../../content/enemies";
import type { Combat, Run } from "../../model";
import { shuffle, pick } from "../rng";
import { has } from "../rewards";
import { configureEscape } from "./escape";
export function draw(run: Run, combat: Combat, count: number) {
  for (let i = 0; i < count && combat.hand.length < 10; i++) {
    if (!combat.draw.length) {
      combat.draw = shuffle(run, combat.discard);
      combat.discard = [];
    }
    const card = combat.draw.pop();
    if (!card) break;
    combat.hand.push(card);
  }
}
export function startCombat(run: Run, type: Combat["type"]) {
  const normal: EnemyKind[][][] = [
    [["wolf", "crow"], ["raider"], ["stag"], ["wolf", "wolf"]],
    [
      ["soldier", "shade"],
      ["sentinel"],
      ["raider", "crow"],
      ["shade", "shade"],
    ],
    [
      ["wraith", "crow"],
      ["sentinel", "shade"],
      ["wraith", "soldier"],
    ],
  ];
  const elites: EnemyKind[][] = [
    ["stag", "wolf"],
    ["sentinel", "soldier"],
    ["wraith", "wraith", "crow"],
  ];
  const act = ACTS[run.act] ?? ACTS[0];
  if (!act) throw new Error("Missing act");
  const kinds: EnemyKind[] =
    type === "boss"
      ? [act.boss]
      : type === "elite"
        ? (elites[run.act] ?? ["wolf"])
        : pick(run, normal[run.act] ?? [["wolf"]]);
  const reaction = kinds.some((k) =>
    ["soldier", "raider", "marshal", "roots"].includes(k),
  )
    ? "reinforce"
    : kinds.some((k) => ["sentinel", "hollow"].includes(k))
      ? "ward"
      : "fury";
  const combat: Combat = {
    kind: "combat",
    encounter:
      type === "boss"
        ? enemyDef(act.boss).name
        : type === "elite"
          ? (["The thorn court", "The unbroken watch", "Those lost to winter"][
              run.act
            ] ?? "The watch")
          : "The road is not empty",
    type,
    turn: 1,
    energy: 3 + (has(run, "flint") ? 1 : 0),
    block: has(run, "buckler") ? 8 : 0,
    dread: 0,
    ...(run.dreadRules === "recurring"
      ? { dreadResponse: "fury" as const }
      : { fired: [] }),
    draw: shuffle(run, run.deck),
    hand: [],
    discard: [],
    exhaust: [],
    enemies: kinds.map((kind) => makeEnemy(run, kind)),
    reaction,
    log: ["The fellowship takes its stand."],
  };
  if (
    run.prototype?.kind === "escape" &&
    run.act === (run.prototype.escapeAct ?? 0) &&
    run.row === 0 &&
    type === "battle"
  )
    configureEscape(run, combat, run.prototype.target);
  if (run.prototype?.ember)
    combat.ember =
      run.actBearer === null
        ? { window: "choose", bearer: null, used: false }
        : { window: "closed", bearer: run.actBearer, used: false };
  if (has(run, "hushed-coal") || has(run, "black-lantern"))
    combat.relicTurn = { coalUsed: false, lanternUsed: false };
  run.scene = combat;
  draw(
    run,
    combat,
    5 + (has(run, "map") ? 1 : 0) + (has(run, "feather") ? 1 : 0),
  );
}
