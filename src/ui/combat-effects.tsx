import { useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cardDef } from "../game/content";
import type { Card, Cue, Frame } from "../game/model";
import "./combat-effects.css";

export function powerfulCard(card: Card | null) {
  return card !== null && (card.upgraded || cardDef(card.def).cost >= 2);
}
export function attackTiming(cue: Cue, powerful: boolean) {
  if (cue === "spell") return { travel: powerful ? 420 : 340, impact: 320 };
  if (cue === "blade" || cue === "arrow") return { travel: 240, impact: 280 };
  if (cue === "enemy") return { travel: 200, impact: 280 };
  return { travel: 60, impact: cue === "draw" ? 90 : 260 };
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
}: {
  frame: Frame;
  stage: "anticipate" | "impact";
  card: Card | null;
}) {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const powerful = powerfulCard(card);
  const timing = attackTiming(frame.cue, powerful);
  useLayoutEffect(() => {
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
    setGeometry({ x, y, dx, dy, angle: (Math.atan2(dy, dx) * 180) / Math.PI });
  }, [frame, card]);
  if (
    !geometry ||
    ["draw", "reward", "victory", "defeat", "death"].includes(frame.cue)
  )
    return null;
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
  return createPortal(
    <div
      aria-hidden="true"
      className={`combat-fx fx-${frame.cue} ${powerful ? "fx-powerful" : ""} ${blocked ? "fx-blocked" : ""}`}
      style={style}
    >
      {stage === "anticipate" ? (
        frame.cue === "spell" ||
        frame.cue === "arrow" ||
        frame.cue === "enemy" ? (
          <div className="fx-flight">
            <div className="fx-direction">
              {frame.cue === "spell" ? (
                <div className="fx-fireball">
                  <i />
                  <i />
                  <i />
                </div>
              ) : frame.cue === "arrow" ? (
                <svg className="fx-arrow-shaft" viewBox="0 0 150 30">
                  <path d="M4 15H134M120 6l22 9-22 9 5-9ZM12 15 2 5M19 15 9 5M12 15 2 25M19 15 9 25" />
                </svg>
              ) : (
                <div className="fx-enemy-streak" />
              )}
            </div>
          </div>
        ) : frame.cue === "blade" ? (
          <div className="fx-at-target">
            <svg className="fx-sword-windup" viewBox="0 0 240 240">
              <path d="M40 195 181 28 197 22 196 40 58 211ZM28 177 77 219M33 209 20 224" />
            </svg>
          </div>
        ) : null
      ) : (
        <div className="fx-at-target">
          {frame.cue === "blade" ? (
            <svg className="fx-sword-cut" viewBox="0 0 240 240">
              <path
                className="fx-cut-shadow"
                d="M16 205Q115 72 225 35Q158 90 16 205Z"
              />
              <path className="fx-cut-edge" d="M16 205Q115 72 225 35" />
              <path className="fx-cut-second" d="M30 207Q133 106 215 67" />
            </svg>
          ) : frame.cue === "shield" || blocked ? (
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
                animationDelay: `${(i % 3) * 12}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
