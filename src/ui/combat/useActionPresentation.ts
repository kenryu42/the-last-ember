import { useState } from "react";
import { flushSync } from "react-dom";
import { cardDef } from "../../game/content/cards";
import type { Action, Card, Frame, Resolution, Run } from "../../game/model";
import type { Settings } from "../../platform/browser/settings";
import { sound } from "../audio/audio";
import { attackTiming, powerfulCard } from "./combat-effects";
import {
  animateDeal,
  animateDiscard,
  animateShuffle,
  discardedHand,
  drawSequence,
} from "./card-motion";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Only resolved snapshots enter presentation. Saving and input locking belong to the session.
export function useActionPresentation() {
  const [visual, setVisual] = useState<Run | null>(null);
  const [feedback, setFeedback] = useState<Frame | null>(null);
  const [stage, setStage] = useState<"anticipate" | "impact">("impact");
  const [actingCard, setActingCard] = useState<Card | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const play = async (before: Run, action: Action, result: Resolution, settings: Settings) => {
    const speed = settings.gameplaySpeed;
    setFeedback(null);
    setAnimationSpeed(speed);
    const playedCard =
      action.type === "play" && before.scene.kind === "combat"
        ? (before.scene.hand.find((card) => card.uid === action.uid) ?? null)
        : null;
    setActingCard(playedCard);
    if (action.type === "play" && !settings.reduced) {
      const source = document.querySelector<HTMLElement>(`.hand [data-card="${action.uid}"]`);
      const destination = document
        .querySelector(
          playedCard && cardDef(playedCard.def).exhaust
            ? '[data-pile="exhaust"]'
            : '[data-pile="discard"] .pile-stack',
        )
        ?.getBoundingClientRect();
      if (source && destination) {
        const rect = source.getBoundingClientRect(),
          ghost = source.cloneNode(true);
        if (ghost instanceof HTMLElement) {
          ghost.classList.add("flying-card");
          ghost.classList.remove("selected");
          ghost.setAttribute("aria-hidden", "true");
          ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;--card-width:${rect.width}px;width:${rect.width}px;height:${rect.height}px;transform-origin:top left;animation:none;`;
          document.body.append(ghost);
          const animation = ghost.animate(
            [
              { transform: "translateY(-10px) scale(1)", opacity: 1 },
              {
                transform: `translate(${destination.left - rect.left}px,${destination.top - rect.top}px) scale(${destination.width / rect.width}) rotate(4deg)`,
                opacity: 0,
              },
            ],
            { duration: 540 / speed, easing: "cubic-bezier(.3,0,.5,1)" },
          );
          animation.onfinish = () => ghost.remove();
          animation.oncancel = () => ghost.remove();
        }
      }
    }
    try {
      if (before.scene.kind === "combat" && !settings.reduced) {
        let presented = before;
        flushSync(() => setVisual(before));
        if (action.type === "end") {
          const discarded = discardedHand(before.scene);
          await animateDiscard(
            before.scene.hand.filter((card) => !cardDef(card.def).retain),
            speed,
          );
          presented = { ...before, scene: discarded };
          flushSync(() => setVisual(presented));
        }
        for (const frame of result.frames) {
          setFeedback(frame);
          setStage("anticipate");
          const powerful = powerfulCard(playedCard);
          const timing = attackTiming(frame.cue, powerful, speed);
          if (["blade", "arrow", "spell", "enemy"].includes(frame.cue))
            sound(frame.cue, { phase: "launch", blocked: false, powerful });
          await delay(timing.travel);
          // Keep the board mounted until input unlocks. Revealing reward controls
          // sooner makes an apparently available click disappear into the lock.
          setStage("impact");
          sound(frame.cue, {
            phase: "impact",
            blocked: frame.text.includes("blocked"),
            powerful,
          });
          if (frame.run.scene.kind === "combat" && presented.scene.kind === "combat") {
            const sequence = drawSequence(presented.scene, frame.run.scene);
            flushSync(() => setVisual({ ...frame.run, scene: sequence.initial }));
            for (const step of sequence.steps) {
              if (step.kind === "shuffle") await animateShuffle(speed);
              flushSync(() => setVisual({ ...frame.run, scene: step.combat }));
              if (step.kind === "draw") await animateDeal(step.cards, speed);
            }
            presented = frame.run;
            setVisual(frame.run);
          }
          await delay(timing.impact);
        }
      } else if (result.frames.length) {
        const last = result.frames.at(-1);
        if (last) {
          setFeedback(last);
          sound(last.cue);
        }
      }
      setVisual(null);
    } finally {
      setVisual(null);
    }
  };
  return {
    visual,
    feedback,
    stage,
    actingCard,
    animationSpeed,
    play,
    clear: () => setFeedback(null),
  };
}
