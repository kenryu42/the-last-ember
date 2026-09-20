import { useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cardDef } from "../game/content";
import type { Card, Cue, Frame } from "../game/model";
import { PixiCombatLayer } from "./pixi-combat-layer";
import { frameAttack } from "./attack-kind";
import type { AttackRequest } from "./pixi-attacks";
import "./combat-effects.css";

export function powerfulCard(card: Card | null) {
  return card !== null && (card.upgraded || cardDef(card.def).cost >= 2);
}
export function attackTiming(cue: Cue, powerful: boolean, speed: number) {
  const timing =
    cue === "spell"
      ? { travel: powerful ? 630 : 510, impact: 480 }
      : cue === "blade" || cue === "arrow"
        ? { travel: 360, impact: 420 }
        : cue === "enemy"
          ? { travel: 300, impact: 420 }
          : { travel: 90, impact: cue === "draw" ? 135 : 390 };
  return { travel: timing.travel / speed, impact: timing.impact / speed };
}

type Geometry = { x: number; y: number; dx: number; dy: number; angle: number };
type EffectStyle = CSSProperties & {
  "--dx": string;
  "--dy": string;
  "--angle": string;
  "--travel": string;
  "--impact": string;
};

/** Presentation only. Geometry is read once per effect, never once per frame. */
export function CombatEffects({
  frame,
  stage,
  card,
  speed,
}: {
  frame: Frame | null;
  stage: "anticipate" | "impact";
  card: Card | null;
  speed: number;
}) {
  const [geometry, setGeometry] = useState<
    (Geometry & { frame: Frame }) | null
  >(null);
  const powerful = powerfulCard(card);
  const timing = attackTiming(frame?.cue ?? "draw", powerful, speed);
  useLayoutEffect(() => {
    if (!frame) {
      setGeometry(null);
      return;
    }
    const owner = card ? cardDef(card.def).owner : "Mara";
    const party = document
      .querySelector(".party-health")
      ?.getBoundingClientRect();
    const companion = document
      .querySelector(`[data-companion="${owner}"]`)
      ?.getBoundingClientRect();
    const enemy =
      typeof frame.target === "number"
        ? document
            .querySelector(`[data-enemy="${frame.target}"]`)
            ?.getBoundingClientRect()
        : null;
    const source =
      frame.cue === "enemy"
        ? enemy
        : companion && companion.width > 0
          ? companion
          : party;
    const target = frame.cue === "enemy" ? party : (enemy ?? party);
    if (!source || !target) {
      setGeometry(null);
      return;
    }
    const x = source.left + source.width / 2,
      y = source.top + source.height / 2;
    const dx = target.left + target.width / 2 - x,
      dy = target.top + target.height * 0.45 - y;
    setGeometry({
      frame,
      x,
      y,
      dx,
      dy,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    });
  }, [frame, card]);
  const kind = frameAttack(frame);
  const request = useMemo<AttackRequest | null>(
    () =>
      kind && frame && geometry?.frame === frame
        ? {
            kind,
            geometry,
            stage,
            powerful,
            blocked: frame.text.includes("blocked"),
            duration: stage === "anticipate" ? timing.travel : timing.impact,
          }
        : null,
    [kind, frame, geometry, stage, powerful, timing.travel, timing.impact],
  );
  const layer = <PixiCombatLayer request={request} />;
  if (
    !frame ||
    !geometry ||
    geometry.frame !== frame ||
    kind ||
    stage !== "impact" ||
    ["draw", "reward", "victory", "defeat", "death"].includes(frame.cue)
  )
    return <>{layer}</>;
  const style: EffectStyle = {
    left: geometry.x,
    top: geometry.y,
    "--dx": `${geometry.dx}px`,
    "--dy": `${geometry.dy}px`,
    "--angle": `${geometry.angle}deg`,
    "--travel": `${timing.travel}ms`,
    "--impact": `${timing.impact}ms`,
  };
  const blocked = frame.text.includes("blocked");
  return (
    <>
      {layer}
      {createPortal(
        <div
          aria-hidden="true"
          className={`combat-fx fx-${frame.cue} ${powerful ? "fx-powerful" : ""} ${blocked ? "fx-blocked" : ""}`}
          style={style}
        >
          <div className="fx-at-target">
            {frame.cue === "shield" || blocked ? (
              <svg className="fx-shield-shape" viewBox="0 0 200 220">
                <path d="M100 16 170 46V113Q162 171 100 206Q38 171 30 113V46Z" />
                <path d="M100 43V177M53 78H147" />
              </svg>
            ) : frame.cue === "heal" ? (
              <div className="fx-healing-light" />
            ) : (
              <div className="fx-burst" />
            )}
            <div className="fx-shockwave" />
            {Array.from({ length: powerful ? 12 : 8 }, (_, i) => (
              <span
                className="fx-spark"
                key={i}
                style={{
                  rotate: `${i * 137.5}deg`,
                  animationDelay: `${((i % 3) * 18) / speed}ms`,
                }}
              />
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
