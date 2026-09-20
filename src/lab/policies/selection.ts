import type { LabConfig } from "../config";
import { cardDef } from "../../game/content/cards";
import { chooseAction, planHorizon, planV2 } from ".././policies/planner";
import type { CombatAction } from "../../game/model";
import type { Observation } from ".././observation";

// Independent policy randomness: never use the engine's seed or RNG here.
function randomIndex(seed: string, size: number) {
  let hash = 2166136261;
  for (const c of seed)
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d) >>> 0;
  hash ^= hash >>> 15;
  return (hash >>> 0) % size;
}

export function selectAction(
  o: Observation,
  actions: CombatAction[],
  bot: LabConfig["bot"],
  seed: string,
  budget: number,
): CombatAction {
  const first = actions[0];
  if (!first) throw new Error("No legal decision");
  if (bot === "stall" && o.kind === "combat" && o.ember?.window === "choose")
    return first;
  if (bot === "random")
    return actions[randomIndex(seed, actions.length)] ?? first;
  if (bot === "search-tempo") return planV2(o, seed, budget, 1.5).action;
  if (
    bot === "rollout-one" ||
    bot === "search-two" ||
    bot === "search-sequence" ||
    bot === "search-material"
  )
    return planHorizon(
      o,
      seed,
      budget,
      bot === "rollout-one" ? 1 : 2,
      bot === "search-sequence" ? "sequence" : "offense",
      bot === "search-material" ? "material" : "terminal",
    ).action;
  if (bot === "resource" && o.kind === "combat") {
    const acceleration = actions.find(
      (a) =>
        a.type === "play" &&
        o.hand.some(
          (c) =>
            c.uid === a.uid &&
            cardDef(c.def).effects.some((e) => e.kind === "energy"),
        ),
    );
    if (acceleration) return acceleration;
  }
  if (bot === "stall" && o.kind === "combat") {
    // Deliberately avoid damage. This is an adversarial termination probe, not a win policy.
    return (
      actions.find(
        (a) =>
          a.type === "play" &&
          o.hand.some(
            (c) =>
              c.uid === a.uid &&
              cardDef(c.def).effects.every(
                (e) =>
                  ![
                    "hit",
                    "all",
                    "shieldStrike",
                    "spendBlock",
                    "precision",
                    "defiance",
                  ].includes(e.kind),
              ),
          ),
      ) ?? { type: "end" }
    );
  }
  const policy =
    bot === "conservative"
      ? "dread"
      : bot === "search"
        ? "planner-v2"
        : bot === "strategic"
          ? "planner"
          : "offense";
  return chooseAction(o, policy, seed, budget);
}
