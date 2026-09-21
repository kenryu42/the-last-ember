import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { cardDef, needsTarget } from "../../game/content/cards";
import { cardCost } from "../../game/selectors/combat";
import type { Action, Combat, Run } from "../../game/model";

type Aim = {
  combat: Combat;
  uid: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  target: number | null;
  width: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function useCardTargetDrag({
  run,
  combat,
  busy,
  dispatch,
}: {
  run: Run;
  combat: Combat;
  busy: boolean;
  dispatch: (action: Action) => void;
}) {
  const [aim, setAim] = useState<Aim | null>(null);
  const gesture = useRef<{
    pointer: number;
    element: HTMLElement;
    origin: Aim;
    dragging: boolean;
    targets: { x: number; y: number }[];
    startDistance: number;
  } | null>(null);
  const suppressClick = useRef(false);
  function cancel() {
    const current = gesture.current;
    gesture.current = null;
    if (current?.element.hasPointerCapture(current.pointer))
      current.element.releasePointerCapture(current.pointer);
    setAim(null);
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
      const current = gesture.current;
      gesture.current = null;
      if (current?.element.hasPointerCapture(current.pointer))
        current.element.releasePointerCapture(current.pointer);
    };
  }, [combat, busy]);
  function targetAt(x: number, y: number) {
    const element = document.elementFromPoint(x, y)?.closest<HTMLButtonElement>(".enemy-target");
    if (!element || element.disabled) return null;
    const uid = Number(element.dataset.enemy);
    return combat.enemies.some((enemy) => enemy.uid === uid && enemy.hp > 0) ? uid : null;
  }
  const handlers: HTMLAttributes<HTMLElement> = {
    onPointerDownCapture(event) {
      if (gesture.current || !event.isPrimary || event.button !== 0 || busy) return;
      suppressClick.current = false;
      const button =
        event.target instanceof Element ? event.target.closest(".hand .game-card") : null;
      if (!(button instanceof HTMLButtonElement)) return;
      const card = combat.hand.find((card) => card.uid === Number(button.dataset.card));
      if (
        !card ||
        !needsTarget(cardDef(card.def)) ||
        cardCost(run, combat, cardDef(card.def)) > combat.energy
      )
        return;
      const targets = [
        ...event.currentTarget.querySelectorAll<HTMLButtonElement>(".enemy-target:not(:disabled)"),
      ].map((enemy) => {
        const rect = enemy.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      if (!targets.length) return;
      const rect = button.getBoundingClientRect();
      gesture.current = {
        pointer: event.pointerId,
        element: button,
        dragging: false,
        targets,
        startDistance: Math.max(
          1,
          Math.min(
            ...targets.map((target) =>
              Math.hypot(event.clientX - target.x, event.clientY - target.y),
            ),
          ),
        ),
        origin: {
          combat,
          width: rect.width,
          scale: 1,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          uid: card.uid,
          startX: event.clientX,
          startY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          target: null,
        },
      };
    },
    onPointerMove(event) {
      const current = gesture.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (
        !current.dragging &&
        Math.hypot(event.clientX - current.origin.startX, event.clientY - current.origin.startY) < 8
      )
        return;
      current.dragging = true;
      suppressClick.current = true;
      current.element.setPointerCapture(event.pointerId);
      event.preventDefault();
      const distance = Math.min(
        ...current.targets.map((target) =>
          Math.hypot(event.clientX - target.x, event.clientY - target.y),
        ),
      );
      setAim({
        ...current.origin,
        scale: 0.35 + 0.65 * Math.min(1, distance / current.startDistance),
        x: event.clientX,
        y: event.clientY,
        target: targetAt(event.clientX, event.clientY),
      });
    },
    onPointerUp(event) {
      const current = gesture.current;
      if (!current || current.pointer !== event.pointerId) return;
      const target = current.dragging ? targetAt(event.clientX, event.clientY) : null;
      cancel();
      if (target !== null && !busy) dispatch({ type: "play", uid: current.origin.uid, target });
    },
    onPointerCancel(event) {
      if (gesture.current?.pointer === event.pointerId) cancel();
    },
    onLostPointerCapture(event) {
      if (event.target === gesture.current?.element) cancel();
    },
    onDragStart(event) {
      if (gesture.current) event.preventDefault();
    },
    onClickCapture(event) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  return { aim: !busy && aim?.combat === combat ? aim : null, handlers };
}
