import { useLayoutEffect, useRef, useState } from "react";
import { ACTS, EVENTS, RELICS, cardDef, enemyDef } from "../game/content";
import { has, intention, reachable, thresholds } from "../game/engine";
import type { Action, Card, Combat, Frame, Run } from "../game/model";
import { Art, CardView, Icon, Modal } from "./components";

export type Inspect = { title: string; cards: Card[] } | null;
export function JourneyMap({
  run,
  dispatch,
}: {
  run: Run;
  dispatch: (action: Action) => void;
}) {
  const act = ACTS[run.act];
  return (
    <section className="journey-layout scene-enter">
      <div className="journey-story">
        <p className="eyebrow">
          Act {["I", "II", "III"][run.act]} · {act?.place}
        </p>
        <h1>{act?.name}</h1>
        <p className="story-copy">{act?.intro}</p>
        <div className="route-help">
          <span className="small-rule" />
          <p>
            One road. Three companions.
            <br />
            Choose your next foothold.
          </p>
          <p className="muted">
            Follow the lit connections from left to right. You visit one stop
            per column. The crown marks the act’s guardian.
          </p>
        </div>
        <div className="map-legend">
          {["battle", "elite", "event", "camp", "shop", "boss"].map((kind) => (
            <span key={kind}>
              <Icon name={kind} size={17} />
              {kind === "shop"
                ? "Merchant"
                : kind[0]?.toUpperCase() + kind.slice(1)}
            </span>
          ))}
        </div>
      </div>
      <div className="route-panel">
        <div className="route-caption">
          <span>THE ROAD TO THE BEACON</span>
          <span>{run.row + 1} / 6 stops</span>
        </div>
        <div className="route-scroll">
          <div className="route-map">
            <svg
              className="route-lines"
              viewBox="0 0 660 360"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {run.route.flatMap((node) =>
                node.links.map((link) => {
                  const next = run.route.find((n) => n.id === link);
                  return next ? (
                    <line
                      key={`${node.id}-${link}`}
                      x1={55 + node.row * 110}
                      y1={60 + node.lane * 120}
                      x2={55 + next.row * 110}
                      y2={60 + next.lane * 120}
                      className={
                        run.visited.includes(node.id) &&
                        (reachable(run, next) || run.visited.includes(next.id))
                          ? "lit"
                          : ""
                      }
                    />
                  ) : null;
                }),
              )}
            </svg>
            {run.route.map((node) => (
              <button
                key={node.id}
                data-node={node.id}
                data-kind={node.kind}
                disabled={!reachable(run, node)}
                className={`route-node ${reachable(run, node) ? "reachable" : ""} ${run.visited.includes(node.id) ? "visited" : ""} ${node.row <= run.row && !run.visited.includes(node.id) ? "rejected" : ""} ${node.kind === "boss" ? "boss-node" : ""}`}
                style={{
                  left: `${((node.row + 0.5) / 6) * 100}%`,
                  top: `${((node.lane + 0.5) / 3) * 100}%`,
                }}
                onClick={() => dispatch({ type: "travel", node: node.id })}
                aria-label={`${node.kind === "shop" ? "Merchant" : node.kind}, stop ${node.row + 1}, path ${node.lane + 1}${run.visited.includes(node.id) ? ", visited" : ""}`}
              >
                <span>
                  <Icon name={node.kind} size={26} />
                </span>
                <small>
                  {run.visited.includes(node.id)
                    ? "Visited"
                    : node.kind === "shop"
                      ? "Merchant"
                      : node.kind === "boss"
                        ? "Guardian"
                        : node.kind}
                </small>
              </button>
            ))}
          </div>
        </div>
        <p className="map-note">
          <Icon name="camp" size={18} /> A camp waits halfway. Heal, or
          strengthen a card.
        </p>
      </div>
    </section>
  );
}
function Hand({
  cards,
  energy,
  selected,
  select,
  busy,
  reduced,
}: {
  cards: Card[];
  energy: number;
  selected: number | null;
  select: (card: Card) => void;
  busy: boolean;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    positions = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const next = new Map<string, DOMRect>();
    ref.current
      ?.querySelectorAll<HTMLElement>("[data-card]")
      .forEach((element) => {
        const id = element.dataset.card ?? "",
          rect = element.getBoundingClientRect(),
          old = positions.current.get(id);
        next.set(id, rect);
        if (!reduced && old && Math.abs(old.left - rect.left) > 2)
          element.animate(
            [
              { translate: `${old.left - rect.left}px 0` },
              { translate: "0 0" },
            ],
            { duration: 220, easing: "ease-out" },
          );
      });
    positions.current = next;
  }, [cards, reduced]);
  return (
    <div className="hand-window">
      <div ref={ref} className={`hand ${cards.length > 6 ? "large-hand" : ""}`}>
        {cards.map((card) => (
          <CardView
            key={card.uid}
            card={card}
            onClick={() => select(card)}
            disabled={busy || cardDef(card.def).cost > energy}
            selected={selected === card.uid}
          />
        ))}
        {!cards.length && (
          <p className="empty-hand">
            {busy
              ? "Resolving…"
              : "Your hand is empty. End the turn to draw again."}
          </p>
        )}
      </div>
      {cards.length > 3 && (
        <div
          className={`hand-scroll-controls ${cards.length <= 6 ? "compact-hand-controls" : ""}`}
        >
          <button
            aria-label="Scroll hand left"
            onClick={() =>
              ref.current?.scrollBy({
                left: -450,
                behavior: reduced ? "instant" : "smooth",
              })
            }
          >
            ← Previous cards
          </button>
          <span>{cards.length} cards · scroll or Tab to see more</span>
          <button
            aria-label="Scroll hand right"
            onClick={() =>
              ref.current?.scrollBy({
                left: 450,
                behavior: reduced ? "instant" : "smooth",
              })
            }
          >
            More cards →
          </button>
        </div>
      )}
    </div>
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
}) {
  const [enemyInfo, setEnemyInfo] = useState<number | null>(null),
    [log, setLog] = useState(false);
  const enemy = combat.enemies.find((e) => e.uid === enemyInfo);
  return (
    <section className="combat-board" aria-label="Combat" aria-busy={busy}>
      <div className="combat-heading">
        <div>
          <p className="eyebrow">
            {ACTS[run.act]?.place} · {combat.type}
          </p>
          <h1>{combat.encounter}</h1>
        </div>
        <span className="turn-indicator">
          Turn <b>{combat.turn.toString().padStart(2, "0")}</b>
          <small>{busy ? "Resolving" : "Your move"}</small>
        </span>
      </div>
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
          {thresholds(run, combat).map((t) => (
            <div
              key={t.at}
              className={`threshold ${t.pending ? "pending" : ""} ${t.fired ? "fired" : ""}`}
            >
              <b>{t.at}</b>
              <p>
                <strong>
                  {t.fired
                    ? "Already awakened"
                    : t.pending
                      ? "Activates at turn end"
                      : "At turn end, if reached"}
                </strong>
                {t.text}
              </p>
            </div>
          ))}
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
              intent = intention(enemy, combat),
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
                      {waiting ? "Waits this phase" : `Acts ${index + 1}`}
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
                  {enemy.strength > 0 && <span>Attack +{enemy.strength}</span>}
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
          {["Mara", "Eryn", "Aldren"].map((name, index) => (
            <div className="companion" key={name} data-companion={name}>
              <Art sheet="companions" index={index} />
              <span>
                {name}
                <small>
                  {["The guardian", "The ranger", "The emberkeeper"][index]}
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
          <button
            className="pile"
            onClick={() =>
              inspect({
                title: "Draw pile · order hidden",
                cards: [...combat.draw].sort((a, b) =>
                  a.def.localeCompare(b.def),
                ),
              })
            }
          >
            <Icon name="deck" />
            <span>
              Draw <b>{combat.draw.length}</b>
            </span>
          </button>
        </div>
        <Hand
          cards={combat.hand}
          energy={combat.energy}
          selected={selected}
          select={select}
          busy={busy}
          reduced={reduced}
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
          <button
            className="pile"
            onClick={() =>
              inspect({ title: "Discard pile", cards: combat.discard })
            }
          >
            <Icon name="deck" />
            <span>
              Discard <b>{combat.discard.length}</b>
            </span>
          </button>
          <button
            className="text-button"
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
        >
          <p>{enemyDef(enemy.def).special}</p>
          <p>
            Intention now:{" "}
            <b>
              {intention(enemy, combat).kind} {intention(enemy, combat).amount}
            </b>
            .
          </p>
          <p>
            Base cycle:{" "}
            {enemyDef(enemy.def)
              .pattern.map((i) => `${i.kind} ${i.amount}`)
              .join(" → ")}
            . Attack modifiers and Weak are already included in the visible
            intention.
          </p>
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
  const leave = (
    <button className="primary" onClick={() => dispatch({ type: "leave" })}>
      Return to the road <Icon name="arrow" size={18} />
    </button>
  );
  return (
    <section className="stop-scene scene-enter">
      {s.kind === "reward" && (
        <>
          <p className="eyebrow">The fellowship endures</p>
          <h1>A little stronger, together.</h1>
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
          <h1>The fire is for all of us.</h1>
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
          <h1>{EVENTS[s.event]?.title}</h1>
          <p className="story-copy">{EVENTS[s.event]?.text}</p>
          {s.resolved ? (
            <>
              <p className="resolved-copy">{s.resolved}</p>
              {leave}
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
          <h1>Something for the long road.</h1>
          <p className="story-copy">
            “Take what you need. Leave a light in the window when you get home.”
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
                  <span className="price">{id ? "40 gold" : "Purchased"}</span>
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
                <small>Restore {20 + (has(run, "bowl") ? 3 : 0)} health.</small>
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
                {choose === "upgrade" ? (
                  <CardView card={{ ...candidate, upgraded: true }} preview />
                ) : (
                  <p>This copy will leave your deck.</p>
                )}
              </div>
              <div className="dialog-actions">
                <button onClick={() => setCandidate(null)}>
                  Choose another
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    dispatch(
                      choose === "upgrade"
                        ? { type: "upgrade", uid: candidate.uid }
                        : { type: "buy", item: "remove", index: candidate.uid },
                    );
                    setChoose(null);
                    setCandidate(null);
                  }}
                >
                  {choose === "upgrade"
                    ? "Confirm improvement"
                    : "Remove · 45 gold"}
                </button>
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
    </section>
  );
}
