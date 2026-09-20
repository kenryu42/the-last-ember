import { describe, expect, test } from "bun:test";
import { cardDef, needsTarget } from "../../src/game/content/cards";
import type { Run } from "../../src/game/model";
import { combatAction } from "../support/pilot";
import {
  campAction,
  fight,
  followup,
  shortStart,
  step,
} from "../../scripts/studies/recovery-study";

describe("recovery experiment", () => {
  test("carries health, caps rest, upgrades the selected card, and preserves input", () => {
    const start = shortStart("recovery-v03-1", "quiet", "reinforce", 45);
    const original = structuredClone(start);
    const first = fight(start);
    expect(first.outcome).toBe("win");
    expect(first.run.hp).toBe(9);
    expect(first.turns).toBe(4);
    const snapshot = structuredClone(first.run);
    const rest = followup(
      first.run,
      "rest",
      "quiet",
      "elite",
      "recovery-v03-1/second/elite",
    );
    const upgrade = followup(
      first.run,
      "primary",
      "quiet",
      "elite",
      "recovery-v03-1/second/elite",
    );
    expect(rest.campHp).toBe(27);
    expect(upgrade.campHp).toBe(9);
    expect(
      upgrade.run.deck.filter((c) => c.upgraded).map((c) => [c.uid, c.def]),
    ).toEqual([[13, "needle"]]);
    expect(rest.run.deck.some((c) => c.upgraded)).toBe(false);
    expect(first.run).toEqual(snapshot);
    expect(start).toEqual(original);
    expect(fight(rest.run).run.hp).toBe(7);
    expect(fight(upgrade.run).outcome).toBe("loss");
    const full = fight(shortStart("recovery-v03-1", "defense", "fury", 70));
    expect(
      followup(full.run, "rest", "defense", "battle", "stream").campHp,
    ).toBe(70);
    expect(campAction(first.run, "bread", "quiet")).toEqual({
      type: "upgrade",
      uid: 24,
    });
  });

  test("matches second-fight shuffle and encounter despite first-fight RNG divergence", () => {
    const inputs = [70, 45].map(
      (hp) =>
        fight(shortStart("recovery-v03-1", "exposed", "reinforce", hp)).run,
    );
    expect(new Set(inputs.map((r) => r.rng)).size).toBe(2);
    const runs = inputs.flatMap((r) =>
      (["rest", "bread"] as const).map(
        (camp) => followup(r, camp, "exposed", "elite", "matched-stream").run,
      ),
    );
    const signatures = runs.map((r) => {
      if (r.scene.kind !== "combat") throw new Error("Expected combat");
      return {
        rng: r.rng,
        hand: r.scene.hand.map((c) => c.uid),
        draw: r.scene.draw.map((c) => c.uid),
        enemies: r.scene.enemies.map((e) => [e.def, e.hp, e.strength]),
      };
    });
    const baseline = signatures[0];
    if (!baseline) throw new Error("Missing matched cases");
    for (const signature of signatures) expect(signature).toEqual(baseline);
  });

  test("records first loss and timeout rather than silently continuing; counts winning turn", () => {
    const run = shortStart("recovery-v03-1", "quiet", "fury", 45);
    const loss = fight(run);
    expect(loss.outcome).toBe("loss");
    expect(loss.run.hp).toBe(0);
    expect(loss.turns).toBeGreaterThan(0);
    expect(fight(run, "greedy", 0).outcome).toBe("timeout");
    const winner = fight(shortStart("recovery-v03-1", "defense", "fury", 70));
    expect(winner.turns).toBe(5);
    expect(winner.trace.filter((a) => a.endsWith(" end")).length).toBe(4);
    expect(fight(run)).toEqual(loss);
  });

  test("upgrade can beat rest on both final health and turns", () => {
    const first = fight(shortStart("recovery-v03-1", "exposed", "fury", 70));
    expect(first.run.hp).toBe(44);
    const rest = fight(
      followup(
        first.run,
        "rest",
        "exposed",
        "elite",
        "recovery-v03-1/second/elite",
      ).run,
    );
    const upgrade = fight(
      followup(
        first.run,
        "primary",
        "exposed",
        "elite",
        "recovery-v03-1/second/elite",
      ).run,
    );
    expect([rest.run.hp, rest.turns]).toEqual([26, 7]);
    expect([upgrade.run.hp, upgrade.turns]).toEqual([29, 6]);
  });

  test("reachable one-turn healing delay beats every same-turn kill, but bread exhausts", () => {
    const first = fight(shortStart("recovery-v03-1", "defense", "fury", 70));
    let run = followup(
      first.run,
      "rest",
      "defense",
      "battle",
      "recovery-v03-1/second/battle",
    ).run;
    for (let i = 0; i < 14; i++) run = step(run, combatAction(run));
    if (run.scene.kind !== "combat") throw new Error("Expected combat");
    expect([run.hp, run.scene.turn, run.scene.energy, run.scene.block]).toEqual(
      [68, 4, 1, 9],
    );
    let nodes = 0;
    function sameTurnBest(state: Run): number {
      if (++nodes > 100) throw new Error("Enumeration bound exceeded");
      if (state.scene.kind === "reward") return state.hp;
      if (state.scene.kind !== "combat") return -1;
      let best = -1;
      for (const card of state.scene.hand) {
        if (cardDef(card.def).cost > state.scene.energy) continue;
        const targets = needsTarget(cardDef(card.def))
          ? state.scene.enemies.filter((e) => e.hp > 0).map((e) => e.uid)
          : [null];
        for (const target of targets)
          best = Math.max(
            best,
            sameTurnBest(step(state, { type: "play", uid: card.uid, target })),
          );
      }
      return best;
    }
    expect(sameTurnBest(run)).toBe(68);
    expect(nodes).toBe(4);
    const delayed = fight(step(run, { type: "end" }), "heal-first", 30);
    expect(delayed.outcome).toBe("win");
    expect([delayed.run.hp, delayed.turns]).toEqual([70, 5]);
    expect(delayed.trace).toEqual([
      "t5 hp66 bash#15 -> 28",
      "t5 hp66 bread#24 -> null",
      "t5 hp70 shield#14 -> 28",
    ]);
    expect(cardDef("bread").exhaust).toBe(true);
  });
});
