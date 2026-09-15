import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cardDef, effectText } from "../game/content";
import type { Card } from "../game/model";

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    flame: (
      <path d="M12 2c2 6 7 7 7 13a7 7 0 0 1-14 0c0-3 2-5 4-7-1 5 2 5 2 2 0-3 1-5 1-8Z" />
    ),
    battle: (
      <>
        <path d="m5 3 14 14M3 3l1 5 4-4-5-1Zm12 14 3-3m-3 6 5-5M4 20l5-5M16 3l5 1-1 5-5 5" />
      </>
    ),
    elite: (
      <>
        <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />
      </>
    ),
    boss: (
      <>
        <path d="m3 7 4 4 5-7 5 7 4-4-2 13H5Z" />
        <path d="M8 16h8" />
      </>
    ),
    camp: (
      <>
        <path d="m3 20 9-16 9 16H3Zm5 0 4-8 4 8M9 2l3 2 3-2" />
      </>
    ),
    event: (
      <>
        <path d="M6 7a6 6 0 1 1 9 5c-3 2-3 2-3 5" />
        <path d="M12 21h.01" />
      </>
    ),
    shop: (
      <>
        <path d="M4 9h16l-2-6H6L4 9Zm1 0v12h14V9M9 21v-7h6v7" />
      </>
    ),
    shield: <path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z" />,
    heart: <path d="M12 21 3 12C-2 5 7-1 12 6 17-1 26 5 21 12Z" />,
    deck: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M2 6v13m20-13v13M9 9l3-3 3 3-3 3-3-3Z" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m12 6 4 6-4 6-4-6Z" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    arrow: <path d="M3 12h18m-6-6 6 6-6 6" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.flame}
    </svg>
  );
}
export function Art({
  sheet,
  index,
  className = "",
}: {
  sheet: "cards" | "enemies" | "companions";
  index: number;
  className?: string;
}) {
  const columns = sheet === "companions" ? 3 : 4,
    rows = sheet === "companions" ? 1 : 3;
  return (
    <span aria-hidden="true" className={`art ${className}`}>
      <span
        className={`art-image ${sheet}`}
        style={{
          backgroundImage: `url(/assets/${sheet}.webp)`,
          backgroundSize: `${columns * 100}% ${rows * 100}%`,
          backgroundPosition: `${((index % columns) * 100) / (columns - 1)}% ${rows === 1 ? 50 : (Math.floor(index / columns) * 100) / (rows - 1)}%`,
        }}
      />
    </span>
  );
}
export function CardView({
  card,
  onClick,
  disabled = false,
  selected = false,
  label,
  preview = false,
  allowArtPreview = true,
}: {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  label?: string;
  preview?: boolean;
  allowArtPreview?: boolean;
}) {
  const def = cardDef(card.def);
  const button = useRef<HTMLButtonElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showArt, setShowArt] = useState(false);
  const artStyle = {
    backgroundImage: `url(/assets/card-pairs-${String(Math.floor(def.art / 2) + 1).padStart(2, "0")}.webp)`,
    backgroundSize: "200% 200%",
    backgroundPosition: `${card.upgraded ? 100 : 0}% ${(def.art % 2) * 100}%`,
  };
  function keepArt() {
    if (closing.current) clearTimeout(closing.current);
    if (allowArtPreview) setShowArt(true);
  }
  function leaveArt() {
    if (closing.current) clearTimeout(closing.current);
    closing.current = setTimeout(() => setShowArt(false), 150);
  }
  useEffect(
    () => () => {
      if (closing.current) clearTimeout(closing.current);
    },
    [],
  );
  useEffect(() => {
    if (!allowArtPreview) {
      setShowArt(false);
      return;
    }
    const panel = artwork.current;
    const anchor = button.current;
    if (!showArt || !panel || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(
      480,
      window.innerWidth - 24,
      (window.innerHeight - 80) * 1.5,
    );
    const height = width / 1.5 + 38;
    const left =
      rect.right + width + 20 <= window.innerWidth
        ? rect.right + 8
        : rect.left - width - 8 >= 12
          ? rect.left - width - 8
          : Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
    const top =
      rect.bottom + height + 20 <= window.innerHeight
        ? rect.top
        : rect.top - height - 8;
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.max(12, Math.min(window.innerHeight - height - 12, top))}px`;
    panel.showPopover();
    const close = () => setShowArt(false);
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
    return () => {
      panel.hidePopover();
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
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
        onBlur={() => setShowArt(false)}
        onClick={() => {
          setShowArt(false);
          onClick?.();
        }}
        disabled={disabled}
        aria-label={
          label ??
          `${def.name}${card.upgraded ? " upgraded" : ""}, ${def.cost} energy. ${def.effects.map((e) => effectText(e, card.upgraded)).join(" ")}${def.exhaust ? " Exhaust." : ""}${def.retain ? " Retain." : ""}`
        }
        aria-pressed={selected}
      >
        <span className="card-heading">
          <span className="cost">{def.cost}</span>
          <span>
            {def.name}
            {card.upgraded && <b className="upgrade-mark"> +</b>}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="art card-art"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") keepArt();
          }}
          onPointerLeave={leaveArt}
        >
          <span className="art-image card-pair" style={artStyle} />
        </span>
        <span className="card-owner">
          {def.owner}{" "}
          <span>· {needsLabel(def.effects.map((e) => e.kind))}</span>
        </span>
        <span className="card-rules">
          {def.effects.map((effect, index) => (
            <span key={index}>{effectText(effect, card.upgraded)}</span>
          ))}
        </span>
        <span className="card-keywords">
          <Icon name="flame" size={12} />
          <span>
            {def.exhaust ? "Exhaust" : def.retain ? "Retain" : ""}
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
      >
        <span
          className="full-card-art"
          role="img"
          aria-label={`${def.name}${card.upgraded ? " upgraded" : ""} artwork`}
          style={artStyle}
        />
        <span className="art-caption">
          {def.name}
          {card.upgraded ? " · Improved" : ""}
        </span>
      </div>
    </>
  );
}
function needsLabel(kinds: string[]) {
  return kinds.some((k) =>
    ["hit", "all", "defiance", "precision", "shieldStrike"].includes(k),
  )
    ? "Attack"
    : kinds.includes("block") || kinds.includes("resolve")
      ? "Guard"
      : "Skill";
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          autoFocus
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Rules() {
  return (
    <div className="rules-copy">
      <p>
        You carry the last ember to the mountain beacon. Defeat its guardian to
        light it. If your shared health reaches zero, the journey ends.
      </p>
      <h3>One fellowship, one hand</h3>
      <p>
        Mara protects, Eryn creates openings, Aldren calls on dangerous fire.
        Their cards share 3 energy each turn. Click an attack, then an enemy.
        With only one living enemy, attacks target it automatically. Guard and
        skill cards play immediately. Escape cancels a selected attack.
      </p>
      <h3>Read the enemy</h3>
      <p>
        Intentions resolve left to right when you end your turn. Attack and
        Drain deal the displayed damage. Drain heals the enemy for health damage
        dealt. Guard grants block. Howl raises Dread. Boss attacks grow stronger
        at half health or below. Their exact rules appear on inspection.
      </p>
      <h3>Power has a voice</h3>
      <p>
        Dread stays between 0 and 10. At turn end, each threshold you meet
        triggers once, low to high. Lower Dread before ending the turn to avoid
        a pending consequence. Reinforcements wait the phase they arrive, then
        act on the next one. Triggered thresholds never reset. Defiance rewards
        Dread 6+, while precision thrives at 3 or less.
      </p>
      <h3>A few words worth knowing</h3>
      <dl>
        <dt>Block</dt>
        <dd>
          Absorbs damage before health. Your block clears at your next turn
          start. Enemy block clears at the start of the next enemy phase, before
          Dread consequences.
        </dd>
        <dt>Exhaust</dt>
        <dd>
          Played cards leave combat, then return to your permanent deck after
          the encounter.
        </dd>
        <dt>Retain</dt>
        <dd>
          Unplayed cards stay in your hand at turn end. The hand limit is 10.
        </dd>
        <dt>Weak</dt>
        <dd>Enemy attack and drain damage is reduced by 25%, rounded down.</dd>
        <dt>Vulnerable</dt>
        <dd>
          Enemy takes 50% more hit damage, rounded down. Both statuses lose 1
          after that enemy acts. A waiting reinforcement does not lose statuses.
        </dd>
      </dl>
      <h3>The road ahead</h3>
      <p>
        Choose one connected stop per row. Every act guarantees a camp. Rest for
        25% of maximum health or improve one card. A boss victory restores 20%
        before the next act. Rewards can be skipped to keep your deck focused.
        Shops sell cards, a relic, healing, and one card removal. Gold and
        health costs appear before you commit.
      </p>
      <p>
        Draw five each turn. When the draw pile empties, the discard is
        shuffled. A resolving card cannot draw itself. Relic damage bonuses
        apply before Vulnerable; block and healing bonuses apply to each effect.
        Combat resets Dread and temporary state, but keeps health.
      </p>
      <p className="muted">
        Progress saves after every action in this browser. Settings are
        separate. No account, cloud save, permanent stat bonuses, or internet
        connection is required after assets load.
      </p>
    </div>
  );
}
