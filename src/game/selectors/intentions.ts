import { enemyDef } from "../content/enemies";
import type { Intent } from "../content/enemies";
import type { Combat, Enemy, Run } from "../model";
import { has } from "../engine/rewards";
export function dreadResponse(combat: Combat) {
  const band =
    combat.dread >= 8 ? "major" : combat.dread >= 4 ? "minor" : "none";
  const living = combat.enemies.filter((e) => e.hp > 0);
  const dreadAfter = combat.dread - (band === "major" ? 4 : 0);
  let phaseDread = dreadAfter;
  return {
    kind: combat.dreadResponse ?? "fury",
    band,
    dreadAfter,
    modifiers: living.map((enemy, index) => {
      const attack =
        band === "major" ? 3 : band === "minor" && index === 0 ? 2 : 0;
      const intent = intention(enemy, { ...combat, dread: phaseDread }, attack);
      if (enemy.joinsOn <= combat.turn && intent.kind === "howl")
        phaseDread = Math.min(10, phaseDread + intent.amount);
      return { uid: enemy.uid, attack, intent };
    }),
  };
}

export function thresholdStrength(run: Run, combat: Combat): number {
  return thresholds(run, combat).reduce(
    (sum, t) => sum + (t.fired && combat.dread >= t.at ? t.strength : 0),
    0,
  );
}

export function intention(enemy: Enemy, combat: Combat, bonus = 0): Intent {
  const def = enemyDef(enemy.def),
    intent = def.pattern[enemy.step % def.pattern.length] ?? {
      kind: "attack",
      amount: 1,
    };
  if (intent.kind !== "attack" && intent.kind !== "drain") return intent;
  const boss = ["roots", "marshal", "hollow"].includes(enemy.def);
  let amount =
    intent.amount +
    enemy.strength +
    bonus +
    (boss && enemy.hp <= enemy.maxHp / 2 ? 3 : 0) +
    (enemy.def === "hollow" && combat.dread >= 6 ? 4 : 0);
  if (enemy.weak > 0) amount = Math.floor(amount * 0.75);
  return { kind: intent.kind, amount };
}
export function thresholds(run: Run, combat: Combat) {
  const shift = has(run, "charm") ? 1 : 0;
  return [4 + shift, 8 + shift].map((at, index) => ({
    at,
    strength:
      index === 0
        ? combat.reaction === "fury"
          ? 2
          : 0
        : combat.reaction === "ward"
          ? 4
          : 3,
    fired: combat.fired?.includes(at) ?? false,
    pending: combat.dread >= at && !combat.fired?.includes(at),
    text:
      index === 0
        ? combat.reaction === "reinforce"
          ? `A ${run.act === 0 ? "Briar wolf" : "Ashbound soldier"} joins. It waits this enemy phase.`
          : combat.reaction === "ward"
            ? "All enemies gain 10 block."
            : "All enemies gain 2 attack damage."
        : combat.reaction === "ward"
          ? "All enemies gain 4 attack damage."
          : "All enemies gain 3 attack damage.",
  }));
}
export function hitDamage(
  run: Run,
  combat: Combat,
  enemy: Enemy,
  base: number,
) {
  const amount =
    base +
    (has(run, "lens") && combat.dread <= 3 ? 2 : 0) +
    (has(run, "coal") && combat.dread >= 6 ? 3 : 0);
  return Math.floor(amount * (enemy.vulnerable > 0 ? 1.5 : 1));
}
