import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ACTS, EVENTS } from "../../game/content/world";
import { enemyDef } from "../../game/content/enemies";
import type { Combat, RouteNode, Run } from "../../game/model";

export function encounterArt(run: Pick<Run, "act" | "scene">) {
  const act = ACTS[run.act];
  if (!act) return null;
  const scene = run.scene;
  switch (scene.kind) {
    case "combat":
      return {
        src: `/assets/encounters/${act.file}/${scene.enemies
          .map((enemy) => enemy.def)
          .sort()
          .join("-")}.webp`,
        alt: `${scene.enemies.map((enemy) => enemyDef(enemy.def).name).join(", ")} blocking the way through ${act.place}.`,
      };
    case "shop":
      return {
        src: `/assets/encounters/${act.file}/shop.webp`,
        alt: `A wayside merchant and their wares in ${act.place}.`,
      };
    case "camp":
      return {
        src: `/assets/encounters/${act.file}/camp.webp`,
        alt: `A sheltered fire and three bedrolls in ${act.place}.`,
      };
    case "event": {
      const event = EVENTS[scene.event];
      return event
        ? {
            src: `/assets/encounters/events/${event.art}.webp`,
            alt: event.title,
          }
        : null;
    }
    case "map":
    case "reward":
    case "ending":
      return null;
    default: {
      const exhaustive: never = scene;
      return exhaustive;
    }
  }
}

export function EncounterIllustration({
  art,
}: {
  art: NonNullable<ReturnType<typeof encounterArt>>;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="encounter-illustration">
      {failed ? (
        <output className="art-status" style={{ display: "block" }}>
          Illustration unavailable. You can still continue.
        </output>
      ) : (
        <img src={art.src} alt={art.alt} fetchPriority="high" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

export function approachDuration(speed: number, reduced: boolean) {
  return reduced ? 160 : 1100 / speed;
}

export function ArrivalTransition({
  from,
  node,
  destination,
  speed,
  reduced,
  complete,
}: {
  from: Run;
  node: RouteNode;
  destination: Run;
  speed: number;
  reduced: boolean;
  complete: () => void;
}) {
  const skip = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    complete();
  }, [complete]);
  const act = ACTS[from.act];
  const anchor = act?.crossroads[from.row + 1]?.pathAnchors[node.lane];
  const art = encounterArt(destination);
  const duration = approachDuration(speed, reduced);
  useEffect(() => {
    const timer = window.setTimeout(finish, duration);
    return () => window.clearTimeout(timer);
  }, [duration, finish]);
  useLayoutEffect(() => {
    skip.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  const style: CSSProperties & { "--approach-duration": string } = {
    "--approach-duration": `${duration}ms`,
  };
  return (
    <section
      className={`arrival ${reduced ? "arrival-reduced" : ""}`}
      style={style}
      aria-labelledby="arrival-title"
    >
      {art && <link rel="preload" as="image" href={art.src} />}
      <div className="arrival-view">
        <div className="arrival-canvas">
          <img
            className="arrival-landscape"
            src={`/assets/journey/${act?.file}-${from.row + 2}.webp`}
            alt=""
            style={{
              transformOrigin: anchor ? `${anchor[0]}% ${anchor[1]}%` : undefined,
            }}
          />
        </div>
        <div className="arrival-shade" />
      </div>
      <div className="arrival-copy">
        <output id="arrival-title" style={{ display: "block" }}>
          {
            [
              "Following the left trail…",
              "Following the trail ahead…",
              "Following the right trail…",
            ][node.lane]
          }
        </output>
        <button ref={skip} className="secondary" onClick={finish}>
          Skip approach
        </button>
      </div>
    </section>
  );
}

export function EncounterIntro({
  run,
  combat,
  enter,
}: {
  run: Run;
  combat: Combat;
  enter: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const art = encounterArt(run);
  useLayoutEffect(() => {
    if (!document.querySelector("dialog[open]")) heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  return (
    <section className="encounter-intro scene-enter" aria-labelledby="encounter-title">
      {art && <EncounterIllustration key={art.src} art={art} />}
      <div className="encounter-copy">
        <header>
          <p className="eyebrow">
            {ACTS[run.act]?.place} ·{" "}
            {combat.type === "boss"
              ? "The guardian awaits"
              : combat.type === "elite"
                ? "A formidable presence"
                : "An encounter on the road"}
          </p>
          <h1 id="encounter-title" tabIndex={-1} ref={heading}>
            {combat.encounter}
          </h1>
          <p className="story-copy">
            {combat.objective
              ? "The way out is blocked. Keep the fellowship moving while you hold them back."
              : "Your companions draw close. Something stands between you and the road ahead."}
          </p>
        </header>
        <button className="primary encounter-start" onClick={enter}>
          Prepare for battle
        </button>
      </div>
    </section>
  );
}
