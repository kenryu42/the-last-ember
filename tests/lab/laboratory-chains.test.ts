import { expect, test } from "bun:test";
import { probeChain, probeStall } from "../../src/lab/chains";

test("full-pool resource and draw chains terminate within independently derived bounds", () => {
  for (const copies of [1, 3] as const)
    for (const upgraded of [false, true]) {
      const result = probeChain("chain-regression", copies, upgraded);
      // Rally + Spark + Sacrifice provide 4 energy base, 6 upgraded per set.
      expect(result.energyBound).toBe(3 + copies * (upgraded ? 6 : 4));
      expect(result.spent).toBeLessThanOrEqual(result.energyBound);
      expect(result.actions).toBeLessThanOrEqual(result.actionBound);
      expect(result).toEqual(probeChain("chain-regression", copies, upgraded));
    }
});

test("full-pool fuzzing crosses enemy phases without reusing exhausted energy", () => {
  for (const encounterId of ["fury", "reinforce", "ward"] as const) {
    const result = probeChain("phase-chain-regression", 3, true, {
      turnLimit: 10,
      encounterId,
    });
    expect(result.energyBound).toBe(30 + 18);
    expect(result.generated).toBeLessThanOrEqual(18);
    expect(result.spent).toBeLessThanOrEqual(result.energyBound);
    expect(result.trace.some((a) => a.type === "end")).toBe(true);
    expect(result.actions).toBeLessThanOrEqual(result.actionBound);
  }
});

test("deliberate all-defense stall is bounded by the lab, while one payoff exits it", () => {
  const control = probeStall("lab-stall-v1", false);
  expect(control.outcome).toBe("turn-limit");
  expect(control.hp).toBe(70);
  expect(control.turns).toBe(200);
  expect(control.trace).toHaveLength(800);
  const candidate = probeStall("lab-stall-v1", true);
  expect(candidate.outcome).toBe("win");
  expect(candidate.hp).toBe(70);
  expect(candidate.turns).toBe(2); // Victory during turn 3, after two enemy phases.
  expect(candidate.trace).toHaveLength(11);
});
