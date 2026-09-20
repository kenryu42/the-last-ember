import {
  ACTS,
  BREAK_FORMATION,
  CARDS,
  EVENTS,
  FADING_STRIKE,
  RELICS,
  cardDef,
  enemyDef,
  needsTarget,
  value,
} from "./content";
import type { CardDef, EnemyKind, Intent } from "./content";
import { startingRelicSchema } from "./model";
import type { StartingRelic } from "./model";
import type {
  Action,
  Card,
  Combat,
  Cue,
  Enemy,
  Frame,
  NodeKind,
  Resolution,
  RouteNode,
  Run,
} from "./model";

export function random(run: Run): number {
  run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0;
  return run.rng / 4294967296;
}
export function shuffle<T>(run: Run, input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random(run) * (i + 1)),
      a = result[i],
      b = result[j];
    if (a !== undefined && b !== undefined) {
      result[i] = b;
      result[j] = a;
    }
  }
  return result;
}
function pick<T>(run: Run, choices: T[]): T {
  const result = choices[Math.floor(random(run) * choices.length)];
  if (result === undefined) throw new Error("Empty content pool");
  return result;
}
export function makeCard(run: Run, def: string): Card {
  return { uid: run.nextId++, def, upgraded: false };
}
export function rewardPool(run: Pick<Run, "prototype">) {
  return [
    ...CARDS,
    ...(run.prototype?.blockConversion ? [BREAK_FORMATION] : []),
    ...(run.prototype?.concealment ? [FADING_STRIKE] : []),
  ].filter((card) => !["strike", "guard"].includes(card.id));
}
export function has(run: Run, id: string) {
  return run.relics.includes(id);
}
export function heal(run: Run, amount: number) {
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + amount + (has(run, "bowl") ? 3 : 0));
  return run.hp - before;
}
export function grantRelic(run: Run, id: string) {
  if (has(run, id)) return;
  run.relics.push(id);
  if (id === "ribbon") {
    run.maxHp += 10;
    heal(run, 10);
  }
}
function relicOffer(run: Run) {
  const pool = RELICS.filter(
    (r) =>
      !has(run, r.id) &&
      !startingRelicSchema.options.some((id) => id === r.id) &&
      !(run.dreadRules === "recurring" && r.id === "charm"),
  );
  return pool.length ? pick(run, pool).id : null;
}
export function generateRoute(run: Run): RouteNode[] {
  const rows: NodeKind[][] = [
    ["battle", "battle", "battle"],
    ["event", "elite", "shop"],
    ["camp", "camp", "camp"],
    ["battle", "event", "elite"],
    ["camp", "shop", "camp"],
  ];
  const nodes: RouteNode[] = [];
  rows.forEach((types, row) =>
    shuffle(run, types).forEach((kind, lane) =>
      nodes.push({
        id: `${run.act}-${row}-${lane}`,
        row,
        lane,
        kind,
        links: [0, 1, 2].map((next) => `${run.act}-${row + 1}-${next}`),
      }),
    ),
  );
  // Three final approaches converge on the same Act guardian.
  for (const lane of [0, 1, 2])
    nodes.push({
      id: `${run.act}-5-${lane}`,
      row: 5,
      lane,
      kind: "boss",
      links: [],
    });
  return nodes;
}
export function newRun(
  seed: string,
  dreadRules: "original" | "recurring" = "original",
  prototype?: Run["prototype"],
  startingRelic?: StartingRelic,
): Run {
  const safeSeed = seed.trim().slice(0, 80) || "last-ember";
  let rng = 2166136261;
  for (const char of safeSeed)
    rng = Math.imul(rng ^ char.charCodeAt(0), 16777619) >>> 0;
  const run: Run = {
    version: 1,
    dreadRules,
    actBearer: null,
    ...(prototype ? { prototype } : {}),
    seed: safeSeed,
    rng,
    nextId: 1,
    act: 0,
    row: -1,
    location: null,
    route: [],
    visited: [],
    hp: 70,
    maxHp: 70,
    gold: 50,
    deck: [],
    relics: [],
    scene: { kind: "map" },
    stats: {
      turns: 0,
      kills: 0,
      damage: 0,
      cards: 0,
      thresholds: 0,
      battles: 0,
    },
  };
  run.deck = [
    "strike",
    "strike",
    "guard",
    "guard",
    "arrow",
    "arrow",
    "unseen",
    "unseen",
    "flame",
    "defiance",
    "pass",
    "bread",
  ].map((id) => makeCard(run, id));
  run.route = generateRoute(run);
  if (startingRelic) grantRelic(run, startingRelic);
  return run;
}
export function reachable(run: Run, node: RouteNode) {
  if (run.scene.kind !== "map" || node.row !== run.row + 1) return false;
  return (
    run.location === null ||
    !!run.route.find((n) => n.id === run.location)?.links.includes(node.id)
  );
}
export function makeEnemy(run: Run, def: EnemyKind, joinsOn = 0): Enemy {
  const base = enemyDef(def),
    boss = ["roots", "marshal", "hollow"].includes(def);
  const hp = base.hp + (boss ? 0 : run.act * 6);
  return {
    uid: run.nextId++,
    def,
    hp,
    maxHp: hp,
    block: 0,
    strength: boss ? 0 : run.act * 2,
    weak: 0,
    vulnerable: 0,
    step: 0,
    joinsOn,
  };
}
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
export type RulesMode = "adventure" | "control" | "candidate" | "recurring";

export function cardCost(
  run: Pick<Run, "relics">,
  combat: Pick<Combat, "relicTurn">,
  def: CardDef,
) {
  return Math.max(
    0,
    def.cost -
      (run.relics.includes("black-lantern") &&
      !combat.relicTurn?.lanternUsed &&
      def.tags?.includes("Spell")
        ? 1
        : 0),
  );
}

export function empowerTargets(
  combat: Pick<Combat, "ember" | "enemies">,
  def: CardDef,
  target: number | null,
) {
  if (
    combat.ember?.bearer !== "Aldren" ||
    combat.ember.used ||
    !def.tags?.includes("Spell")
  )
    return [];
  if (def.effects.some((e) => e.kind === "all"))
    return combat.enemies.filter((e) => e.hp > 0).map((e) => e.uid);
  return def.effects.some((e) => e.kind === "hit") && target !== null
    ? combat.enemies
        .filter((e) => e.hp > 0 && e.uid === target)
        .map((e) => e.uid)
    : [];
}

export function configureEscape(run: Run, combat: Combat, target = 4) {
  combat.encounter = "Escape the briar road";
  combat.objective = { kind: "escape", progress: 0, target, worked: 0 };
  // Reuse a small formation so combat leaves resources for the mission.
  combat.enemies = [makeEnemy(run, "wolf"), makeEnemy(run, "crow")];
}

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
export function needsActBearer(run: Run): boolean {
  return (
    run.prototype?.ember === true &&
    run.actBearer === null &&
    run.scene.kind === "map" &&
    run.row === -1
  );
}

export function resolve(
  input: Run,
  action: Action,
  mode: RulesMode = "adventure",
  options: { captureFrames?: boolean } = {},
): Resolution {
  const run = structuredClone(input),
    frames: Frame[] = [];
  const accounting: Resolution["accounting"] = {
    drawn: 0,
    suppressedAttackDamage: 0,
  };
  const fail = (error: string): Resolution => ({
    run: input,
    frames: [],
    error,
    accounting: { drawn: 0, suppressedAttackDamage: 0 },
  });
  const emit = (cue: Cue, target: Frame["target"], text: string) => {
    if (run.scene.kind === "combat") {
      run.scene.log.push(text);
      run.scene.log = run.scene.log.slice(-50);
    }
    if (options.captureFrames !== false)
      frames.push({ run: structuredClone(run), cue, target, text });
  };
  const finish = (): Resolution => ({ run, frames, error: null, accounting });
  const endIfDead = () => {
    if (run.hp > 0) return false;
    run.scene = { kind: "ending", won: false };
    emit("defeat", "party", "The ember slips from your hands.");
    return true;
  };
  const win = (combat: Combat) => {
    const danger = combat.enemies.some((e) => e.hp > 0);
    if (combat.objective) {
      // With no enemies, renewable energy and a nonempty reshuffling deck make
      // remaining Work guaranteed. Do not force empty turns or extra rewards.
      if (
        !danger &&
        combat.hand.length + combat.draw.length + combat.discard.length > 0
      )
        combat.objective.progress = combat.objective.target;
      if (combat.objective.progress < combat.objective.target) return;
    } else if (danger) return;
    run.stats.battles++;
    if (mode !== "adventure") {
      run.scene = { kind: "ending", won: true };
      emit("victory", null, "Benchmark fight won.");
      return;
    }
    if (has(run, "kettle")) heal(run, 3);
    if (combat.type === "boss" && run.act === 2) {
      run.scene = { kind: "ending", won: true };
      emit("victory", null, "The beacon answers.");
      return;
    }
    const gold =
      (combat.type === "boss" ? 65 : combat.type === "elite" ? 45 : 25) +
      run.act * 8 +
      (has(run, "purse") ? 12 : 0);
    run.gold += gold;
    run.scene = {
      kind: "reward",
      cards: shuffle(run, rewardPool(run))
        .slice(0, 3)
        .map((c) => c.id),
      relic: combat.type !== "battle" ? relicOffer(run) : null,
      gold,
      boss: combat.type === "boss",
    };
    emit("reward", null, "The road is yours again.");
  };
  if (run.scene.kind === "ending") return fail("This journey has ended.");
  if (
    (needsActBearer(run) ||
      (run.scene.kind === "combat" && run.scene.ember?.window === "choose")) &&
    action.type !== "bearer"
  )
    return fail("Choose this Act's starting Ember bearer first.");
  if (
    mode !== "adventure" &&
    action.type !== "play" &&
    action.type !== "end" &&
    action.type !== "work" &&
    action.type !== "bearer"
  )
    return fail("Benchmark mode only permits combat actions.");
  switch (action.type) {
    case "travel": {
      const node = run.route.find((n) => n.id === action.node);
      if (!node || !reachable(run, node))
        return fail("Choose a connected stop on the next row.");
      run.row = node.row;
      run.location = node.id;
      run.visited.push(node.id);
      if (
        node.kind === "battle" ||
        node.kind === "elite" ||
        node.kind === "boss"
      )
        startCombat(run, node.kind);
      else if (node.kind === "camp") run.scene = { kind: "camp", used: false };
      else if (node.kind === "event")
        run.scene = {
          kind: "event",
          event: Math.floor(random(run) * EVENTS.length),
          resolved: null,
        };
      else
        run.scene = {
          kind: "shop",
          cards: shuffle(run, rewardPool(run))
            .slice(0, 3)
            .map((c) => c.id),
          relic: relicOffer(run),
          healed: false,
          removed: false,
        };
      return finish();
    }
    case "bearer": {
      const c = run.scene;
      if (needsActBearer(run)) {
        run.actBearer = action.hero;
        return finish();
      }
      if (
        c.kind !== "combat" ||
        !c.ember ||
        c.ember.window !== "choose" ||
        run.actBearer !== null
      )
        return fail("The Ember bearer is locked until this Act is cleared.");
      run.actBearer = action.hero;
      c.ember = { bearer: action.hero, window: "closed", used: false };
      emit(
        "dread",
        null,
        `${action.hero} carries the Ember for Act ${run.act + 1}.`,
      );
      return finish();
    }
    case "work": {
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
    case "play": {
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
        return fail(
          "Aldren can empower one hit of a damage Spell once per turn.",
        );
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
        emit(
          "dread",
          null,
          "Black Lantern: first Spell costs 1 less; +1 Dread.",
        );
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
              n < 0 &&
              before > 0 &&
              c.ember?.bearer === "Eryn" &&
              !c.ember.used;
            if (conceal && c.ember) {
              c.ember.used = true;
              accounting.ember = {
                hero: "Eryn",
                damage: 0,
                block: 0,
                dreadReduced: Math.min(2, Math.max(0, before + n)),
              };
            }
            c.dread = Math.max(
              0,
              Math.min(10, c.dread + n - (conceal ? 2 : 0)),
            );
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
        emit(
          "draw",
          null,
          "Hushed Coal: conceal the flame, +1 energy and draw 1.",
        );
      }
      if (def.exhaust) c.exhaust.push(card);
      else c.discard.push(card);
      win(c);
      return finish();
    }
    case "end": {
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
      const modifiers = new Map(
        response?.modifiers.map((m) => [m.uid, m.attack]),
      );
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
    case "reward": {
      const s = run.scene;
      if (
        s.kind !== "reward" ||
        (action.card !== null && !s.cards.includes(action.card))
      )
        return fail("That reward is not available.");
      if (action.card) run.deck.push(makeCard(run, action.card));
      if (s.relic) grantRelic(run, s.relic);
      if (s.boss) {
        run.act++;
        run.actBearer = null;
        run.row = -1;
        run.location = null;
        heal(run, Math.ceil(run.maxHp * 0.2));
        run.route = generateRoute(run);
      }
      run.scene = { kind: "map" };
      return finish();
    }
    case "leave": {
      const s = run.scene;
      if (
        s.kind !== "shop" &&
        !(s.kind === "camp" && s.used) &&
        !(
          s.kind === "event" &&
          s.resolved !== null &&
          s.pendingUpgrade === undefined
        )
      )
        return fail("Finish this stop before continuing.");
      run.scene = { kind: "map" };
      return finish();
    }
    case "rest": {
      if (run.scene.kind !== "camp" || run.scene.used)
        return fail("This camp has already been used.");
      run.scene.used = true;
      emit(
        "heal",
        "party",
        `Restored ${heal(run, Math.ceil(run.maxHp * 0.25))} health.`,
      );
      return finish();
    }
    case "upgrade": {
      const s = run.scene;
      if (
        !(s.kind === "camp" && !s.used) &&
        !(s.kind === "event" && s.pendingUpgrade === action.uid)
      )
        return fail("No improvement is available for this card.");
      const card = run.deck.find((c) => c.uid === action.uid && !c.upgraded);
      if (!card) return fail("Choose an unupgraded card.");
      if (
        card.def === "flame" &&
        run.prototype?.branchUpgrades &&
        !action.branch
      )
        return fail("Choose Veiled Flame or Wildfire.");
      if (
        action.branch &&
        (card.def !== "flame" || !run.prototype?.branchUpgrades)
      )
        return fail("Only Ancient flame has a branching camp upgrade.");
      if (action.branch) card.def = action.branch;
      card.upgraded = true;
      if (s.kind === "camp") s.used = true;
      if (s.kind === "event") {
        delete s.pendingUpgrade;
        s.resolved += ` ${cardDef(card.def).name} improved.`;
      }
      emit("reward", null, `${cardDef(card.def).name} improved.`);
      return finish();
    }
    case "choice": {
      const s = run.scene;
      if (s.kind !== "event" || s.resolved !== null)
        return fail("That choice has already been made.");
      const choice = EVENTS[s.event]?.choices[action.index];
      if (!choice) return fail("Unknown choice.");
      if (run.gold + choice.gold < 0) return fail("Not enough gold.");
      run.gold += choice.gold;
      run.maxHp += choice.maxHp ?? 0;
      if (choice.hp > 0) heal(run, choice.hp);
      else run.hp = Math.max(0, run.hp + choice.hp);
      if (endIfDead()) return finish();
      const results = [choice.detail];
      if (choice.card) run.deck.push(makeCard(run, choice.card));
      if (choice.relic) {
        const id = relicOffer(run);
        if (id) {
          grantRelic(run, id);
          results.push(`Found ${RELICS.find((r) => r.id === id)?.name}.`);
        } else {
          run.gold += 30;
          results.push("All relics found. Gained 30 gold instead.");
        }
      }
      if (choice.upgrade) {
        const pool = run.deck.filter((c) => !c.upgraded);
        if (pool.length) {
          const card = pick(run, pool);
          if (card.def === "flame" && run.prototype?.branchUpgrades) {
            s.pendingUpgrade = card.uid;
          } else {
            card.upgraded = true;
            results.push(`${cardDef(card.def).name} improved.`);
          }
        } else {
          run.gold += 20;
          results.push("All cards improved. Gained 20 gold instead.");
        }
      }
      s.resolved = results.join(" ");
      emit("reward", null, choice.label);
      return finish();
    }
    case "buy": {
      const s = run.scene;
      if (s.kind !== "shop") return fail("There is no merchant here.");
      const cost =
        action.item === "card"
          ? 40
          : action.item === "relic"
            ? 85
            : action.item === "heal"
              ? 30
              : 45;
      if (run.gold < cost) return fail("Not enough gold.");
      if (action.item === "card") {
        const id = s.cards[action.index];
        if (!id) return fail("Already sold.");
        run.deck.push(makeCard(run, id));
        s.cards[action.index] = null;
      } else if (action.item === "relic") {
        if (!s.relic) return fail("Already sold.");
        grantRelic(run, s.relic);
        s.relic = null;
      } else if (action.item === "heal") {
        if (s.healed || run.hp === run.maxHp)
          return fail("Healing is not needed or already purchased.");
        heal(run, 20);
        s.healed = true;
      } else {
        if (
          s.removed ||
          run.deck.length <= 5 ||
          !run.deck.some((c) => c.uid === action.index)
        )
          return fail("Cannot remove that card.");
        run.deck = run.deck.filter((c) => c.uid !== action.index);
        s.removed = true;
      }
      run.gold -= cost;
      emit("reward", null, "Thank you. Travel safely.");
      return finish();
    }
  }
}
