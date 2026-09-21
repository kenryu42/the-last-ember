import { z } from "zod";
import { EVENTS } from "../game/content/world";
import { cardDef, value } from "../game/content/cards";
import { needsActBearer } from "../game/selectors/bearer";
import { newRun } from "../game/engine/run";
import { random } from "../game/engine/rng";
import { resolve } from "../game/engine/resolve";
import { startCombat } from "../game/engine/combat/setup";
import type { Action, Run, StartingRelic } from "../game/model";
import { flameBranchSchema, heroSchema } from "../game/model";
import { legalActions } from "./legal-actions";
import { observe } from "./observation";
import { planHorizon, planV2 } from "./policies/planner";
import { assertInvariants } from "./simulation";
import { selectAction } from "./policies/selection";
import type { LabConfig } from "./config";

export const progressionSchema = z.enum([
  "static",
  "shield-aware",
  "build-aware",
  "continuation",
  "exploratory",
  "sampled",
]);

// Candidate enumeration is exhaustive; resolve remains the authority on legality.
export function journeyLegalActions(run: Run): Action[] {
  const s = run.scene;
  let candidates: Action[];
  switch (s.kind) {
    case "ending":
      return [];
    case "combat":
      return legalActions(observe(run, run.dreadRules === "recurring" ? "recurring" : "control"));
    case "map":
      candidates = needsActBearer(run)
        ? heroSchema.options.map((hero) => ({ type: "bearer", hero }))
        : run.route.map((n) => ({ type: "travel", node: n.id }));
      break;
    case "reward":
      candidates = [null, ...s.cards].map((card) => ({ type: "reward", card }));
      break;
    case "camp":
      candidates = [
        { type: "leave" },
        { type: "rest" },
        ...run.deck.flatMap((c): Action[] =>
          c.def === "flame" && run.prototype?.branchUpgrades
            ? flameBranchSchema.options.map((branch) => ({
                type: "upgrade",
                uid: c.uid,
                branch,
              }))
            : [{ type: "upgrade", uid: c.uid }],
        ),
      ];
      break;
    case "event": {
      const uid = s.pendingUpgrade;
      candidates =
        uid !== undefined
          ? flameBranchSchema.options.map((branch) => ({
              type: "upgrade",
              uid,
              branch,
            }))
          : [
              { type: "leave" },
              ...(EVENTS[s.event]?.choices.map((_, index) => ({
                type: "choice" as const,
                index,
              })) ?? []),
            ];
      break;
    }
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
    return {
      kind: "combat" as const,
      combat: observe(run, run.dreadRules === "recurring" ? "recurring" : "control"),
    };
  return {
    kind: "journey" as const,
    hp: run.hp,
    maxHp: run.maxHp,
    gold: run.gold,
    act: run.act,
    actBearer: run.actBearer,
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
    // Experimental acquisition policy, not reward weighting or a gameplay rule.
    // Value one missing conversion tool; further copies keep the normal rating.
    const conversion =
      (progression === "build-aware" || progression === "continuation") &&
      ((o.relics.includes("hushed-coal") &&
        def.effects.some((e) => e.kind === "dread" && e.amount <= -3) &&
        !o.deck.some((c) =>
          cardDef(c.def).effects.some((e) => e.kind === "dread" && e.amount <= -3),
        )) ||
        (o.relics.includes("shieldfire") &&
          def.effects.some((e) => e.kind === "shieldStrike" || e.kind === "spendBlock") &&
          !o.deck.some((c) =>
            cardDef(c.def).effects.some(
              (e) => e.kind === "shieldStrike" || e.kind === "spendBlock",
            ),
          )));
    const cost =
      Math.max(1, def.cost) -
      ((progression === "build-aware" || progression === "continuation") &&
      o.relics.includes("black-lantern") &&
      def.tags?.includes("Spell")
        ? 0.5
        : 0);
    return (
      (conversion ? 8 : 0) +
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
      ) /
        cost
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
      return c
        ? (progression === "continuation" && a.branch
            ? Math.max(...flameBranchSchema.options.map(rating))
            : rating(a.branch ?? c.def)) * 0.6
        : 0;
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
        return o.deck.some((c) => c.uid === a.index && c.def === "strike") ? 2 : -1;
      return o.scene.kind === "shop" && o.scene.cards[a.index]
        ? rating(o.scene.cards[a.index] ?? "strike") - 9
        : -1;
    case "leave":
      return 0;
    case "play":
    case "work":
    case "bearer":
    case "end":
      return -Infinity;
  }
}

// Sample future formations and draw orders, never the live run's hidden RNG.
// This isolates branch evaluation from reward/route rankings and combat policy.
function evaluateDeck(
  context: Pick<Run, "deck" | "relics" | "hp" | "maxHp" | "act" | "actBearer">,
  budget = 96,
) {
  return (["battle", "battle", "elite", "boss"] as const).map((kind, index) => {
    let run = newRun(`branch-evaluation:${index}`, "recurring", {
      kind: "escape",
      target: 4,
      ember: true,
    });
    run.deck = context.deck.map((card) => ({ ...card }));
    run.relics = [...context.relics];
    run.hp = context.hp;
    run.maxHp = context.maxHp;
    run.act = context.act;
    run.actBearer = context.actBearer;
    run.row = 1;
    run.nextId = Math.max(...run.deck.map((card) => card.uid)) + 1;
    startCombat(run, kind);
    const formation = run.scene.kind === "combat" ? run.scene.enemies.map((e) => e.def) : [];
    for (let step = 0; step < 160 && run.scene.kind === "combat" && run.scene.turn <= 20; step++) {
      const plan = planV2(observe(run, "recurring"), `branch-evaluation:${index}:${step}`, budget);
      const result = resolve(run, plan.action, "recurring", {
        captureFrames: false,
      });
      if (result.error) throw new Error(result.error);
      run = result.run;
    }
    const won = run.scene.kind === "ending" && run.scene.won;
    return {
      formation,
      actBearer: run.actBearer,
      won,
      timeout: run.scene.kind === "combat",
      hp: run.hp,
      turns: run.stats.turns,
      utility: (won ? 10000 : -10000) + 3 * run.hp - run.stats.turns,
    };
  });
}

export function evaluateFlameBranches(
  context: Pick<Run, "deck" | "relics" | "hp" | "maxHp" | "act" | "actBearer">,
  uid: number,
  budget = 96,
) {
  return flameBranchSchema.options.map((branch) => {
    const trials = evaluateDeck(
      {
        ...context,
        deck: context.deck.map((card) =>
          card.uid === uid ? { ...card, def: branch, upgraded: true } : { ...card },
        ),
      },
      budget,
    );
    return {
      branch,
      trials,
      utility: trials.reduce((sum, trial) => sum + trial.utility, 0),
    };
  });
}

export function evaluateRewards(
  context: Pick<Run, "deck" | "relics" | "hp" | "maxHp" | "act" | "actBearer">,
  offers: string[],
  budget = 96,
) {
  // Skip goes first and wins ties. No reward is forced into the deck.
  return [null, ...offers].map((card) => {
    const trials = evaluateDeck(
      {
        ...context,
        deck:
          card === null
            ? context.deck
            : [
                ...context.deck,
                {
                  uid: Math.max(...context.deck.map((c) => c.uid)) + 1,
                  def: card,
                  upgraded: false,
                },
              ],
      },
      budget,
    );
    return {
      card,
      trials,
      utility: trials.reduce((sum, trial) => sum + trial.utility, 0),
    };
  });
}

export function simulateJourney(
  seed: string,
  bot: LabConfig["bot"],
  budget = 256,
  progression: z.infer<typeof progressionSchema> = "static",
  dreadRules: "original" | "recurring" = "original",
  prototype?: Run["prototype"],
  startingRelic?: StartingRelic,
) {
  if (progression === "sampled" && (dreadRules !== "recurring" || !prototype?.ember))
    throw new Error("Sampled acquisition requires recurring Dread and Ember bearers");
  let run = newRun(seed, dreadRules, prototype, startingRelic);
  const trace: Action[] = [];
  const decisions = [];
  const rewardEvaluations: {
    index: number;
    alternatives: ReturnType<typeof evaluateRewards>;
  }[] = [];
  const branchEvaluations: {
    index: number;
    uid: number;
    alternatives: ReturnType<typeof evaluateFlameBranches>;
  }[] = [];
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
    if (plan && "completedCandidates" in plan && plan.completedCandidates < plan.candidates)
      incompleteDecisions++;
    let action =
      plan?.action ??
      (o.kind === "combat"
        ? selectAction(o.combat, legalActions(o.combat), bot, planningSeed, budget)
        : actions.sort(
            (a, b) =>
              progressionScore(
                o,
                b,
                progression === "exploratory" || progression === "sampled"
                  ? "build-aware"
                  : progression,
              ) -
              progressionScore(
                o,
                a,
                progression === "exploratory" || progression === "sampled"
                  ? "build-aware"
                  : progression,
              ),
          )[0]);
    if (progression === "exploratory" && run.scene.kind === "reward") {
      // Sample normal offers, including skip, without consuming gameplay RNG.
      // This diagnoses acquisition blind spots; it is not an optimized policy.
      const choices = [null, ...run.scene.cards];
      const sampled =
        choices[Math.floor(random(newRun(`reward:${seed}:${trace.length}`)) * choices.length)];
      if (sampled === undefined) throw new Error("Missing sampled reward");
      action = { type: "reward", card: sampled };
    }
    if (progression === "sampled" && run.scene.kind === "reward") {
      const alternatives = evaluateRewards(run, run.scene.cards);
      rewardEvaluations.push({ index: trace.length, alternatives });
      const best = alternatives.reduce((a, b) => (b.utility > a.utility ? b : a));
      action = { type: "reward", card: best.card };
    }
    if (progression === "continuation" && action?.type === "upgrade" && action.branch) {
      const alternatives = evaluateFlameBranches(run, action.uid);
      branchEvaluations.push({
        index: trace.length,
        uid: action.uid,
        alternatives,
      });
      const best = alternatives.reduce((a, b) => (b.utility > a.utility ? b : a));
      action = { ...action, branch: best.branch };
    }
    if (!action || !actions.some((a) => JSON.stringify(a) === JSON.stringify(action)))
      throw new Error(`No legal journey action at ${seed}:${trace.length}`);
    if (run.scene.kind === "combat") {
      const c = run.scene;
      const card = action.type === "play" ? c.hand.find((x) => x.uid === action.uid) : undefined;
      if (card)
        energyGeneratedThisTurn += cardDef(card.def).effects.reduce(
          (n, e) => n + (e.kind === "energy" ? value(e, card.upgraded) : 0),
          0,
        );
      if (action.type === "end") {
        unusedEnergy += c.energy;
        generatorUnusedUpperBound += Math.min(c.energy, energyGeneratedThisTurn);
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
          plan && "completedCandidates" in plan ? plan.completedCandidates : null,
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
    dreadRules,
    ...(prototype ? { prototype } : {}),
    ...(startingRelic ? { startingRelic } : {}),
    ...(progression === "static" ? {} : { progression }),
    ...(progression === "continuation" ? { branchEvaluations } : {}),
    ...(progression === "sampled" ? { rewardEvaluations } : {}),
    outcome: run.scene.kind === "ending" ? (run.scene.won ? "win" : "loss") : "timeout",
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
