import { z } from "zod";
import { EVENTS, cardDef, value } from "./content";
import { newRun, resolve } from "./engine";
import type { Action, Run } from "./model";
import {
  legalActions,
  observe,
  planHorizon,
  planV2,
} from "./playtest-headless";
import { assertInvariants, selectAction } from "./laboratory";
import type { LabConfig } from "./laboratory";

export const progressionSchema = z.enum(["static", "shield-aware"]);

// Candidate enumeration is exhaustive; resolve remains the authority on legality.
export function journeyLegalActions(run: Run): Action[] {
  const s = run.scene;
  let candidates: Action[];
  switch (s.kind) {
    case "ending":
      return [];
    case "combat":
      return legalActions(observe(run, "control"));
    case "map":
      candidates = run.route.map((n) => ({ type: "travel", node: n.id }));
      break;
    case "reward":
      candidates = [null, ...s.cards].map((card) => ({ type: "reward", card }));
      break;
    case "camp":
      candidates = [
        { type: "leave" },
        { type: "rest" },
        ...run.deck.map((c) => ({ type: "upgrade" as const, uid: c.uid })),
      ];
      break;
    case "event":
      candidates = [
        { type: "leave" },
        ...(EVENTS[s.event]?.choices.map((_, index) => ({
          type: "choice" as const,
          index,
        })) ?? []),
      ];
      break;
    case "shop":
      candidates = [
        { type: "leave" },
        { type: "buy", item: "heal", index: 0 },
        { type: "buy", item: "relic", index: 0 },
        ...s.cards.map((_, index) => ({
          type: "buy" as const,
          item: "card" as const,
          index,
        })),
        ...run.deck.map((c) => ({
          type: "buy" as const,
          item: "remove" as const,
          index: c.uid,
        })),
      ];
      break;
  }
  return candidates.filter((action) => !resolve(run, action).error);
}

export function journeyObservation(run: Run) {
  if (run.scene.kind === "combat")
    return { kind: "combat" as const, combat: observe(run, "control") };
  return {
    kind: "journey" as const,
    hp: run.hp,
    maxHp: run.maxHp,
    gold: run.gold,
    act: run.act,
    scene: structuredClone(run.scene),
    deck: structuredClone(run.deck),
    relics: [...run.relics],
    route: structuredClone(run.route),
  };
}

// A fixed progression policy keeps combat-bot comparisons from changing several policies at once.
function progressionScore(
  o: Extract<ReturnType<typeof journeyObservation>, { kind: "journey" }>,
  a: Action,
  progression: z.infer<typeof progressionSchema>,
) {
  const rating = (id: string) => {
    const def = cardDef(id);
    return (
      def.effects.reduce(
        (n, e) =>
          n +
          (e.kind === "energy"
            ? e.amount * 6
            : e.kind === "draw"
              ? e.amount * 3
              : e.kind === "dread"
                ? -e.amount
                : e.amount),
        0,
      ) / Math.max(1, def.cost)
    );
  };
  switch (a.type) {
    case "travel": {
      const kind = o.route.find((n) => n.id === a.node)?.kind;
      return kind === "camp"
        ? 10
        : kind === "shop"
          ? o.gold >= 85
            ? 9
            : 2
          : kind === "event"
            ? 7
            : kind === "elite"
              ? 1
              : 5;
    }
    case "reward":
      // Single-card intervention. The starting deck already has five block
      // cards; test one payoff without changing any later scoring or combat.
      if (
        progression === "shield-aware" &&
        a.card === "shield" &&
        !o.deck.some((c) => c.def === "shield")
      )
        return Infinity;
      return a.card ? rating(a.card) - 7 : 0;
    case "rest":
      return Math.min(o.maxHp - o.hp, Math.ceil(o.maxHp * 0.25));
    case "upgrade": {
      const c = o.deck.find((c) => c.uid === a.uid);
      return c ? rating(c.def) * 0.6 : 0;
    }
    case "choice": {
      if (o.scene.kind !== "event") return -Infinity;
      const choice = EVENTS[o.scene.event]?.choices[a.index];
      return choice
        ? Math.min(o.maxHp - o.hp, choice.hp) * 1.5 +
            choice.gold * 0.2 +
            (choice.relic ? 18 : 0) +
            (choice.upgrade ? 8 : 0) +
            (choice.card ? rating(choice.card) : 0)
        : -Infinity;
    }
    case "buy":
      if (a.item === "heal") return Math.min(o.maxHp - o.hp, 20) - 10;
      if (a.item === "relic") return 10;
      if (a.item === "remove")
        return o.deck.some((c) => c.uid === a.index && c.def === "strike")
          ? 2
          : -1;
      return o.scene.kind === "shop" && o.scene.cards[a.index]
        ? rating(o.scene.cards[a.index] ?? "strike") - 9
        : -1;
    case "leave":
      return 0;
    case "play":
    case "end":
      return -Infinity;
  }
}

export function simulateJourney(
  seed: string,
  bot: LabConfig["bot"],
  budget = 256,
  progression: z.infer<typeof progressionSchema> = "static",
) {
  let run = newRun(seed);
  const trace: Action[] = [];
  const decisions = [];
  let engineCalls = 0,
    incompleteDecisions = 0,
    energyGeneratedThisTurn = 0;
  let unusedEnergy = 0,
    generatorUnusedUpperBound = 0;
  while (run.scene.kind !== "ending" && trace.length < 2000) {
    const actions = journeyLegalActions(run);
    const o = journeyObservation(run);
    const planningSeed = `journey-policy:${seed}:${trace.length}`;
    const plan =
      o.kind === "combat"
        ? bot === "rollout-one" ||
          bot === "search-two" ||
          bot === "search-sequence" ||
          bot === "search-material"
          ? planHorizon(
              o.combat,
              planningSeed,
              budget,
              bot === "rollout-one" ? 1 : 2,
              bot === "search-sequence" ? "sequence" : "offense",
              bot === "search-material" ? "material" : "terminal",
            )
          : bot === "search"
            ? planV2(o.combat, planningSeed, budget)
            : null
        : null;
    if (plan) engineCalls += plan.engineCalls;
    if (
      plan &&
      "completedCandidates" in plan &&
      plan.completedCandidates < plan.candidates
    )
      incompleteDecisions++;
    const action =
      plan?.action ??
      (o.kind === "combat"
        ? selectAction(
            o.combat,
            legalActions(o.combat),
            bot,
            planningSeed,
            budget,
          )
        : actions.sort(
            (a, b) =>
              progressionScore(o, b, progression) -
              progressionScore(o, a, progression),
          )[0]);
    if (
      !action ||
      !actions.some((a) => JSON.stringify(a) === JSON.stringify(action))
    )
      throw new Error(`No legal journey action at ${seed}:${trace.length}`);
    if (run.scene.kind === "combat") {
      const c = run.scene;
      const card =
        action.type === "play"
          ? c.hand.find((x) => x.uid === action.uid)
          : undefined;
      if (card)
        energyGeneratedThisTurn += cardDef(card.def).effects.reduce(
          (n, e) => n + (e.kind === "energy" ? value(e, card.upgraded) : 0),
          0,
        );
      if (action.type === "end") {
        unusedEnergy += c.energy;
        generatorUnusedUpperBound += Math.min(
          c.energy,
          energyGeneratedThisTurn,
        );
        energyGeneratedThisTurn = 0;
      }
      decisions.push({
        index: trace.length,
        act: run.act,
        row: run.row,
        turn: c.turn,
        hp: run.hp,
        energy: c.energy,
        enemyHp: c.enemies.reduce((n, e) => n + e.hp, 0),
        card: card?.def ?? null,
        action: action.type,
        engineCalls: plan?.engineCalls ?? null,
        completedCandidates:
          plan && "completedCandidates" in plan
            ? plan.completedCandidates
            : null,
        candidates: plan && "candidates" in plan ? plan.candidates : null,
      });
    } else energyGeneratedThisTurn = 0;
    const result = resolve(run, action);
    if (result.error) throw new Error(result.error);
    run = result.run;
    assertInvariants(run);
    trace.push(action);
  }
  return {
    seed,
    bot,
    budget,
    ...(progression === "static" ? {} : { progression }),
    outcome:
      run.scene.kind === "ending"
        ? run.scene.won
          ? "win"
          : "loss"
        : "timeout",
    hp: run.hp,
    stops: run.visited.length,
    act: run.act,
    stats: run.stats,
    planning: { engineCalls, incompleteDecisions },
    unusedEnergy,
    generatorUnusedUpperBound,
    decisions,
    trace,
  };
}
