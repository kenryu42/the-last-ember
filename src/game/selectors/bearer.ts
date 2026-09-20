import type { Run } from "../model";
export function needsActBearer(run: Run): boolean {
  return (
    run.prototype?.ember === true &&
    run.actBearer === null &&
    run.scene.kind === "map" &&
    run.row === -1
  );
}
