import { ACTS } from "../../game/content/world";
import { needsActBearer } from "../../game/selectors/bearer";
import { reachable } from "../../game/selectors/route";
import type { Action, Run } from "../../game/model";
import { BearerSelection } from "./BearerSelection";
export function JourneyCrossroads({
  run,
  dispatch,
  busy = false,
}: {
  run: Run;
  dispatch: (action: Action) => void;
  busy?: boolean;
}) {
  if (needsActBearer(run)) return <BearerSelection run={run} dispatch={dispatch} busy={busy} />;
  const act = ACTS[run.act];
  const location = act?.crossroads[run.row + 1];
  const paths = run.route.filter((node) => reachable(run, node)).sort((a, b) => a.lane - b.lane);
  return (
    <section className="crossroads scene-enter" aria-labelledby="crossroads-title">
      <div className="crossroads-view">
        <div className="crossroads-canvas">
          <img
            className="crossroads-landscape"
            src={`/assets/journey/${act?.file}-${run.row + 2}.webp`}
            alt={`${location?.name}: three paths through ${act?.place}.`}
            fetchPriority="high"
          />
          <div className="crossroads-shade" aria-hidden="true" />
          <nav className="crossroads-paths" aria-label="Choose a path">
            {location?.pathAnchors.map(([x, y], lane, anchors) => {
              const node = paths.find((path) => path.lane === lane);
              if (!node) return null;
              const previous = anchors[lane - 1];
              const next = anchors[lane + 1];
              const left = previous ? (previous[0] + x) / 2 : 0;
              const right = next ? (x + next[0]) / 2 : 100;
              return (
                <button
                  key={node.id}
                  type="button"
                  data-node={node.id}
                  className="crossroads-path"
                  style={{ left: `${left}%`, width: `${right - left}%` }}
                  aria-label={
                    ["Take the left path", "Go straight ahead", "Take the right path"][lane]
                  }
                  aria-describedby="crossroads-hint"
                  onClick={() => dispatch({ type: "travel", node: node.id })}
                >
                  <span
                    className="path-marker"
                    style={{
                      left: `${((x - left) / (right - left)) * 100}%`,
                      top: `${y}%`,
                    }}
                    aria-hidden="true"
                  >
                    <span className="path-bearing">{["↖", "↑", "↗"][lane]}</span>
                    <span className="path-label">
                      {["Left path", "Straight ahead", "Right path"][lane]}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <header className="crossroads-heading">
        <div>
          <p className="eyebrow">
            Act {["I", "II", "III"][run.act]} · {act?.place}
          </p>
          <h1 id="crossroads-title">{location?.name}</h1>
          <p className="story-copy">{location?.description}</p>
          <p className="crossroads-hint" id="crossroads-hint">
            Choose a path in the landscape.
          </p>
        </div>
        <p className="crossroads-progress">Crossroads {run.row + 2} of 6</p>
      </header>
    </section>
  );
}
