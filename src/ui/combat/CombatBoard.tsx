import { cardName } from "../../game/selectors/cards";
import { useLayoutEffect, useRef, useState } from "react";
import { ACTS } from "../../game/content/world";
import { cardDef, needsTarget } from "../../game/content/cards";
import { enemyDef } from "../../game/content/enemies";
import { cardCost, empowerTargets } from "../../game/selectors/combat";
import {
  dreadResponse,
  intention,
  thresholds,
  thresholdStrength,
} from "../../game/selectors/intentions";
import type { RulesMode } from "../../game/engine/rules";
import { thresholdState } from "../../game/selectors/dread";
import type { Action, Card, Combat, Frame, Run } from "../../game/model";
import { heroSchema } from "../../game/model";
import { Art } from "../shared/Art";
import { CardPile, CardView } from "../cards/CardView";
import { Icon } from "../shared/Icon";
import { Modal } from "../shared/Modal";
import type { Inspect } from "../cards/inspection";
import { Hand } from "../cards/Hand";
import { BearerSelection } from "../journey/BearerSelection";
import { useCardTargetDrag } from "./useCardTargetDrag";
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
  const { aim, handlers } = useCardTargetDrag({ run, combat, busy, dispatch });
  const sceneHeading = useRef<HTMLHeadingElement>(null);
  const choosingBearer = combat.ember?.window === "choose";
  useLayoutEffect(() => {
    sceneHeading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [choosingBearer]);
  const dragStyle = aim
    ? {
        left: aim.x - aim.offsetX * aim.scale,
        top: aim.y - aim.offsetY * aim.scale,
        "--card-width": `${aim.width}px`,
        transform: `scale(${aim.scale})`,
        transformOrigin: "top left",
      }
    : undefined;
  const draggedCard = combat.hand.find((card) => card.uid === aim?.uid);
  const selectedCard = combat.hand.find((card) => card.uid === selected);
  const enemy = combat.enemies.find((e) => e.uid === enemyInfo);
  const bonus = mode === "candidate" ? thresholdStrength(run, combat) : 0;
  const response =
    mode === "recurring" || (mode === "adventure" && combat.dreadResponse)
      ? dreadResponse(combat)
      : null;
  const shownIntent = (enemy: Combat["enemies"][number]) =>
    response?.modifiers.find((m) => m.uid === enemy.uid)?.intent ?? intention(enemy, combat, bonus);
  if (choosingBearer) return <BearerSelection run={run} dispatch={dispatch} busy={busy} />;
  return (
    <section
      {...handlers}
      className={`combat-board ${combat.ember ? "has-ember" : ""} ${aim ? "is-dragging-card" : ""}`}
      aria-label="Combat"
      aria-busy={busy}
      data-reduced={reduced}
    >
      {aim && draggedCard && (
        <div className="dragged-card" aria-hidden="true" style={dragStyle}>
          <CardView
            card={draggedCard}
            cost={cardCost(run, combat, cardDef(draggedCard.def))}
            disabled
            allowArtPreview={false}
          />
        </div>
      )}
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
              Reach {combat.objective.target} Progress, or clear all danger for automatic
              completion.
            </p>
          </div>
          <label>
            Work · 1 energy · {2 - combat.objective.worked} left this turn
            <select
              aria-label="Discard a card to Work"
              value=""
              disabled={busy || combat.energy < 1 || combat.objective.worked >= 2}
              onChange={(event) => dispatch({ type: "work", uid: Number(event.target.value) })}
            >
              <option value="" disabled>
                Discard a card → +1 Progress (no effects)
              </option>
              {combat.hand.map((card) => (
                <option key={card.uid} value={card.uid}>
                  {cardName(card)}
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
          {/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Custom segmented meter preserves ten individually filled visual segments. */}
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
          {/* oxlint-enable jsx-a11y/prefer-tag-over-role */}
          <p className="dread-caption">The dark is listening.</p>
          {response ? (
            <>
              <div className={`threshold ${response.band === "minor" ? "pending" : ""}`}>
                <b>4</b>
                <p>
                  <strong>4–7 · Minor Fury · every turn</strong>Frontmost living enemy: +2
                  Attack/Drain this phase only.
                </p>
              </div>
              <div className={`threshold ${response.band === "major" ? "pending" : ""}`}>
                <b>8</b>
                <p>
                  <strong>8–10 · Major Fury · replaces minor</strong>All living enemies: +3
                  Attack/Drain this phase only. Then lose 4 Dread.
                </p>
              </div>

              <p className="dread-caption">
                If you end now: {response.band}. Dread after response: {response.dreadAfter}, before
                Howls. Intentions include Fury.
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
          <button className="text-button combat-log-toggle" onClick={() => setLog(true)}>
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
                  className={`enemy-target ${(selected !== null || aim !== null) && !dead ? "valid-target" : ""} ${aim?.target === enemy.uid ? "drop-target" : ""}`}
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
                    {aim ? "Drop to play" : selected !== null ? "Choose target" : "Inspect"}
                  </span>
                </button>
                {active &&
                  stage === "impact" &&
                  feedback.cue !== "enemy" &&
                  /\d+ damage/.test(feedback.text) && (
                    <span className="floating-hit" aria-hidden="true">
                      −{feedback.text.match(/(\d+) damage/)?.[1]}
                      {feedback.text.includes("blocked") && (
                        <small>{feedback.text.match(/(\d+) blocked/)?.[1]} blocked</small>
                      )}
                    </span>
                  )}
                <div className="enemy-name">{def.name}</div>
                <div className="health-bar enemy-health">
                  <span style={{ transform: `scaleX(${enemy.hp / enemy.maxHp})` }} />
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
                  {enemy.vulnerable > 0 && <span>Vulnerable {enemy.vulnerable}</span>}
                  {enemy.strength + bonus > 0 && <span>Attack +{enemy.strength + bonus}</span>}
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
          {heroSchema.options.map(
            (name, index) =>
              (!combat.ember || combat.ember.bearer === name) && (
                <div className="companion" key={name} data-companion={name}>
                  <Art sheet="companions" index={index} />
                  {combat.ember && (
                    <span className="bearer-badge" aria-hidden="true">
                      <Icon name="flame" size={14} />
                    </span>
                  )}
                  <span>
                    {name}
                    <small>
                      {combat.ember?.bearer === name
                        ? `Act ${["I", "II", "III"][run.act]} · Ember bearer`
                        : ["The guardian", "The ranger", "The emberkeeper"][index]}
                    </small>
                  </span>
                </div>
              ),
          )}
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
        {combat.ember && (
          <div className="ember-controls">
            <div className="bearer-ability-line">
              {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Native summary remains keyboard operable; hover and focus also reveal its details. */}
              <details
                className="ability-info"
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") event.currentTarget.open = true;
                }}
                onPointerLeave={(event) => {
                  if (
                    event.pointerType === "mouse" &&
                    !event.currentTarget.querySelector(":focus-visible")
                  )
                    event.currentTarget.open = false;
                }}
                onFocus={(event) => {
                  if (event.target.matches(":focus-visible")) event.currentTarget.open = true;
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    event.currentTarget.open = false;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") event.currentTarget.open = false;
                }}
              >
                <summary>
                  {combat.ember.bearer === "Mara"
                    ? "First Block effect +3"
                    : combat.ember.bearer === "Eryn"
                      ? "First Dread reduction −2 more"
                      : "Empower: +5 damage / +1 Dread"}
                  <span aria-hidden="true" className="ability-info-mark">
                    ?
                  </span>
                </summary>
                <p className="ability-description">
                  {combat.ember.bearer === "Mara"
                    ? "Each turn, your first Block effect from a played card grants +3 Block."
                    : combat.ember.bearer === "Eryn"
                      ? "Each turn, your first Dread-lowering card lowers it by 2 more."
                      : "Once per turn, optionally empower one Spell hit: +5 damage for +1 Dread. Choose a spell and target below to cast it empowered."}
                </p>
              </details>
              <output
                key={`${combat.turn}-${combat.ember.used}`}
                className={`bearer-status ${combat.ember.used ? "used" : "ready"}`}
              >
                {combat.ember.used ? "Used this turn" : "Ready"}
              </output>
            </div>
            {combat.ember.bearer === "Aldren" && !combat.ember.used && (
              <details className="empower-options">
                <summary>Empower a Spell · optional · +1 Dread</summary>
                {combat.hand.flatMap((card) =>
                  combat.enemies.flatMap((enemy) => {
                    const def = cardDef(card.def),
                      target = needsTarget(def) ? enemy.uid : null;
                    return empowerTargets(combat, def, target).includes(enemy.uid)
                      ? [
                          <button
                            key={`${card.uid}:${enemy.uid}`}
                            disabled={busy || cardCost(run, combat, def) > combat.energy}
                            onClick={() =>
                              dispatch({
                                type: "play",
                                uid: card.uid,
                                target,
                                empower: enemy.uid,
                              })
                            }
                          >
                            {cardName(card)} → {enemyDef(enemy.def).name} · +5 to one hit
                          </button>,
                        ]
                      : [];
                  }),
                )}
              </details>
            )}
          </div>
        )}
      </div>
      <output
        className={`action-message ${selected !== null ? "target-message" : ""}`}
        style={{ display: "block" }}
      >
        {selected !== null ? (
          <>
            <span>
              Choose an enemy for <b>{selectedCard && cardName(selectedCard)}</b>
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
          "Drag a card onto an enemy, or click to play."
        )}
      </output>
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
                cards: [...combat.draw].sort((a, b) => a.def.localeCompare(b.def)),
              })
            }
          />
        </div>
        <Hand
          cards={combat.hand}
          energy={combat.energy}
          cost={(card) => cardCost(run, combat, cardDef(card.def))}
          selected={aim?.uid ?? selected}
          dragging={aim?.uid ?? null}
          select={select}
          busy={busy}
        />
        <div className="end-pile">
          <button className="end-turn" disabled={busy} onClick={() => dispatch({ type: "end" })}>
            <span className="end-turn-seal" aria-hidden="true">
              <Icon name="flame" size={22} />
            </span>
            <span>{busy ? "Resolving…" : "End turn"}</span>
          </button>
          <CardPile
            kind="discard"
            cards={combat.discard}
            onClick={() => inspect({ title: "Discard pile", cards: combat.discard })}
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
        <Modal title={enemyDef(enemy.def).name} close={() => setEnemyInfo(null)} wide>
          <div className="enemy-inspection">
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Art renders a cropped sprite sheet, with the accessible name supplied by this wrapper. */}
            <div className="enemy-portrait" role="img" aria-label={enemyDef(enemy.def).name}>
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
                Attack modifiers and Weak are already included in the current intention. The base
                cycle shows unmodified values.
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
