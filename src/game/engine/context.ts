import type { Combat, Cue, Frame, Resolution, Run } from "../model";
import type { RulesMode } from "./rules";

// One resolution owns the mutable draft, ordered snapshots, and accounting.
export interface ResolutionContext {
  run: Run;
  mode: RulesMode;
  accounting: Resolution["accounting"];
  emit: (cue: Cue, target: Frame["target"], text: string) => void;
  fail: (error: string) => Resolution;
  finish: () => Resolution;
  endIfDead: () => boolean;
  win: (combat: Combat) => void;
}
