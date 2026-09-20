import type { ResolutionContext } from "../context";
import { cardDef, needsTarget, value } from "../../content/cards";
import { enemyDef } from "../../content/enemies";
import type { Action, Enemy, Resolution } from "../../model";
import { has, heal } from ".././rewards";
import { makeEnemy } from ".././combat/enemy";
import { draw } from ".././combat/setup";
import { cardCost, empowerTargets } from "../../selectors/combat";
import {
  dreadResponse,
  thresholdStrength,
  intention,
  thresholds,
  hitDamage,
} from "../../selectors/intentions";
export function resolveWork(
  { run, emit, fail, finish, win }: ResolutionContext,
  action: Extract<Action, { type: "work" }>,
): Resolution {
  const c = run.scene;
  if (c.kind !== "combat" || !c.objective)
    return fail("No Work objective is active.");
  if (c.objective.worked >= 2)
    return fail("Work is limited to twice per turn.");
  if (c.energy < 1) return fail("Work costs 1 energy.");
  const card = c.hand.find((card) => card.uid === action.uid);
  if (!card) return fail("Choose a card in hand to discard for Work.");
  c.energy--;
  c.hand = c.hand.filter((x) => x.uid !== card.uid);
  c.discard.push(card);
  c.objective.worked++;
  c.objective.progress++;
  emit(
    "draw",
    null,
    `Work: discarded ${cardDef(card.def).name}. Progress ${c.objective.progress}/${c.objective.target}.`,
  );
  win(c);
  return finish();
}

export function resolvePlay(
  { run, accounting, emit, fail, finish, win }: ResolutionContext,
  action: Extract<Action, { type: "play" }>,
): Resolution {
  const c = run.scene;
  if (c.kind !== "combat") return fail("No combat is in progress.");
  const card = c.hand.find((card) => card.uid === action.uid);
  if (!card) return fail("That card is no longer in your hand.");
  const def = cardDef(card.def),
    target = c.enemies.find((e) => e.uid === action.target && e.hp > 0);
  const cost = cardCost(run, c, def);
  if (cost > c.energy) return fail("Not enough energy.");
  if (needsTarget(def) && !target) return fail("Choose a living enemy.");
  if (
    action.empower !== undefined &&
    !empowerTargets(c, def, action.target).includes(action.empower)
  )
    return fail("Aldren can empower one hit of a damage Spell once per turn.");
  // The optional exposure is paid before the Spell's printed effects.
  if (action.empower !== undefined) c.dread = Math.min(10, c.dread + 1);
  if (
    has(run, "black-lantern") &&
    c.relicTurn &&
    !c.relicTurn.lanternUsed &&
    def.tags?.includes("Spell")
  ) {
    c.relicTurn.lanternUsed = true;
    c.dread = Math.min(10, c.dread + 1);
    emit("dread", null, "Black Lantern: first Spell costs 1 less; +1 Dread.");
  }
  const dreadBeforeCard = c.dread;
  c.energy -= cost;
  c.hand = c.hand.filter((x) => x.uid !== card.uid);
  run.stats.cards++;
  const strike = (enemy: Enemy, amount: number) => {
    if (enemy.hp <= 0) return;
    const empowered =
      c.ember?.bearer === "Aldren" &&
      !c.ember.used &&
      action.empower === enemy.uid;
    if (empowered && c.ember) {
      c.ember.used = true;
      accounting.ember = {
        hero: "Aldren",
        damage: 5,
        block: 0,
        dreadReduced: 0,
      };
      amount += 5;
    }
    const damage = hitDamage(run, c, enemy, amount),
      absorbed = Math.min(enemy.block, damage),
      lost = Math.min(enemy.hp, damage - absorbed);
    if (empowered && accounting.ember)
      accounting.ember.damage =
        lost -
        Math.min(
          enemy.hp,
          Math.max(0, hitDamage(run, c, enemy, amount - 5) - enemy.block),
        );
    enemy.block -= absorbed;
    enemy.hp -= lost;
    run.stats.damage += lost;
    emit(
      def.owner === "Aldren"
        ? "spell"
        : def.owner === "Eryn"
          ? "arrow"
          : "blade",
      enemy.uid,
      `${def.name}: ${lost} damage${absorbed ? ` · ${absorbed} blocked` : ""}${empowered ? " · Aldren +5 base damage" : ""}`,
    );
    if (enemy.hp === 0) {
      run.stats.kills++;
      emit("death", enemy.uid, `${enemyDef(enemy.def).name} falls.`);
    }
  };
  for (const effect of def.effects) {
    const n = value(effect, card.upgraded);
    switch (effect.kind) {
      case "hit":
        if (target) strike(target, n);
        break;
      case "defiance":
        if (target) strike(target, n * (c.dread >= 6 ? 2 : 1));
        break;
      case "precision":
        if (target) strike(target, n + (c.dread <= 3 ? 6 : 0));
        break;
      case "shieldStrike":
        if (target) strike(target, n + c.block);
        break;
      case "spendBlock": {
        const spent = c.block;
        c.block = 0;
        emit("shield", "party", `Spent ${spent} Block.`);
        if (target) strike(target, n + spent);
        break;
      }
      case "all":
        c.enemies.forEach((enemy) => strike(enemy, n));
        break;
      case "block":
      case "resolve": {
        const shelter = c.ember?.bearer === "Mara" && !c.ember.used;
        if (shelter && c.ember) {
          c.ember.used = true;
          accounting.ember = {
            hero: "Mara",
            damage: 0,
            block: 3,
            dreadReduced: 0,
          };
        }
        const amount =
          n +
          (shelter ? 3 : 0) +
          (effect.kind === "resolve" ? c.dread : 0) +
          (has(run, "thread") ? 2 : 0);
        c.block += amount;
        emit(
          "shield",
          "party",
          `+${amount} block${shelter ? " · Mara +3" : ""}`,
        );
        break;
      }
      case "draw": {
        const before = c.hand.length;
        draw(run, c, n);
        accounting.drawn += c.hand.length - before;
        emit(
          "draw",
          null,
          `Drew ${c.hand.length - before} card${c.hand.length - before === 1 ? "" : "s"}.`,
        );
        break;
      }
      case "dread": {
        const before = c.dread;
        const conceal =
          n < 0 && before > 0 && c.ember?.bearer === "Eryn" && !c.ember.used;
        if (conceal && c.ember) {
          c.ember.used = true;
          accounting.ember = {
            hero: "Eryn",
            damage: 0,
            block: 0,
            dreadReduced: Math.min(2, Math.max(0, before + n)),
          };
        }
        c.dread = Math.max(0, Math.min(10, c.dread + n - (conceal ? 2 : 0)));
        emit(
          "dread",
          null,
          `Dread ${c.dread - before >= 0 ? "+" : ""}${c.dread - before}${conceal ? " · Eryn conceals" : ""}`,
        );
        break;
      }
      case "energy":
        c.energy += n;
        emit("draw", null, `+${n} energy`);
        break;
      case "heal":
        emit("heal", "party", `+${heal(run, n)} health`);
        break;
      case "weak":
        if (target && target.hp > 0) {
          target.weak += n;
          emit("shield", target.uid, `${n} Weak applied`);
        }
        break;
      case "vulnerable":
        if (target && target.hp > 0) {
          target.vulnerable += n;
          emit("dread", target.uid, `${n} Vulnerable applied`);
        }
        break;
    }
  }
  if (
    has(run, "hushed-coal") &&
    c.relicTurn &&
    !c.relicTurn.coalUsed &&
    dreadBeforeCard >= 6 &&
    c.dread <= 3
  ) {
    c.relicTurn.coalUsed = true;
    c.energy++;
    const beforeDraw = c.hand.length;
    draw(run, c, 1);
    accounting.drawn += c.hand.length - beforeDraw;
    emit("draw", null, "Hushed Coal: conceal the flame, +1 energy and draw 1.");
  }
  if (def.exhaust) c.exhaust.push(card);
  else c.discard.push(card);
  win(c);
  return finish();
}

export function resolveEnd(
  { run, mode, accounting, emit, fail, finish, endIfDead }: ResolutionContext,
  _action: Extract<Action, { type: "end" }>,
): Resolution {
  const c = run.scene;
  if (c.kind !== "combat") return fail("No combat is in progress.");
  c.discard.push(...c.hand.filter((card) => !cardDef(card.def).retain));
  c.hand = c.hand.filter((card) => cardDef(card.def).retain);
  c.energy = 0;
  // Check player Dread before enemy actions, including Howls. Fury lives
  // only in this phase's modifier map, never in persistent enemy strength.
  const recurring =
    mode === "recurring" ||
    (mode === "adventure" && c.dreadResponse !== undefined);
  const response = recurring ? dreadResponse(c) : null;
  const modifiers = new Map(response?.modifiers.map((m) => [m.uid, m.attack]));
  // Old enemy block expires before threshold effects grant new block.
  c.enemies.forEach((enemy) => {
    enemy.block = 0;
  });
  if (response && response.band !== "none") {
    run.stats.thresholds++;
    c.dread = response.dreadAfter;
    emit(
      "dread",
      null,
      `${response.band} Fury: ${response.band === "major" ? "all living enemies +3" : "frontmost living enemy +2"} Attack/Drain this phase only. Dread ${c.dread}.`,
    );
  }
  for (const threshold of recurring ? [] : thresholds(run, c)) {
    if (!threshold.pending) continue;
    (c.fired ??= []).push(threshold.at);
    run.stats.thresholds++;
    const first = c.fired.length === 1;
    if (first && c.reaction === "reinforce")
      c.enemies.push(
        makeEnemy(run, run.act === 0 ? "wolf" : "soldier", c.turn + 1),
      );
    else if (first && c.reaction === "ward")
      c.enemies.filter((e) => e.hp > 0).forEach((e) => (e.block += 10));
    else if (mode !== "candidate")
      c.enemies
        .filter((e) => e.hp > 0)
        .forEach(
          (e) => (e.strength += first ? 2 : c.reaction === "ward" ? 4 : 3),
        );
    emit("dread", null, `Dread ${threshold.at}: ${threshold.text}`);
  }
  for (const enemy of c.enemies) {
    if (enemy.hp <= 0 || enemy.joinsOn > c.turn) continue;
    const intent = intention(
      enemy,
      c,
      recurring
        ? (modifiers.get(enemy.uid) ?? 0)
        : mode === "candidate"
          ? thresholdStrength(run, c)
          : 0,
    );
    if (intent.kind === "guard") {
      enemy.block += intent.amount;
      emit(
        "shield",
        enemy.uid,
        `${enemyDef(enemy.def).name}: +${intent.amount} block`,
      );
    } else if (intent.kind === "howl") {
      c.dread = Math.min(10, c.dread + intent.amount);
      emit(
        "dread",
        enemy.uid,
        `${enemyDef(enemy.def).name}: +${intent.amount} Dread`,
      );
    } else {
      if (mode === "candidate") {
        const alwaysActive = thresholdStrength(run, { ...c, dread: 10 });
        accounting.suppressedAttackDamage +=
          intention(enemy, c, alwaysActive).amount - intent.amount;
      }
      const absorbed = Math.min(c.block, intent.amount),
        lost = Math.min(run.hp, intent.amount - absorbed);
      c.block -= absorbed;
      run.hp -= lost;
      if (intent.kind === "drain")
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + lost);
      emit(
        "enemy",
        enemy.uid,
        `${enemyDef(enemy.def).name}: ${lost} health lost${absorbed ? ` · ${absorbed} blocked` : ""}`,
      );
      if (endIfDead()) return finish();
    }
    enemy.weak = Math.max(0, enemy.weak - 1);
    enemy.vulnerable = Math.max(0, enemy.vulnerable - 1);
    enemy.step++;
  }
  c.turn++;
  run.stats.turns++;
  if (c.objective) c.objective.worked = 0;
  c.block = has(run, "shieldfire") ? Math.min(6, c.block) : 0;
  if (c.relicTurn) c.relicTurn = { coalUsed: false, lanternUsed: false };
  c.energy = 3;
  const retained = c.hand.length;
  draw(run, c, 5 + (has(run, "map") ? 1 : 0));
  if (c.ember) c.ember.used = false;
  accounting.drawn += c.hand.length - retained;
  emit("draw", null, `Turn ${c.turn}. The fellowship stands together.`);
  return finish();
}
