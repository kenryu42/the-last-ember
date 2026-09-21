import { BREAK_FORMATION, CARDS, FADING_STRIKE, FLAME_UPGRADES } from "../content/cards";
import { RELICS } from "../content/relics";
import { reachable } from "../selectors/route";
import { runSchema } from "../model";
import type { Run } from "../model";
export type Loaded =
  | { kind: "empty" }
  | { kind: "valid"; run: Run }
  | { kind: "error"; message: string };

function validProgression(run: Run): boolean {
  const scene = run.scene;
  const node = run.route.find((node) => node.id === run.location);
  if (scene.kind !== "ending" && run.hp === 0) return false;
  if (run.location === null)
    return run.row === -1 && scene.kind === "map" && run.route.some((node) => reachable(run, node));
  if (!node || node.row !== run.row) return false;
  switch (scene.kind) {
    case "map":
      return run.route.some((next) => reachable(run, next));
    case "combat":
      return node.kind === scene.type;
    case "camp":
    case "event":
    case "shop":
      return node.kind === scene.kind;
    case "reward":
      return scene.boss
        ? node.kind === "boss" && run.act < 2
        : node.kind === "battle" || node.kind === "elite";
    case "ending":
      return scene.won
        ? run.hp > 0 && run.act === 2 && node.kind === "boss"
        : run.hp === 0 && ["battle", "elite", "boss", "event"].includes(node.kind);
  }
}
export function parseSave(text: string | null): Loaded {
  if (!text) return { kind: "empty" };
  try {
    const result = runSchema.safeParse(JSON.parse(text));
    if (!result.success)
      return {
        kind: "error",
        message: "This save does not match the current game format.",
      };
    const run = result.data,
      s = run.scene;
    const cardIds = new Set(
        [...CARDS, ...FLAME_UPGRADES, BREAK_FORMATION, FADING_STRIKE].map((c) => c.id),
      ),
      relicIds = new Set(RELICS.map((r) => r.id));
    const zones = s.kind === "combat" ? [...s.draw, ...s.hand, ...s.discard, ...s.exhaust] : [];
    const offers =
      s.kind === "reward" || s.kind === "shop" ? s.cards.filter((x) => x !== null) : [];
    const bad =
      !validProgression(run) ||
      (run.prototype?.ember === true && run.row >= 0 && run.actBearer === null) ||
      run.hp > run.maxHp ||
      run.deck.some((c) => !cardIds.has(c.def)) ||
      run.deck.some((c) => FLAME_UPGRADES.some((branch) => branch.id === c.def) && !c.upgraded) ||
      new Set(run.deck.map((c) => c.uid)).size !== run.deck.length ||
      run.relics.some((id) => !relicIds.has(id)) ||
      (s.kind === "event" &&
        s.pendingUpgrade !== undefined &&
        (!run.prototype?.branchUpgrades ||
          s.resolved === null ||
          !run.deck.some((c) => c.uid === s.pendingUpgrade && c.def === "flame" && !c.upgraded))) ||
      offers.some((id) => id !== null && !cardIds.has(id)) ||
      ((s.kind === "reward" || s.kind === "shop") && s.relic !== null && !relicIds.has(s.relic)) ||
      (s.kind === "combat" &&
        (run.hp === 0 ||
          !s.enemies.some((e) => e.hp > 0) ||
          (s.introPending && s.turn !== 1) ||
          (run.dreadRules === "recurring"
            ? s.dreadResponse !== "fury" || s.fired !== undefined
            : s.dreadResponse !== undefined || s.fired === undefined) ||
          (s.objective !== undefined && s.objective.progress >= s.objective.target) ||
          (s.ember?.window === "choose" && s.turn !== 1) ||
          (s.ember !== undefined && s.ember.bearer !== run.actBearer) ||
          (run.prototype?.ember === true && s.ember === undefined) ||
          (run.relics.some((id) => id === "hushed-coal" || id === "black-lantern") &&
            !s.relicTurn) ||
          new Set(s.enemies.map((e) => e.uid)).size !== s.enemies.length ||
          s.enemies.some(
            (e) => e.uid < 0 || e.uid >= run.nextId || run.deck.some((c) => c.uid === e.uid),
          ) ||
          zones.length !== run.deck.length ||
          new Set(zones.map((c) => c.uid)).size !== zones.length ||
          zones.some(
            (c) =>
              !run.deck.some(
                (d) => d.uid === c.uid && d.def === c.def && d.upgraded === c.upgraded,
              ),
          ) ||
          s.enemies.some((e) => e.hp > e.maxHp) ||
          s.hand.length > 10)) ||
      run.deck.some((c) => c.uid >= run.nextId) ||
      run.route.length !== 18 ||
      new Set(run.route.map((n) => n.id)).size !== run.route.length ||
      new Set(run.route.map((n) => `${n.row}-${n.lane}`)).size !== 18 ||
      run.route.some((n) => (n.row === 5) !== (n.kind === "boss")) ||
      run.route.some((n) =>
        n.row === 5 ? n.links.length !== 0 : n.links.length !== 3 || new Set(n.links).size !== 3,
      ) ||
      run.route.some((n) =>
        n.links.some(
          (link) => !run.route.some((other) => other.id === link && other.row === n.row + 1),
        ),
      ) ||
      (run.location !== null && !run.route.some((n) => n.id === run.location && n.row === run.row));
    if (bad)
      return {
        kind: "error",
        message: "This save has inconsistent game data.",
      };
    return { kind: "valid", run };
  } catch {
    return {
      kind: "error",
      message: "This save could not be read.",
    };
  }
}
