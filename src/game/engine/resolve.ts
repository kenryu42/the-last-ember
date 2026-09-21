import type { ResolutionContext } from "./context";
import {
  resolveTravel,
  resolveReward,
  resolveLeave,
  resolveRest,
  resolveUpgrade,
  resolveChoice,
  resolveBuy,
} from "./journey/actions";
import { resolveWork, resolvePlay, resolveEnd } from "./combat/actions";
import type { Action, Combat, Cue, Frame, Resolution, Run } from "../model";
import { shuffle } from "./rng";
import { rewardPool, has, heal, relicOffer } from "./rewards";
import type { RulesMode } from "./rules";
import { needsActBearer } from "../selectors/bearer";
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
      if (!danger && combat.hand.length + combat.draw.length + combat.discard.length > 0)
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
  const context: ResolutionContext = {
    run,
    mode,
    accounting,
    emit,
    fail,
    finish,
    endIfDead,
    win,
  };
  switch (action.type) {
    case "travel":
      return resolveTravel(context, action);
    case "bearer": {
      const c = run.scene;
      if (needsActBearer(run)) {
        run.actBearer = action.hero;
        return finish();
      }
      if (c.kind !== "combat" || !c.ember || c.ember.window !== "choose" || run.actBearer !== null)
        return fail("The Ember bearer is locked until this Act is cleared.");
      run.actBearer = action.hero;
      c.ember = { bearer: action.hero, window: "closed", used: false };
      emit("dread", null, `${action.hero} carries the Ember for Act ${run.act + 1}.`);
      return finish();
    }
    case "work":
      return resolveWork(context, action);
    case "play":
      return resolvePlay(context, action);
    case "end":
      return resolveEnd(context, action);
    case "reward":
      return resolveReward(context, action);
    case "leave":
      return resolveLeave(context, action);
    case "rest":
      return resolveRest(context, action);
    case "upgrade":
      return resolveUpgrade(context, action);
    case "choice":
      return resolveChoice(context, action);
    case "buy":
      return resolveBuy(context, action);
  }
}
