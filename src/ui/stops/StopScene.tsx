import { useLayoutEffect, useRef, useState } from "react";
import { EVENTS } from "../../game/content/world";
import { RELICS } from "../../game/content/relics";
import { has } from "../../game/engine/rewards";
import type { Action, Card, Run } from "../../game/model";
import { flameBranchSchema } from "../../game/model";
import { CardView } from "../cards/CardView";
import { Icon } from "../shared/Icon";
import { Modal } from "../shared/Modal";
import { EncounterIllustration, encounterArt } from "../journey/encounters";
import type { Inspect } from "../cards/inspection";
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
