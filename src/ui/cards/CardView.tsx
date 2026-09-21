import { cardName } from "../../game/selectors/cards";
import { useEffect, useRef, useState } from "react";
import { cardDef, effectText } from "../../game/content/cards";
import type { Card } from "../../game/model";
import { loadVideoSound, saveVideoSound } from "../../platform/browser/video-sound";
import { Icon } from "../shared/Icon";
function cardArtStyle(card: Card) {
  const def = cardDef(card.def);
  return {
    backgroundImage: `url(/assets/card-pairs-${String(Math.floor(def.art / 2) + 1).padStart(2, "0")}.webp)`,
    backgroundSize: "200% 200%",
    backgroundPosition: `${card.upgraded ? 100 : 0}% ${(def.art % 2) * 100}%`,
  };
}

export function CardPile({
  kind,
  cards,
  onClick,
}: {
  kind: "draw" | "discard";
  cards: Card[];
  onClick: () => void;
}) {
  const top = kind === "discard" ? cards.at(-1) : undefined;
  const def = top ? cardDef(top.def) : undefined;
  const layers = Math.min(4, Math.max(0, cards.length - 1));
  const label = kind === "draw" ? "Draw" : "Discard";
  return (
    <button
      type="button"
      className="pile"
      data-pile={kind}
      onClick={onClick}
      aria-label={`${label} pile, ${cards.length} cards${kind === "draw" ? ", order hidden" : ""}`}
    >
      <span className="pile-stack" aria-hidden="true" data-empty={!cards.length}>
        {Array.from({ length: layers }, (_, index) => (
          <span
            key={index}
            className="pile-layer"
            style={{
              transform: `translate(${(layers - index) * 1.5}px, ${(layers - index) * 2}px) rotate(${kind === "discard" ? (index % 2 ? -4 : 5) : -2}deg)`,
            }}
          />
        ))}
        {cards.length > 0 &&
          (kind === "draw" ? (
            <span className="card-back" />
          ) : top && def ? (
            <span className="pile-face" data-top-card={top.uid}>
              <span className="pile-face-name">{cardName(top)}</span>
              <span className="full-card-art" style={cardArtStyle(top)} />
              <span className="pile-face-rules">
                {def.effects.map((effect, index) => (
                  <span key={index}>{effectText(effect, top.upgraded)}</span>
                ))}
              </span>
            </span>
          ) : null)}
      </span>
      <span>
        {label} <b>{cards.length}</b>
      </span>
    </button>
  );
}

export function CardView({
  card,
  onClick,
  disabled = false,
  unavailable = false,
  selected = false,
  label,
  cost,
  preview = false,
  allowArtPreview = true,
}: {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  unavailable?: boolean;
  selected?: boolean;
  label?: string;
  cost?: number;
  preview?: boolean;
  allowArtPreview?: boolean;
}) {
  const def = cardDef(card.def);
  const button = useRef<HTMLButtonElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const opening = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showArt, setShowArt] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const showVideo =
    showArt &&
    allowArtPreview &&
    def.id === "flame" &&
    !card.upgraded &&
    !videoFailed &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const artStyle = cardArtStyle(card);
  function cancelOpening() {
    if (opening.current !== null) clearTimeout(opening.current);
    opening.current = null;
  }
  function keepArt() {
    cancelOpening();
    if (closing.current) clearTimeout(closing.current);
    if (allowArtPreview) {
      if (!showArt) setVideoMuted(!loadVideoSound());
      setShowArt(true);
    }
  }
  function leaveArt() {
    cancelOpening();
    if (closing.current) clearTimeout(closing.current);
    closing.current = setTimeout(() => setShowArt(false), 150);
  }
  useEffect(() => {
    cancelOpening();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelOpening();
    };
    window.addEventListener("keydown", escape, true);
    window.addEventListener("scroll", cancelOpening, true);
    window.addEventListener("resize", cancelOpening);
    window.addEventListener("blur", cancelOpening);
    document.addEventListener("visibilitychange", cancelOpening);
    return () => {
      cancelOpening();
      if (closing.current) clearTimeout(closing.current);
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", cancelOpening, true);
      window.removeEventListener("resize", cancelOpening);
      window.removeEventListener("blur", cancelOpening);
      document.removeEventListener("visibilitychange", cancelOpening);
    };
  }, [allowArtPreview]);
  if (!allowArtPreview && showArt) setShowArt(false);
  useEffect(() => {
    if (!allowArtPreview) return;
    const panel = artwork.current;
    const anchor = button.current;
    if (!showArt || !panel || !anchor) return;
    let frame = 0;
    const position = () => {
      const rect = anchor.getBoundingClientRect();
      const top = Math.max(12, rect.top);
      const width = Math.min(
        480,
        window.innerWidth - 24,
        Math.max(1, window.innerHeight - top - 12 - 38) * 1.5,
      );
      const left =
        rect.right + width + 20 <= window.innerWidth
          ? rect.right + 8
          : rect.left - width - 8 >= 12
            ? rect.left - width - 8
            : Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
      panel.style.width = `${width}px`;
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      // Transforms do not trigger ResizeObserver. Follow the card's lift and
      // hand reflow for as long as its artwork is open.
      frame = requestAnimationFrame(position);
    };
    position();
    panel.showPopover();
    const video = panel.querySelector("video");
    if (video) {
      void video.play().catch(() => {
        if (!video.isConnected) return;
        video.muted = true;
        setVideoMuted(true);
        void video.play().catch(() => {});
      });
    }
    const close = () => setShowArt(false);
    const visibilityChanged = () => {
      if (document.hidden) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", escape, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      cancelAnimationFrame(frame);
      video?.pause();
      panel.hidePopover();
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [showArt, allowArtPreview]);
  return (
    <>
      <button
        ref={button}
        type="button"
        className={`game-card ${def.owner.toLowerCase()} ${selected ? "selected" : ""} ${preview ? "upgrade-preview" : ""}`}
        data-card={card.uid}
        data-def={card.def}
        data-upgraded={card.upgraded}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) keepArt();
        }}
        onBlur={(event) => {
          if (!artwork.current?.contains(event.relatedTarget)) setShowArt(false);
        }}
        onClick={() => {
          cancelOpening();
          setShowArt(false);
          onClick?.();
        }}
        disabled={disabled}
        aria-disabled={unavailable || undefined}
        aria-label={
          label ??
          `${cardName(card)}${card.upgraded ? " upgraded" : ""}, ${cost ?? def.cost} energy. ${def.tags?.includes("Spell") ? "Spell. " : ""}${def.effects.map((e) => effectText(e, card.upgraded)).join(" ")}${def.exhaust ? " Exhaust." : ""}${def.retain ? " Retain." : ""}`
        }
        aria-pressed={selected}
      >
        <span className="card-heading">
          <span className="cost">{cost ?? def.cost}</span>
          <span>{cardName(card)}</span>
        </span>
        <span
          aria-hidden="true"
          className="art card-art"
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse" || !allowArtPreview) return;
            cancelOpening();
            if (showArt) keepArt();
            else opening.current = setTimeout(keepArt, 2000);
          }}
          onPointerLeave={leaveArt}
        >
          <span className="art-image card-pair" style={artStyle} />
        </span>
        <span className="card-owner">
          {def.owner} <span>· {needsLabel(def.effects.map((e) => e.kind))}</span>
        </span>
        <span className="card-rules">
          {def.effects.map((effect, index) => (
            <span key={index}>{effectText(effect, card.upgraded)}</span>
          ))}
        </span>
        <span className="card-keywords">
          <Icon name="flame" size={12} />
          <span>
            {[
              ...(def.tags ?? []),
              ...(def.exhaust ? ["Exhaust"] : []),
              ...(def.retain ? ["Retain"] : []),
            ].join(" · ")}
            {preview ? " · Improved" : ""}
          </span>
        </span>
      </button>
      <div
        ref={artwork}
        popover="manual"
        className="card-art-popover"
        onPointerEnter={keepArt}
        onPointerLeave={leaveArt}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setShowArt(false);
        }}
      >
        {/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Cropped sprite artwork includes an optional video layer and cannot be rendered by an img. */}
        <span
          className="full-card-art"
          role="img"
          aria-label={`${cardName(card)}${card.upgraded ? " upgraded" : ""} artwork`}
          style={artStyle}
        >
          {showVideo && (
            // oxlint-disable-next-line jsx-a11y/media-has-caption -- Decorative artwork animation with ambient sound, no dialogue or informational audio.
            <video
              className="card-art-video"
              src="/assets/ancient-flame.mp4"
              autoPlay
              muted={videoMuted}
              playsInline
              aria-hidden="true"
              onError={() => setVideoFailed(true)}
            />
          )}
        </span>
        {/* oxlint-enable jsx-a11y/prefer-tag-over-role */}
        <span className="art-caption">
          {cardName(card)}
          {card.upgraded ? " · Improved" : ""}
        </span>
        {showVideo && (
          <button
            type="button"
            className="card-video-sound"
            aria-label="Video sound"
            aria-pressed={!videoMuted}
            title={videoMuted ? "Unmute video" : "Mute video"}
            onClick={() => {
              const video = artwork.current?.querySelector("video");
              if (!video) return;
              video.muted = !videoMuted;
              setVideoMuted(!videoMuted);
              saveVideoSound(videoMuted);
              if (videoMuted && video.ended) {
                video.currentTime = 0;
                void video.play().catch(() => setVideoMuted(true));
              }
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {videoMuted ? (
                <>
                  <path d="M16 9V3l-4 3M8 8H6v8h4l6 5v-6" />
                  <path d="m3 3 18 18" />
                </>
              ) : (
                <path d="m16 3-6 5H6v8h4l6 5V3Z" />
              )}
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
function needsLabel(kinds: string[]) {
  return kinds.some((k) =>
    ["hit", "all", "defiance", "precision", "shieldStrike", "spendBlock"].includes(k),
  )
    ? "Attack"
    : kinds.includes("block") || kinds.includes("resolve")
      ? "Guard"
      : "Skill";
}
