import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ACTS,
  EVENTS,
  RELICS,
  cardDef,
  enemyDef,
  needsTarget,
} from "../game/content";
import {
  cardCost,
  dreadResponse,
  empowerTargets,
  has,
  intention,
  needsActBearer,
  reachable,
  thresholds,
  thresholdStrength,
} from "../game/engine";
import type { RulesMode } from "../game/engine";
import { thresholdState } from "../game/playtest";
import type { Action, Card, Combat, Frame, Run } from "../game/model";
import { flameBranchSchema, heroSchema } from "../game/model";
import { Art, CardPile, CardView, Icon, Modal } from "./components";
import { EncounterIllustration, encounterArt } from "./encounters";

export type Inspect = { title: string; cards: Card[] } | null;
export function JourneyCrossroads({
  run,
  dispatch,
  busy = false,
}: {
  run: Run;
  dispatch: (action: Action) => void;
  busy?: boolean;
}) {
  if (needsActBearer(run))
    return <BearerSelection run={run} dispatch={dispatch} busy={busy} />;
  const act = ACTS[run.act];
  const location = act?.crossroads[run.row + 1];
  const paths = run.route
    .filter((node) => reachable(run, node))
    .sort((a, b) => a.lane - b.lane);
  return (
    <section
      className="crossroads scene-enter"
      aria-labelledby="crossroads-title"
    >
      <div className="crossroads-view">
        <div className="crossroads-canvas">
          <img
            className="crossroads-landscape"
            src={`/assets/journey/${act?.file}-${run.row + 2}.webp`}
            alt={`${location?.name}: three paths through ${act?.place}.`}
            fetchPriority="high"
          />
          <div className="crossroads-shade" aria-hidden="true" />
          <nav className="crossroads-paths" aria-label="Choose a path">
            {location?.pathAnchors.map(([x, y], lane, anchors) => {
              const node = paths.find((path) => path.lane === lane);
              if (!node) return null;
              const previous = anchors[lane - 1];
              const next = anchors[lane + 1];
              const left = previous ? (previous[0] + x) / 2 : 0;
              const right = next ? (x + next[0]) / 2 : 100;
              return (
                <button
                  key={node.id}
                  type="button"
                  data-node={node.id}
                  className="crossroads-path"
                  style={{ left: `${left}%`, width: `${right - left}%` }}
                  aria-label={
                    [
                      "Take the left path",
                      "Go straight ahead",
                      "Take the right path",
                    ][lane]
                  }
                  aria-describedby="crossroads-hint"
                  onClick={() => dispatch({ type: "travel", node: node.id })}
                >
                  <span
                    className="path-marker"
                    style={{
                      left: `${((x - left) / (right - left)) * 100}%`,
                      top: `${y}%`,
                    }}
                    aria-hidden="true"
                  >
                    <span className="path-bearing">
                      {["↖", "↑", "↗"][lane]}
                    </span>
                    <span className="path-label">
                      {["Left path", "Straight ahead", "Right path"][lane]}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <header className="crossroads-heading">
        <div>
          <p className="eyebrow">
            Act {["I", "II", "III"][run.act]} · {act?.place}
          </p>
          <h1 id="crossroads-title">{location?.name}</h1>
          <p className="story-copy">{location?.description}</p>
          <p className="crossroads-hint" id="crossroads-hint">
            Choose a path in the landscape.
          </p>
        </div>
        <p className="crossroads-progress">Crossroads {run.row + 2} of 6</p>
      </header>
    </section>
  );
}
function Hand({
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
function BearerSelection({
  run,
  dispatch,
  busy,
}: {
  run: Run;
  dispatch: (action: Action) => void;
  busy: boolean;
}) {
  const sceneHeading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    sceneHeading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  return (
    <section
      className="bearer-selection scene-enter"
      aria-labelledby="bearer-heading"
      aria-busy={busy}
    >
      <header className="bearer-intro">
        <p className="eyebrow">The Last Ember</p>
        <h1 id="bearer-heading" ref={sceneHeading} tabIndex={-1}>
          Who carries the Ember?
        </h1>
        <p className="eyebrow">
          Act {["I", "II", "III"][run.act]} · Locked for this Act
        </p>
      </header>
      <div className="bearer-choices">
        {heroSchema.options.map((hero) => {
          const profile = {
            Mara: {
              ability: "Shelter the Flame",
              effect:
                "Each turn, your first Block effect from a played card grants +3 Block.",
            },
            Eryn: {
              ability: "Conceal the Flame",
              effect:
                "Each turn, your first Dread-lowering card lowers it by 2 more.",
            },
            Aldren: {
              ability: "Wield the Flame",
              effect:
                "Once per turn, empower one Spell hit: +5 damage for +1 Dread. Your choice when casting.",
            },
          }[hero];
          return (
            <button
              className="bearer-choice"
              key={hero}
              disabled={busy}
              aria-label={`Choose ${hero}`}
              aria-describedby={`bearer-${hero}-ability`}
              onClick={() => dispatch({ type: "bearer", hero })}
            >
              <img
                src={`/assets/bearer-${hero.toLowerCase()}.webp`}
                alt=""
                width="1024"
                height="1024"
              />
              <span className="bearer-copy">
                <span className="bearer-name">{hero}</span>
                <span id={`bearer-${hero}-ability`} className="bearer-ability">
                  <strong>{profile.ability}</strong>
                  {profile.effect}
                </span>
                <span className="bearer-call">
                  <Icon name="arrow" size={18} /> Choose {hero}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <footer className="bearer-context">
        <p className="bearer-lock-note">
          All three stay with you. Your bearer cannot change until you clear
          this Act.
        </p>
      </footer>
    </section>
  );
}
export function CombatBoard({
  run,
  combat,
  dispatch,
  selected,
  select,
  busy,
  feedback,
  stage,
  inspect,
  reduced,
  mode = "adventure",
}: {
  run: Run;
  combat: Combat;
  dispatch: (action: Action) => void;
  selected: number | null;
  select: (card: Card) => void;
  busy: boolean;
  feedback: Frame | null;
  stage: "anticipate" | "impact";
  inspect: (value: Inspect) => void;
  reduced: boolean;
  mode?: RulesMode;
}) {
  const [enemyInfo, setEnemyInfo] = useState<number | null>(null),
    [log, setLog] = useState(false);
  const sceneHeading = useRef<HTMLHeadingElement>(null);
  const choosingBearer = combat.ember?.window === "choose";
  useLayoutEffect(() => {
    sceneHeading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [choosingBearer]);
  const enemy = combat.enemies.find((e) => e.uid === enemyInfo);
  const bonus = mode === "candidate" ? thresholdStrength(run, combat) : 0;
  const response =
    mode === "recurring" || (mode === "adventure" && combat.dreadResponse)
      ? dreadResponse(combat)
      : null;
  const shownIntent = (enemy: Combat["enemies"][number]) =>
    response?.modifiers.find((m) => m.uid === enemy.uid)?.intent ??
    intention(enemy, combat, bonus);
  if (choosingBearer)
    return <BearerSelection run={run} dispatch={dispatch} busy={busy} />;
  return (
    <section
      className={`combat-board ${combat.ember ? "has-ember" : ""}`}
      aria-label="Combat"
      aria-busy={busy}
      data-reduced={reduced}
    >
      <div className="combat-heading">
        <div>
          <p className="eyebrow">
            {ACTS[run.act]?.place} · {combat.type}
          </p>
          <h1 ref={sceneHeading} tabIndex={-1}>
            {combat.encounter}
          </h1>
        </div>
        <span className="turn-indicator">
          Turn <b>{combat.turn.toString().padStart(2, "0")}</b>
          <small>{busy ? "Resolving" : "Your move"}</small>
        </span>
      </div>
      {combat.objective && (
        <div className="objective-panel">
          <div>
            <h2>
              Escape · {combat.objective.progress}/{combat.objective.target}
            </h2>
            <p>
              Reach {combat.objective.target} Progress, or clear all danger for
              automatic completion.
            </p>
          </div>
          <label>
            Work · 1 energy · {2 - combat.objective.worked} left this turn
            <select
              aria-label="Discard a card to Work"
              value=""
              disabled={
                busy || combat.energy < 1 || combat.objective.worked >= 2
              }
              onChange={(event) =>
                dispatch({ type: "work", uid: Number(event.target.value) })
              }
            >
              <option value="" disabled>
                Discard a card → +1 Progress (no effects)
              </option>
              {combat.hand.map((card) => (
                <option key={card.uid} value={card.uid}>
                  {cardDef(card.def).name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="battlefield">
        <aside
          className={`dread-panel ${feedback?.cue === "dread" && stage === "impact" ? "dread-awakens" : ""}`}
        >
          <div className="dread-title">
            <Icon name="flame" />
            <h2>Dread</h2>
            <b>
              {combat.dread}
              <small> / 10</small>
            </b>
          </div>
          <div
            className="dread-meter"
            role="meter"
            aria-label="Dread"
            aria-valuenow={combat.dread}
            aria-valuemin={0}
            aria-valuemax={10}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < combat.dread ? "filled" : ""} />
            ))}
          </div>
          <p className="dread-caption">The dark is listening.</p>
          {response ? (
            <>
              <div
                className={`threshold ${response.band === "minor" ? "pending" : ""}`}
              >
                <b>4</b>
                <p>
                  <strong>4–7 · Minor Fury · every turn</strong>Frontmost living
                  enemy: +2 Attack/Drain this phase only.
                </p>
              </div>
              <div
                className={`threshold ${response.band === "major" ? "pending" : ""}`}
              >
                <b>8</b>
                <p>
                  <strong>8–10 · Major Fury · replaces minor</strong>All living
                  enemies: +3 Attack/Drain this phase only. Then lose 4 Dread.
                </p>
              </div>
              <p className="dread-caption">
                If you end now: {response.band}. Dread after response:{" "}
                {response.dreadAfter}, before Howls. Intentions include Fury.
              </p>
            </>
          ) : (
            thresholds(run, combat).map((t) => (
              <div
                key={t.at}
                className={`threshold ${t.pending ? "pending" : ""} ${t.fired ? "fired" : ""}`}
              >
                <b>{t.at}</b>
                <p>
                  <strong>
                    {mode !== "adventure"
                      ? `${thresholdState(run, combat, mode).find((s) => s.at === t.at)?.state}${t.pending ? " · unlocks at end" : ""}`
                      : t.fired
                        ? "Already awakened"
                        : t.pending
                          ? "Activates at turn end"
                          : "At turn end, if reached"}
                  </strong>
                  {mode === "candidate" && t.strength
                    ? `After unlock: +${t.strength} attack while Dread is ${t.at} or higher.`
                    : t.text}
                </p>
              </div>
            ))
          )}
          <button
            className="text-button combat-log-toggle"
            onClick={() => setLog(true)}
          >
            Read combat log <Icon name="arrow" size={14} />
          </button>
        </aside>
        <div className="enemies">
          {combat.enemies.map((enemy, index) => {
            const def = enemyDef(enemy.def),
              intent = shownIntent(enemy),
              active = feedback?.target === enemy.uid,
              waiting = enemy.joinsOn > combat.turn,
              dead = enemy.hp <= 0;
            return (
              <div
                key={enemy.uid}
                className={`enemy-unit ${dead ? "dead" : ""} ${active ? `active ${stage} cue-${feedback.cue}` : ""}`}
              >
                <div
                  className={`intent intent-${intent.kind}`}
                  key={`${enemy.uid}-${enemy.step}-${intent.amount}`}
                >
                  <Icon
                    name={
                      intent.kind === "guard"
                        ? "shield"
                        : intent.kind === "howl"
                          ? "flame"
                          : "battle"
                    }
                    size={17}
                  />
                  <b>
                    {dead
                      ? "Fallen"
                      : waiting
                        ? "Arriving"
                        : `${intent.kind === "attack" ? "Attack" : intent.kind === "drain" ? "Drain" : intent.kind === "guard" ? "Block" : "Dread"} ${intent.amount}`}
                  </b>
                  {!dead && (
                    <small>
                      {waiting
                        ? "Waits this phase"
                        : mode !== "adventure"
                          ? `Now · see ordered projection`
                          : `Acts ${index + 1}`}
                    </small>
                  )}
                </div>
                <button
                  className={`enemy-target ${selected !== null && !dead ? "valid-target" : ""}`}
                  data-enemy={enemy.uid}
                  disabled={dead || busy}
                  onClick={() =>
                    selected !== null
                      ? dispatch({
                          type: "play",
                          uid: selected,
                          target: enemy.uid,
                        })
                      : setEnemyInfo(enemy.uid)
                  }
                  aria-label={`${selected !== null ? "Target" : "Inspect"} ${def.name}, ${enemy.hp} health, ${enemy.block} block, ${intent.kind} ${intent.amount}`}
                >
                  <Art sheet="enemies" index={def.art} className="enemy-art" />
                  <span className="target-reticle">
                    {selected !== null ? "Choose target" : "Inspect"}
                  </span>
                </button>
                {active &&
                  stage === "impact" &&
                  feedback.cue !== "enemy" &&
                  /\d+ damage/.test(feedback.text) && (
                    <span className="floating-hit" aria-hidden="true">
                      −{feedback.text.match(/(\d+) damage/)?.[1]}
                      {feedback.text.includes("blocked") && (
                        <small>
                          {feedback.text.match(/(\d+) blocked/)?.[1]} blocked
                        </small>
                      )}
                    </span>
                  )}
                <div className="enemy-name">{def.name}</div>
                <div className="health-bar enemy-health">
                  <span
                    style={{ transform: `scaleX(${enemy.hp / enemy.maxHp})` }}
                  />
                  <b>
                    {enemy.hp} / {enemy.maxHp}
                  </b>
                </div>
                <div className="enemy-status">
                  {enemy.block > 0 && (
                    <span>
                      <Icon name="shield" size={13} />
                      {enemy.block} block
                    </span>
                  )}
                  {enemy.weak > 0 && <span>Weak {enemy.weak}</span>}
                  {enemy.vulnerable > 0 && (
                    <span>Vulnerable {enemy.vulnerable}</span>
                  )}
                  {enemy.strength + bonus > 0 && (
                    <span>Attack +{enemy.strength + bonus}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className={`fellowship-strip ${feedback?.cue === "enemy" && stage === "impact" ? "party-hit" : ""} ${feedback?.target === "party" && stage === "impact" ? `party-${feedback.cue}` : ""}`}
      >
        <div className="companions">
          {heroSchema.options.map((name, index) => (
            <div className="companion" key={name} data-companion={name}>
              <Art sheet="companions" index={index} />
              <span>
                {name}
                <small>
                  {combat.ember?.bearer === name
                    ? `Act ${["I", "II", "III"][run.act]} bearer`
                    : ["The guardian", "The ranger", "The emberkeeper"][index]}
                </small>
              </span>
            </div>
          ))}
        </div>
        <div className="party-health">
          <span>
            Fellowship{" "}
            <b>
              {run.hp} / {run.maxHp}
            </b>
          </span>
          <div className="health-bar">
            <span style={{ transform: `scaleX(${run.hp / run.maxHp})` }} />
          </div>
        </div>
        <div className="block-total">
          <Icon name="shield" />
          <b>{combat.block}</b>
          <span>Block</span>
        </div>
      </div>
      {combat.ember && (
        <div className="ember-controls">
          <p>
            {`${combat.ember.bearer}: ${combat.ember.used ? "ability used this turn" : "ability ready"}.`}{" "}
            Mara: first Block +3. Eryn: first Dread-lowering card −2 more.
            Aldren: empower one Spell hit, +5 damage for +1 Dread.
          </p>
          {combat.ember.bearer === "Aldren" && !combat.ember.used && (
            <details>
              <summary>Empower a Spell · optional · +1 Dread</summary>
              {combat.hand.flatMap((card) =>
                combat.enemies.flatMap((enemy) => {
                  const def = cardDef(card.def),
                    target = needsTarget(def) ? enemy.uid : null;
                  return empowerTargets(combat, def, target).includes(enemy.uid)
                    ? [
                        <button
                          key={`${card.uid}:${enemy.uid}`}
                          disabled={
                            busy || cardCost(run, combat, def) > combat.energy
                          }
                          onClick={() =>
                            dispatch({
                              type: "play",
                              uid: card.uid,
                              target,
                              empower: enemy.uid,
                            })
                          }
                        >
                          {def.name} → {enemyDef(enemy.def).name} · +5 to one
                          hit
                        </button>,
                      ]
                    : [];
                }),
              )}
            </details>
          )}
        </div>
      )}
      <div
        className={`action-message ${selected !== null ? "target-message" : ""}`}
        role="status"
      >
        {selected !== null ? (
          <>
            <span>
              Choose an enemy for{" "}
              <b>
                {
                  cardDef(
                    combat.hand.find((c) => c.uid === selected)?.def ??
                      "strike",
                  ).name
                }
              </b>
            </span>
            <button
              className="text-button"
              onClick={() => {
                const card = combat.hand.find((c) => c.uid === selected);
                if (card) select(card);
              }}
            >
              Cancel · Esc
            </button>
          </>
        ) : busy && stage === "anticipate" ? (
          "The fellowship holds its breath…"
        ) : feedback ? (
          feedback.text
        ) : (
          "Read their intentions. Make your stand."
        )}
      </div>
      <div className="hand-area">
        <div className="energy-pile">
          <div className="energy-orb">
            <b>{combat.energy}</b>
            <span>Energy</span>
          </div>
          <CardPile
            kind="draw"
            cards={combat.draw}
            onClick={() =>
              inspect({
                title: "Draw pile · order hidden",
                cards: [...combat.draw].sort((a, b) =>
                  a.def.localeCompare(b.def),
                ),
              })
            }
          />
        </div>
        <Hand
          cards={combat.hand}
          energy={combat.energy}
          cost={(card) => cardCost(run, combat, cardDef(card.def))}
          selected={selected}
          select={select}
          busy={busy}
        />
        <div className="end-pile">
          <button
            className="primary end-turn"
            disabled={busy}
            onClick={() => dispatch({ type: "end" })}
          >
            {busy ? "Resolving…" : "End turn"}
            <Icon name="arrow" size={17} />
          </button>
          <CardPile
            kind="discard"
            cards={combat.discard}
            onClick={() =>
              inspect({ title: "Discard pile", cards: combat.discard })
            }
          />
          <button
            className="text-button"
            data-pile="exhaust"
            onClick={() =>
              inspect({
                title: "Exhausted · returns next combat",
                cards: combat.exhaust,
              })
            }
          >
            Exhausted {combat.exhaust.length}
          </button>
        </div>
      </div>
      {enemy && (
        <Modal
          title={enemyDef(enemy.def).name}
          close={() => setEnemyInfo(null)}
          wide
        >
          <div className="enemy-inspection">
            <div
              className="enemy-portrait"
              role="img"
              aria-label={enemyDef(enemy.def).name}
            >
              <Art sheet="enemies" index={enemyDef(enemy.def).art} />
            </div>
            <div className="enemy-inspection-details">
              <p>{enemyDef(enemy.def).special}</p>
              <div className="enemy-inspection-intent">
                <span className="eyebrow">Current intention</span>
                <strong>
                  {shownIntent(enemy).kind} {shownIntent(enemy).amount}
                </strong>
              </div>
              <dl className="enemy-inspection-stats">
                <div>
                  <dt>Health</dt>
                  <dd>
                    {enemy.hp} / {enemy.maxHp}
                  </dd>
                </div>
                <div>
                  <dt>Block</dt>
                  <dd>{enemy.block}</dd>
                </div>
              </dl>
              <h3>Base cycle</h3>
              <ol className="enemy-inspection-cycle">
                {enemyDef(enemy.def).pattern.map((intent, index) => (
                  <li key={index}>
                    {intent.kind} <b>{intent.amount}</b>
                  </li>
                ))}
              </ol>
              <p className="enemy-inspection-note">
                Attack modifiers and Weak are already included in the current
                intention. The base cycle shows unmodified values.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {log && (
        <Modal title="The battle so far" close={() => setLog(false)}>
          <ol className="combat-log">
            {combat.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </Modal>
      )}
    </section>
  );
}
export function StopScene({
  run,
  dispatch,
  inspect,
}: {
  run: Run;
  dispatch: (action: Action) => void;
  inspect: (value: Inspect) => void;
}) {
  const [choose, setChoose] = useState<"upgrade" | "remove" | null>(null),
    [candidate, setCandidate] = useState<Card | null>(null);
  const s = run.scene;
  const art = encounterArt(run);
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (!document.querySelector("dialog[open]"))
      heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  const pendingUpgrade = s.kind === "event" ? s.pendingUpgrade : undefined;
  const leave = (
    <button className="primary" onClick={() => dispatch({ type: "leave" })}>
      Return to the road <Icon name="arrow" size={18} />
    </button>
  );
  return (
    <section
      className={`stop-scene scene-enter ${art ? `illustrated-stop ${s.kind}-stop` : ""}`}
    >
      {art && <EncounterIllustration key={art.src} art={art} />}
      <div className="stop-content">
        {s.kind === "reward" && (
          <>
            <p className="eyebrow">The fellowship endures</p>
            <h1 ref={heading} tabIndex={-1}>
              A little stronger, together.
            </h1>
            <p className="story-copy">
              Take a lesson from the road. Choose one card, or travel light.
            </p>
            <div className="reward-summary">
              <span>
                <Icon name="coin" /> {s.gold} gold earned
              </span>
              {s.relic && (
                <span title={RELICS.find((r) => r.id === s.relic)?.text}>
                  <Icon name="elite" />{" "}
                  {RELICS.find((r) => r.id === s.relic)?.name}
                  <small>{RELICS.find((r) => r.id === s.relic)?.text}</small>
                </span>
              )}
            </div>
            <div className="card-choices">
              {s.cards.map((id, i) => (
                <CardView
                  key={id}
                  card={{ uid: i, def: id, upgraded: false }}
                  onClick={() => dispatch({ type: "reward", card: id })}
                />
              ))}
            </div>
            <button
              className="secondary"
              onClick={() => dispatch({ type: "reward", card: null })}
            >
              Skip card{s.boss ? " & enter the next act" : " & continue"}{" "}
              <Icon name="arrow" size={17} />
            </button>
            {s.boss && (
              <p className="muted">
                Your relic is kept even if you skip. Restore 20% health on the
                road ahead.
              </p>
            )}
          </>
        )}
        {s.kind === "camp" && (
          <>
            <div className="scene-emblem">
              <Icon name="camp" size={40} />
            </div>
            <p className="eyebrow">A shelter from the dark</p>
            <h1 ref={heading} tabIndex={-1}>
              The fire is for all of us.
            </h1>
            <p className="story-copy">
              Mara tends the coals. Eryn repairs a torn sleeve.
              <br />
              For a little while, no one asks how far remains.
            </p>
            {s.used ? (
              <>
                <p className="resolved-copy">
                  Rested, mended, and ready for the road.
                </p>
                {leave}
              </>
            ) : (
              <div className="choice-list">
                <button onClick={() => dispatch({ type: "rest" })}>
                  <Icon name="heart" />
                  <span>
                    <b>Rest by the fire</b>
                    <small>
                      Restore{" "}
                      {Math.ceil(run.maxHp * 0.25) + (has(run, "bowl") ? 3 : 0)}{" "}
                      health, up to {run.maxHp}.
                    </small>
                  </span>
                </button>
                <button
                  disabled={run.deck.every((c) => c.upgraded)}
                  onClick={() => setChoose("upgrade")}
                >
                  <Icon name="deck" />
                  <span>
                    <b>Prepare for tomorrow</b>
                    <small>
                      Improve one card. Preview the change before choosing.
                    </small>
                  </span>
                </button>
              </div>
            )}
          </>
        )}
        {s.kind === "event" && (
          <>
            <div className="scene-emblem">
              <Icon name="event" size={36} />
            </div>
            <p className="eyebrow">A moment on the road</p>
            <h1 ref={heading} tabIndex={-1}>
              {EVENTS[s.event]?.title}
            </h1>
            <p className="story-copy">{EVENTS[s.event]?.text}</p>
            {s.resolved ? (
              <>
                <p className="resolved-copy">
                  {s.resolved}
                  {pendingUpgrade !== undefined
                    ? " Choose how to improve Ancient flame."
                    : ""}
                </p>
                {pendingUpgrade !== undefined ? (
                  <div className="upgrade-compare">
                    {flameBranchSchema.options.map((branch) => (
                      <CardView
                        key={branch}
                        card={{
                          uid: pendingUpgrade,
                          def: branch,
                          upgraded: true,
                        }}
                        preview
                        allowArtPreview={false}
                        onClick={() => {
                          dispatch({
                            type: "upgrade",
                            uid: pendingUpgrade,
                            branch,
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  leave
                )}
              </>
            ) : (
              <div className="choice-list">
                {EVENTS[s.event]?.choices.map((choice, i) => (
                  <button
                    key={choice.label}
                    disabled={run.gold + choice.gold < 0}
                    onClick={() => dispatch({ type: "choice", index: i })}
                  >
                    <span>
                      <b>{choice.label}</b>
                      <small>
                        {choice.detail}
                        {choice.hp < 0 && run.hp + choice.hp <= 0
                          ? " This will end your journey."
                          : ""}
                      </small>
                    </span>
                    <Icon name="arrow" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {s.kind === "shop" && (
          <>
            <p className="eyebrow">The wayside merchant</p>
            <h1 ref={heading} tabIndex={-1}>
              Something for the long road.
            </h1>
            <p className="story-copy">
              “Take what you need. Leave a light in the window when you get
              home.”
            </p>
            <div className="shop-layout">
              <div className="card-choices">
                {s.cards.map((id, i) => (
                  <div key={i} className="shop-card">
                    {id ? (
                      <CardView
                        card={{ uid: i, def: id, upgraded: false }}
                        disabled={run.gold < 40}
                        onClick={() =>
                          dispatch({ type: "buy", item: "card", index: i })
                        }
                      />
                    ) : (
                      <div className="sold-card">
                        Sold
                        <br />
                        <small>Travel safely.</small>
                      </div>
                    )}
                    <span className="price">
                      {id ? "40 gold" : "Purchased"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="shop-services">
                <button
                  disabled={!s.relic || run.gold < 85}
                  onClick={() =>
                    dispatch({ type: "buy", item: "relic", index: 0 })
                  }
                >
                  <Icon name="elite" />
                  <b>
                    {s.relic
                      ? RELICS.find((r) => r.id === s.relic)?.name
                      : "Relic sold"}
                  </b>
                  <small>{RELICS.find((r) => r.id === s.relic)?.text}</small>
                  <span>85 gold</span>
                </button>
                <button
                  disabled={s.healed || run.gold < 30 || run.hp === run.maxHp}
                  onClick={() =>
                    dispatch({ type: "buy", item: "heal", index: 0 })
                  }
                >
                  <Icon name="heart" />
                  <b>{s.healed ? "Tonic purchased" : "A warming tonic"}</b>
                  <small>
                    Restore {20 + (has(run, "bowl") ? 3 : 0)} health.
                  </small>
                  <span>30 gold</span>
                </button>
                <button
                  disabled={s.removed || run.gold < 45 || run.deck.length <= 5}
                  onClick={() => setChoose("remove")}
                >
                  <Icon name="deck" />
                  <b>{s.removed ? "Burden set down" : "Travel lighter"}</b>
                  <small>Remove one card permanently. Minimum deck 5.</small>
                  <span>45 gold</span>
                </button>
              </div>
            </div>
            {leave}
          </>
        )}
        {choose && (
          <Modal
            title={
              choose === "upgrade" ? "Improve one card" : "Set down a burden"
            }
            close={() => {
              setChoose(null);
              setCandidate(null);
            }}
            wide
          >
            <p>
              {choose === "upgrade"
                ? "Choose a card to compare its improved version."
                : "Choose a card to remove. This costs 45 gold."}
            </p>
            {candidate ? (
              <>
                <div className="upgrade-compare">
                  <CardView card={candidate} />
                  <Icon name="arrow" size={30} />
                  {choose === "upgrade" &&
                  candidate.def === "flame" &&
                  run.prototype?.branchUpgrades ? (
                    flameBranchSchema.options.map((branch) => (
                      <CardView
                        key={branch}
                        card={{ ...candidate, def: branch, upgraded: true }}
                        preview
                        allowArtPreview={false}
                        onClick={() => {
                          dispatch({
                            type: "upgrade",
                            uid: candidate.uid,
                            branch,
                          });
                          setChoose(null);
                          setCandidate(null);
                        }}
                      />
                    ))
                  ) : choose === "upgrade" ? (
                    <CardView card={{ ...candidate, upgraded: true }} preview />
                  ) : (
                    <p>This copy will leave your deck.</p>
                  )}
                </div>
                <div className="dialog-actions">
                  <button onClick={() => setCandidate(null)}>
                    Choose another
                  </button>
                  {choose === "upgrade" &&
                  candidate.def === "flame" &&
                  run.prototype?.branchUpgrades ? (
                    <p>Choose a branch above to confirm its improvement.</p>
                  ) : (
                    <button
                      className="primary"
                      onClick={() => {
                        dispatch(
                          choose === "upgrade"
                            ? { type: "upgrade", uid: candidate.uid }
                            : {
                                type: "buy",
                                item: "remove",
                                index: candidate.uid,
                              },
                        );
                        setChoose(null);
                        setCandidate(null);
                      }}
                    >
                      {choose === "upgrade"
                        ? "Confirm improvement"
                        : "Remove · 45 gold"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="deck-grid">
                {run.deck
                  .filter((c) => choose === "remove" || !c.upgraded)
                  .map((c) => (
                    <CardView
                      key={c.uid}
                      card={c}
                      onClick={() => setCandidate(c)}
                    />
                  ))}
              </div>
            )}
          </Modal>
        )}
        <button
          className="text-button deck-stop"
          onClick={() =>
            inspect({ title: "Your permanent deck", cards: run.deck })
          }
        >
          Inspect your deck · {run.deck.length} cards
        </button>
      </div>
    </section>
  );
}
