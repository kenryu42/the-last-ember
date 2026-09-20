import type { Frame } from "../../game/model";
import type { AttackKind } from "./attack-timeline";

export function frameAttack(frame: Frame | null): AttackKind | null {
  if (!frame) return null;
  if (frame.cue === "blade" || frame.cue === "arrow" || frame.cue === "spell")
    return frame.cue;
  if (frame.cue !== "enemy" || frame.run.scene.kind !== "combat") return null;
  return (
    frame.run.scene.enemies.find((enemy) => enemy.uid === frame.target)?.def ??
    null
  );
}
