import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { cardDef, needsTarget } from "../../game/content/cards";
import type { Card } from "../../game/model";
import { CardView } from "./CardView";
export function Hand({
  cards,
  energy,
  cost,
  selected,
  select,
  busy,
}: {
  cards: Card[];
  energy: number;
  cost: (card: Card) => number;
  selected: number | null;
  select: (card: Card) => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const touch = useRef(false);
  const [width, setWidth] = useState(900);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [inspected, setInspected] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    const resize = () => setViewportHeight(window.innerHeight);
    resize();
    window.addEventListener("resize", resize);
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target))
        setInspected(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspected(null);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => setInspected(null), [cards, busy]);

  const cardWidth = width < 500 ? 140 : viewportHeight <= 800 ? 150 : 170;
  // Reserve room for the outer cards' rotation. Never squeeze exposed hit areas
  // below 44px; a full hand becomes multiple shallow fans on narrow screens.
  const perRow = Math.max(1, Math.floor((width - cardWidth - 32) / 44) + 1);
  const rows = Math.max(1, Math.ceil(cards.length / perRow));
  const rowSize = Math.ceil(cards.length / rows);
  const rowHeight = (cardWidth * 326) / 230 + 56;
  const inspection = cards.find((card) => card.uid === inspected);
  return (
    <div ref={ref} className="hand-window">
      <div
        className="hand"
        role="group"
        aria-label={`Hand, ${cards.length} cards`}
        style={{ height: rows * rowHeight }}
        onKeyDown={(event) => {
          touch.current = false;
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              ".game-card",
            ),
          ];
          const index = buttons.findIndex(
            (button) => button === document.activeElement,
          );
          if (index < 0) return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }}
      >
        {cards.map((card, index) => {
          const row = Math.floor(index / rowSize);
          const position = index % rowSize;
          const count = Math.min(rowSize, cards.length - row * rowSize);
          const step =
            count > 1
              ? Math.min(cardWidth + 8, (width - cardWidth - 32) / (count - 1))
              : 0;
          const left =
            (width - cardWidth - step * (count - 1)) / 2 + position * step;
          const offset = count > 1 ? (position / (count - 1)) * 2 - 1 : 0;
          const previewWidth = Math.min(230, width - 16);
          const previewLeft = Math.max(
            8,
            Math.min(
              width - previewWidth - 8,
              left - (previewWidth - cardWidth) / 2,
            ),
          );
          const style: CSSProperties & Record<`--${string}`, string | number> =
            {
              left,
              top: row * rowHeight + 26,
              width: cardWidth,
              height: (cardWidth * 326) / 230,
              "--card-width": `${cardWidth}px`,
              "--fan-angle": `${offset * 5}deg`,
              "--fan-drop": `${offset * offset * 12}px`,
              "--inspect-shift": `${previewLeft - left}px`,
              "--inspect-scale": previewWidth / cardWidth,
              "--hand-order": index + 1,
            };
          return (
            <div
              key={card.uid}
              className={`hand-card ${inspected === card.uid ? "inspected" : ""} ${selected === card.uid ? "targeting" : ""}`}
              style={style}
              onPointerDownCapture={(event) => {
                touch.current = event.pointerType !== "mouse";
              }}
            >
              <CardView
                card={card}
                cost={cost(card)}
                onClick={() => {
                  if (busy) return;
                  if (touch.current) setInspected(card.uid);
                  else if (cost(card) <= energy) select(card);
                }}
                unavailable={busy || cost(card) > energy}
                selected={selected === card.uid}
                allowArtPreview={selected === null && !busy}
              />
            </div>
          );
        })}
        {!cards.length && (
          <p className="empty-hand">
            {busy
              ? "Resolving…"
              : "Your hand is empty. End the turn to draw again."}
          </p>
        )}
      </div>
      {inspection && !busy && (
        <div className="hand-touch-action">
          <span>{cardDef(inspection.def).name}</span>
          <button
            className="primary"
            disabled={cost(inspection) > energy}
            onClick={() => {
              setInspected(null);
              select(inspection);
            }}
          >
            {cost(inspection) > energy
              ? "Not enough energy"
              : needsTarget(cardDef(inspection.def))
                ? "Choose target"
                : "Play card"}
          </button>
          <button
            aria-label="Close card inspection"
            onClick={() => setInspected(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
