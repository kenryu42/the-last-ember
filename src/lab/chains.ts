import { CARDS, cardDef, value } from "../game/content/cards";
import { draw } from "../game/engine/combat/setup";
import { makeCard } from "../game/engine/rewards";
import { resolve } from "../game/engine/resolve";
import { shuffle } from "../game/engine/rng";
import { assertInvariants } from "./simulation";
import { selectAction } from "./policies/selection";
import { createHeadlessRun } from "./fixtures/headless";
import { legalActions } from "./legal-actions";
import { observe } from "./observation";

// Constructed stress fixtures, not claims about decks obtainable in a journey.
// No generated state is handed to a policy; only engine-generated legal actions
// and its public observation cross that boundary.
export function probeChain(
  seed: string,
  copies: 1 | 3,
  upgraded: boolean,
  {
    turnLimit = 1,
    encounterId = "ward",
  }: {
    turnLimit?: number;
    encounterId?: Parameters<typeof createHeadlessRun>[0]["encounterId"];
  } = {},
) {
  let run = createHeadlessRun({
    seed,
    fixture: { deckId: "exposed", variant: "base" },
    encounterId,
  });
  if (run.scene.kind !== "combat") throw new Error("Fixture is not combat");
  run.deck = CARDS.flatMap((def) =>
    Array.from({ length: copies }, () => ({
      ...makeCard(run, def.id),
      upgraded,
    })),
  );
  run.scene.hand = [];
  run.scene.draw = shuffle(run, [...run.deck]);
  run.scene.discard = [];
  run.scene.exhaust = [];
  for (const enemy of run.scene.enemies) enemy.hp = enemy.maxHp = 100000;
  draw(run, run.scene, 10);
  assertInvariants(run);

  // Current card-pool proof obligations. Energy sources and free draw exhaust.
  // With no retrieval effects, each source is usable at most once this fight.
  for (const def of CARDS)
    if (
      !def.exhaust &&
      def.effects.some((e) => e.kind === "energy" || (def.cost === 0 && e.kind === "draw"))
    )
      throw new Error(`Termination bound needs review for ${def.id}`);
  const energyBound =
    run.scene.energy +
    3 * (turnLimit - 1) +
    run.deck.reduce(
      (sum, c) =>
        sum +
        cardDef(c.def).effects.reduce(
          (n, e) => n + (e.kind === "energy" ? value(e, c.upgraded) : 0),
          0,
        ),
      0,
    );
  const maxDraw = Math.max(
    ...CARDS.map((def) =>
      def.effects.reduce((n, e) => n + (e.kind === "draw" ? value(e, upgraded) : 0), 0),
    ),
  );
  // Paid plays <= energyBound. Free exhaust plays <= deck size. Every free
  // non-exhaust occurrence must start in hand or be drawn by one of those plays.
  const actionBound =
    (energyBound + run.deck.length) * (1 + maxDraw) + run.scene.hand.length + 6 * (turnLimit - 1); // Five automatic draws and one end action per transition.
  const trace: ReturnType<typeof legalActions> = [];
  let generated = 0,
    spent = 0,
    drawn = 10,
    peakEnergy = run.scene.energy;
  while (run.scene.kind === "combat") {
    const o = observe(run, "control");
    if (o.kind !== "combat") throw new Error("Missing observation");
    const plays = legalActions(o).filter((a) => a.type === "play");
    if (!plays.length && o.turn >= turnLimit) break;
    const priority = (kind: "energy" | "draw") =>
      plays.find((a) =>
        o.hand.some((c) => c.uid === a.uid && cardDef(c.def).effects.some((e) => e.kind === kind)),
      );
    const action = !plays.length
      ? { type: "end" as const }
      : (priority("energy") ??
        priority("draw") ??
        selectAction(o, plays, "random", `chain-policy:${seed}:${trace.length}`, 1));
    const card = action.type === "play" ? o.hand.find((c) => c.uid === action.uid) : undefined;
    if (action.type === "play") {
      if (!card) throw new Error("Chain policy did not select a playable card");
      const def = cardDef(card.def);
      spent += def.cost;
      generated += def.effects.reduce(
        (n, e) => n + (e.kind === "energy" ? value(e, card.upgraded) : 0),
        0,
      );
    }
    const result = resolve(run, action, "control", { captureFrames: false });
    if (result.error) throw new Error(result.error);
    drawn += result.accounting.drawn;
    run = result.run;
    assertInvariants(run);
    trace.push(action);
    if (run.scene.kind === "combat") peakEnergy = Math.max(peakEnergy, run.scene.energy);
    if (trace.length > actionBound || spent > energyBound)
      throw new Error(`Chain bound violated: ${seed}`);
  }
  return {
    seed,
    copies,
    upgraded,
    turnLimit,
    encounterId,
    actions: trace.length,
    actionBound,
    energyBound,
    generated,
    spent,
    drawn,
    peakEnergy,
    outcome:
      run.scene.kind === "combat"
        ? turnLimit === 1
          ? "exhausted-legal-plays"
          : "turn-limit"
        : "terminal",
    trace,
  };
}

// Deliberate non-winning deck, paired with a one-card offensive exit. The same
// public policy builds block, then spends its last energy on Iron Answer if held.
export function probeStall(seed: string, withPayoff: boolean) {
  let run = createHeadlessRun({
    seed,
    fixture: { deckId: "defense", variant: "base" },
    encounterId: "fury",
  });
  if (run.scene.kind !== "combat") throw new Error("Fixture is not combat");
  run.deck = Array.from({ length: 5 }, (_, i) =>
    makeCard(run, withPayoff && i === 4 ? "shield" : "guard"),
  );
  run.scene.hand = [...run.deck];
  run.scene.draw = [];
  run.scene.discard = [];
  run.scene.exhaust = [];
  // One wraith's largest attack, even after both finite Fury thresholds, is
  // below three Shelters. Its drain cannot heal beyond the initial health.
  run.scene.enemies = run.scene.enemies.slice(0, 1);
  const trace: ReturnType<typeof legalActions> = [];
  while (run.scene.kind === "combat" && run.scene.turn <= 200) {
    const o = observe(run, "control");
    if (o.kind !== "combat") throw new Error("Missing observation");
    const legal = legalActions(o);
    const isPayoff = (uid: number) => o.hand.some((c) => c.uid === uid && c.def === "shield");
    const payoff = legal.find((a) => a.type === "play" && isPayoff(a.uid));
    const action = (o.energy === 1 ? payoff : undefined) ??
      legal.find((a) => a.type === "play" && !isPayoff(a.uid)) ??
      payoff ?? { type: "end" as const };
    const result = resolve(run, action, "control", { captureFrames: false });
    if (result.error) throw new Error(result.error);
    run = result.run;
    assertInvariants(run);
    trace.push(action);
  }
  return {
    seed,
    withPayoff,
    hp: run.hp,
    turns: run.stats.turns,
    outcome:
      run.scene.kind === "combat"
        ? "turn-limit"
        : run.scene.kind === "ending" && run.scene.won
          ? "win"
          : "loss",
    trace,
  };
}
