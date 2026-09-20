import { expect, test } from "bun:test";
import { Container } from "pixi.js";
import { createAttackTimeline } from "../../src/ui/combat/attack-timeline";

// Exercise the real GSAP timeline and Pixi transforms without requiring a GPU.
test.each(["blade", "arrow", "spell", "wolf", "sentinel"] as const)(
  "%s reaches contact exactly when combat resolves damage, at every speed",
  (kind) => {
    for (const speed of [0.5, 1, 2]) {
      const body = new Container();
      const travel = 360 / speed;
      const impact = 420 / speed;
      const { timeline, motion } = createAttackTimeline(
        kind,
        body,
        "anticipate",
        travel,
      );
      timeline.time((travel / 1000) * 0.99);
      expect(motion.strike).toBeLessThan(1);
      timeline.time(travel / 1000);
      expect(motion.strike).toBe(1);
      expect(motion.fade).toBe(1);
      expect(body.scale.x).toBeGreaterThan(0);
      // The caller maps each independent game stage to its timeline interval.
      const recovery = createAttackTimeline(kind, body, "impact", impact);
      recovery.timeline.progress(0);
      expect(recovery.motion.strike).toBe(1);
      expect(recovery.motion.fade).toBe(1);
      recovery.timeline.time(impact / 1000);
      expect(recovery.motion.fade).toBe(0);
      expect(recovery.motion.burst).toBe(1);
      timeline.kill();
      recovery.timeline.kill();
      body.destroy();
    }
  },
);
