import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import type { EnemyKind } from "../game/content";

export type AttackKind = EnemyKind | "blade" | "arrow" | "spell";
export type AttackStage = "anticipate" | "impact";
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

/** Each game stage owns its clock. Impact never begins before damage resolves. */
export function createAttackTimeline(
  kind: AttackKind,
  body: PIXI.Container,
  stage: AttackStage,
  milliseconds: number,
) {
  const impact = stage === "impact";
  const motion = {
    wind: impact ? 1 : 0,
    strike: impact ? 1 : 0,
    opacity: impact ? 1 : 0,
    charge: impact ? 1 : 0,
    fade: 1,
    burst: 0,
    time: 0,
  };
  const timeline = gsap.timeline({ paused: true });
  const duration = milliseconds / 1000;
  const soft = ["spell", "wolf", "crow", "shade"].includes(kind);
  if (!impact) {
    timeline.to(
      motion,
      {
        wind: 1,
        opacity: 1,
        charge: 1,
        duration: duration * 0.62,
        ease: "power2.out",
      },
      0,
    );
    timeline.to(
      motion,
      {
        strike: 1,
        duration: duration * 0.38,
        ease:
          kind === "arrow"
            ? "expo.in"
            : ["shade", "hollow"].includes(kind)
              ? "sine.inOut"
              : "power3.in",
      },
      duration * 0.62,
    );
    timeline.fromTo(
      body,
      { pixi: { scaleX: 1, scaleY: 1 } },
      {
        pixi: { scaleX: soft ? 0.93 : 1, scaleY: soft ? 1.06 : 1 },
        duration: duration * 0.62,
        ease: "power2.inOut",
      },
      0,
    );
    timeline.to(
      body,
      {
        pixi: { scaleX: soft ? 1.12 : 1, scaleY: soft ? 0.91 : 1 },
        duration: duration * 0.38,
        ease: "power4.in",
      },
      duration * 0.62,
    );
  } else {
    timeline.to(
      motion,
      { burst: 1, duration: duration * 0.45, ease: "power3.out" },
      0,
    );
    timeline.to(
      motion,
      { opacity: 0, fade: 0, duration: duration * 0.85, ease: "power2.out" },
      duration * 0.15,
    );
    timeline.fromTo(
      body,
      { pixi: { scaleX: soft ? 1.12 : 1, scaleY: soft ? 0.91 : 1 } },
      {
        pixi: { scaleX: 1, scaleY: 1 },
        duration: duration * 0.65,
        ease: "back.out(1.3)",
      },
      duration * 0.15,
    );
  }
  timeline.to(motion, { time: impact ? 750 : 600, duration, ease: "none" }, 0);
  return { timeline, motion };
}
