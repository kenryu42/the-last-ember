import type { ResolutionContext } from "../context";
import { EVENTS } from "../../content/world";
import { cardDef } from "../../content/cards";
import { RELICS } from "../../content/relics";
import type { Action, Resolution } from "../../model";
import { random, shuffle, pick } from ".././rng";
import { makeCard, rewardPool, heal, grantRelic, relicOffer } from ".././rewards";
import { generateRoute } from ".././journey/route";
import { reachable } from "../../selectors/route";
import { startCombat } from ".././combat/setup";
export function resolveTravel(
  { run, fail, finish }: ResolutionContext,
  action: Extract<Action, { type: "travel" }>,
): Resolution {
  const node = run.route.find((n) => n.id === action.node);
  if (!node || !reachable(run, node)) return fail("Choose a connected stop on the next row.");
  run.row = node.row;
  run.location = node.id;
  run.visited.push(node.id);
  if (node.kind === "battle" || node.kind === "elite" || node.kind === "boss")
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

export function resolveReward(
  { run, fail, finish }: ResolutionContext,
  action: Extract<Action, { type: "reward" }>,
): Resolution {
  const s = run.scene;
  if (s.kind !== "reward" || (action.card !== null && !s.cards.includes(action.card)))
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

export function resolveLeave(
  { run, fail, finish }: ResolutionContext,
  _action: Extract<Action, { type: "leave" }>,
): Resolution {
  const s = run.scene;
  if (
    s.kind !== "shop" &&
    !(s.kind === "camp" && s.used) &&
    !(s.kind === "event" && s.resolved !== null && s.pendingUpgrade === undefined)
  )
    return fail("Finish this stop before continuing.");
  run.scene = { kind: "map" };
  return finish();
}

export function resolveRest(
  { run, emit, fail, finish }: ResolutionContext,
  _action: Extract<Action, { type: "rest" }>,
): Resolution {
  if (run.scene.kind !== "camp" || run.scene.used) return fail("This camp has already been used.");
  run.scene.used = true;
  emit("heal", "party", `Restored ${heal(run, Math.ceil(run.maxHp * 0.25))} health.`);
  return finish();
}

export function resolveUpgrade(
  { run, emit, fail, finish }: ResolutionContext,
  action: Extract<Action, { type: "upgrade" }>,
): Resolution {
  const s = run.scene;
  if (!(s.kind === "camp" && !s.used) && !(s.kind === "event" && s.pendingUpgrade === action.uid))
    return fail("No improvement is available for this card.");
  const card = run.deck.find((c) => c.uid === action.uid && !c.upgraded);
  if (!card) return fail("Choose an unupgraded card.");
  if (card.def === "flame" && run.prototype?.branchUpgrades && !action.branch)
    return fail("Choose Veiled Flame or Wildfire.");
  if (action.branch && (card.def !== "flame" || !run.prototype?.branchUpgrades))
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

export function resolveChoice(
  { run, emit, fail, finish, endIfDead }: ResolutionContext,
  action: Extract<Action, { type: "choice" }>,
): Resolution {
  const s = run.scene;
  if (s.kind !== "event" || s.resolved !== null) return fail("That choice has already been made.");
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

export function resolveBuy(
  { run, emit, fail, finish }: ResolutionContext,
  action: Extract<Action, { type: "buy" }>,
): Resolution {
  const s = run.scene;
  if (s.kind !== "shop") return fail("There is no merchant here.");
  const cost =
    action.item === "card" ? 40 : action.item === "relic" ? 85 : action.item === "heal" ? 30 : 45;
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
    if (s.removed || run.deck.length <= 5 || !run.deck.some((c) => c.uid === action.index))
      return fail("Cannot remove that card.");
    run.deck = run.deck.filter((c) => c.uid !== action.index);
    s.removed = true;
  }
  run.gold -= cost;
  emit("reward", null, "Thank you. Travel safely.");
  return finish();
}
