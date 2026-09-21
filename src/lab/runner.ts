import { resolve } from "../game/engine/resolve";
import { beginRecord, recordAction, summarize } from "./recording";
import type { CombatAction, Run } from "../game/model";
import { combatActionSchema } from "../game/model";
import { POLICY_VERSION, PLANNER_V2_VERSION } from "./headless-config";
import type { HeadlessConfig } from "./headless-config";
import { createHeadlessRun } from "./fixtures/headless";
import { observe } from "./observation";
import { legalActions } from "./legal-actions";
import { chooseAction } from "./policies/planner";
export class HeadlessFight {
  private run: Run;
  private record;
  private trace: CombatAction[] = [];
  private readonly policyVersion: string;
  constructor(readonly config: HeadlessConfig) {
    this.policyVersion = config.policy === "planner-v2" ? PLANNER_V2_VERSION : POLICY_VERSION;
    this.run = createHeadlessRun(config);
    this.record = beginRecord(
      {
        ...config,
        ...config.fixture,
        // Telemetry arithmetic only uses rules. Export the actual diagnostic
        // variant via result.config without extending the UI's variant schema.
        variant: config.fixture.variant === "diagnostic-mixed" ? "base" : config.fixture.variant,
        player: `${config.policy}/${this.policyVersion}`,
      },
      this.run,
    );
    // Automated results must remain byte deterministic and must not pose as human timing.
    this.record.startedAt = "automated";
  }
  outcome(): "win" | "loss" | "timeout" | "running" {
    if (this.run.scene.kind === "ending") return this.run.scene.won ? "win" : "loss";
    if (
      this.trace.length >= this.config.maxActions ||
      (this.run.scene.kind === "combat" && this.run.scene.turn > this.config.maxTurns)
    )
      return "timeout";
    return "running";
  }
  view() {
    const observation = observe(this.run, this.config.rules);
    return {
      outcome: this.outcome(),
      observation,
      legalActions: this.outcome() === "running" ? legalActions(observation) : [],
    };
  }
  step(input: unknown) {
    const action = combatActionSchema.parse(input);
    if (this.outcome() !== "running") throw new Error("Fight is terminal or budget exhausted");
    if (
      !legalActions(observe(this.run, this.config.rules)).some(
        (a) => JSON.stringify(a) === JSON.stringify(action),
      )
    )
      throw new Error("Illegal action");
    const result = resolve(this.run, action, this.config.rules);
    if (result.error) throw new Error(result.error);
    this.record = recordAction(this.record, this.run, action, result, 0, 0);
    this.run = result.run;
    this.trace.push(action);
    return this.view();
  }
  auto() {
    while (this.outcome() === "running")
      this.step(
        chooseAction(
          observe(this.run, this.config.rules),
          this.config.policy,
          `${this.config.planningSeed}:${this.trace.length}`,
          this.config.searchBudget,
        ),
      );
    return this.result();
  }
  result() {
    const metrics = summarize(this.record);
    return {
      config: this.config,
      policyVersion: this.policyVersion,
      outcome: this.outcome(),
      finalHealth: this.run.hp,
      playerTurns: this.record.result?.playerTurns ?? this.record.actions.at(-1)?.turn ?? 1,
      actionCount: this.trace.length,
      metrics,
      dreadEvents: this.record.actions.flatMap((a) => a.thresholdEvents),
      // Replay output is separate from observations and is never sent to policies.
      trace: structuredClone(this.trace),
      telemetry: structuredClone(this.record.actions),
    };
  }
}
