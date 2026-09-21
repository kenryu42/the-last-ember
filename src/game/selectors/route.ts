import type { RouteNode, Run } from "../model";
export function reachable(run: Run, node: RouteNode) {
  if (run.scene.kind !== "map" || node.row !== run.row + 1) return false;
  return (
    run.location === null || !!run.route.find((n) => n.id === run.location)?.links.includes(node.id)
  );
}
