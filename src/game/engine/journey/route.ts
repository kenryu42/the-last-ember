import type { NodeKind, RouteNode, Run } from "../../model";
import { shuffle } from "../rng";
export function generateRoute(run: Run): RouteNode[] {
  const rows: NodeKind[][] = [
    ["battle", "battle", "battle"],
    ["event", "elite", "shop"],
    ["camp", "camp", "camp"],
    ["battle", "event", "elite"],
    ["camp", "shop", "camp"],
  ];
  const nodes: RouteNode[] = [];
  rows.forEach((types, row) =>
    shuffle(run, types).forEach((kind, lane) =>
      nodes.push({
        id: `${run.act}-${row}-${lane}`,
        row,
        lane,
        kind,
        links: [0, 1, 2].map((next) => `${run.act}-${row + 1}-${next}`),
      }),
    ),
  );
  // Three final approaches converge on the same Act guardian.
  for (const lane of [0, 1, 2])
    nodes.push({
      id: `${run.act}-5-${lane}`,
      row: 5,
      lane,
      kind: "boss",
      links: [],
    });
  return nodes;
}
