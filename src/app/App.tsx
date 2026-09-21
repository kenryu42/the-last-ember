import { useEscapeDismiss } from "../ui/shared/useEscapeDismiss";
import { SettingsPanel } from "./SettingsPanel";
import { CardInspection } from "../ui/cards/CardInspection";
import { useGameSession } from "./useGameSession";
import { useSettings } from "./useSettings";
import { useActionPresentation } from "../ui/combat/useActionPresentation";
import { lazy, Suspense, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ACTS } from "../game/content/world";
import { RELICS } from "../game/content/relics";
import { cardDef, needsTarget } from "../game/content/cards";
import type { Card } from "../game/model";
import { loadHistory } from "../platform/browser/history";
import type { Settings } from "../platform/browser/settings";
import { setSoundscape, wakeAudio } from "../ui/audio/audio";
import { CombatEffects, attackTiming, powerfulCard } from "../ui/combat/combat-effects";
import { Art } from "../ui/shared/Art";
import { Icon } from "../ui/shared/Icon";
import { Modal } from "../ui/shared/Modal";
import { Rules } from "../ui/shared/Rules";
import { CombatBoard } from "../ui/combat/CombatBoard";
import { JourneyCrossroads } from "../ui/journey/JourneyCrossroads";
import { StopScene } from "../ui/stops/StopScene";
import type { Inspect } from "../ui/cards/inspection";
import { ArrivalTransition, EncounterIntro } from "../ui/journey/encounters";
import "../ui/styles/style.css";

const Playtest = import.meta.env?.DEV
  ? lazy(() =>
      import("../ui/devtools/playtest").then(({ Playtest }) => ({
        default: Playtest,
      })),
    )
  : null;

type Panel = "rules" | "settings" | "history" | "relics" | null;
export function App() {
  const [title, setTitle] = useState(true);
  const { settings, updateSettings: persistSettings } = useSettings();
  const [panel, setPanel] = useState<Panel>(null);
  const [inspection, inspect] = useState<Inspect>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [tutorial, setTutorial] = useState<number | null>(null);
  const [benchmark, setBenchmark] = useState(false);
  const presentation = useActionPresentation();
  const { visual, feedback, stage, actingCard, animationSpeed } = presentation;
  const {
    run,
    current,
    locked,
    busy,
    error,
    setError,
    saved,
    arrival,
    completeArrival,
    commit,
    dispatch,
    enterEncounter,
    beginRun,
  } = useGameSession({
    settings,
    present: presentation.play,
    onActionStart: () => {
      wakeAudio();
      setSelected(null);
      presentation.clear();
    },
    onActionComplete: (action) =>
      setTutorial((step) =>
        step === 2 && action.type === "play"
          ? 3
          : step === 3 && action.type === "end"
            ? null
            : step,
      ),
  });
  const shown = visual ?? run;
  useEffect(() => {
    setSoundscape(shown, title);
  }, [shown, title]);
  useEscapeDismiss(() => setSelected(null));
  const updateSettings = (next: Settings) => {
    if (!persistSettings(next)) setError("Settings could not be saved in this browser.");
  };
  const select = (card: Card) => {
    wakeAudio();
    if (locked.current) return;
    if (needsTarget(cardDef(card.def))) {
      const scene = current.current?.scene;
      const living = scene?.kind === "combat" ? scene.enemies.filter((enemy) => enemy.hp > 0) : [];
      if (living.length === 1 && living[0])
        void dispatch({ type: "play", uid: card.uid, target: living[0].uid });
      else setSelected(selected === card.uid ? null : card.uid);
    } else void dispatch({ type: "play", uid: card.uid, target: null });
  };
  const begin = () => {
    beginRun();
    setTitle(false);
    setPanel(null);
    presentation.clear();
    setSelected(null);
    setTutorial(0);
    wakeAudio();
  };
  const closeTutorial = () => {
    setTutorial(null);
  };
  if (benchmark && Playtest)
    return (
      <Suspense fallback={<output style={{ display: "block" }}>Loading benchmark…</output>}>
        <Playtest close={() => setBenchmark(false)} />
      </Suspense>
    );
  const timing = attackTiming(feedback?.cue ?? "draw", powerfulCard(actingCard), animationSpeed);
  const presentationStyle: CSSProperties & {
    "--combat-travel": string;
    "--combat-impact": string;
    "--hand-settle": string;
  } = {
    backgroundImage: `url(/assets/${title ? "forest" : (ACTS[shown?.act ?? 0]?.file ?? "forest")}.webp)`,
    "--combat-travel": `${timing.travel}ms`,
    "--combat-impact": `${timing.impact}ms`,
    "--hand-settle": `${200 / animationSpeed}ms`,
  };
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Delegated user gestures unlock browser audio; main is not itself a control.
    <main
      className={`app ${title ? "title-screen" : ""} ${shown?.scene.kind === "combat" && !shown.scene.introPending && !arrival && !title ? "in-combat" : ""}`}
      style={presentationStyle}
      onPointerDown={wakeAudio}
      onKeyDown={wakeAudio}
    >
      <div className="atmosphere" aria-hidden="true" />
      {!settings.reduced && (
        <CombatEffects
          frame={!title && busy ? feedback : null}
          stage={stage}
          card={actingCard}
          speed={animationSpeed}
        />
      )}
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            if (!locked.current) {
              setTitle(true);
              setTutorial(null);
            }
          }}
          disabled={busy}
          aria-label="The Last Ember, title screen"
        >
          <Icon name="flame" size={27} />
          <span>The Last Ember</span>
        </button>
        {!title && shown ? (
          <div className="run-resources">
            <span className="resource health">
              <Icon name="heart" size={18} />
              <b>{shown.hp}</b>
              <small>/ {shown.maxHp}</small>
            </span>
            <span className="resource gold">
              <Icon name="coin" size={18} />
              <b>{shown.gold}</b>
              <small>gold</small>
            </span>
            <button onClick={() => inspect({ title: "Your permanent deck", cards: shown.deck })}>
              <Icon name="deck" size={18} />
              {shown.deck.length}
              <span className="nav-label"> cards</span>
            </button>
            <button onClick={() => setPanel("relics")}>
              <Icon name="elite" size={18} />
              {shown.relics.length}
              <span className="nav-label"> relics</span>
            </button>
          </div>
        ) : (
          <span className="top-tag">A fellowship against the dark</span>
        )}
        <nav aria-label="Game tools">
          <button onClick={() => setPanel("rules")}>Rules</button>
          <button
            className="icon-button"
            onClick={() => setPanel("settings")}
            aria-label="Settings"
          >
            <Icon name="settings" />
          </button>
        </nav>
      </header>
      {title ? (
        <section className="title-content scene-enter">
          <p className="eyebrow">A solo deckbuilding adventure</p>
          <h1>
            The Last
            <br />
            <em>Ember</em>
          </h1>
          <span className="title-rule" />
          <p className="title-prose">
            Three companions. A kingdom gone quiet.
            <br />
            One light worth carrying.
          </p>
          <div className="title-actions">
            {run && run.scene.kind !== "ending" && (
              <button
                className="primary"
                onClick={() => {
                  setTitle(false);
                  presentation.clear();
                  wakeAudio();
                }}
              >
                Continue journey <Icon name="arrow" size={18} />
                <small>
                  Act {run.act + 1} · {run.hp} health · {run.deck.length} cards
                </small>
              </button>
            )}
            <button
              className={run && run.scene.kind !== "ending" ? "secondary" : "primary"}
              onClick={begin}
            >
              Begin a new journey <Icon name="arrow" size={18} />
            </button>
            <button className="text-button" onClick={() => setPanel("history")}>
              Journeys remembered
            </button>
            {Playtest &&
              typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).get("benchmark") === "1" && (
                <button className="text-button" onClick={() => setBenchmark(true)}>
                  v0.2 benchmark · isolated test mode
                </button>
              )}
          </div>
          <p className="title-footnote">Turn-based · Saved locally · Made for a quiet evening</p>
        </section>
      ) : arrival && shown ? (
        <ArrivalTransition
          from={arrival.from}
          node={arrival.node}
          destination={shown}
          speed={settings.gameplaySpeed}
          reduced={settings.reduced}
          complete={completeArrival}
        />
      ) : (
        shown && (
          <>
            {shown.scene.kind === "map" && (
              <JourneyCrossroads
                key={`${shown.act}-${shown.row}`}
                run={shown}
                busy={busy}
                dispatch={(action) => void dispatch(action)}
              />
            )}
            {shown.scene.kind === "combat" && shown.scene.introPending && (
              <EncounterIntro run={shown} combat={shown.scene} enter={enterEncounter} />
            )}
            {shown.scene.kind === "combat" && !shown.scene.introPending && (
              <CombatBoard
                run={shown}
                combat={shown.scene}
                dispatch={(action) => void dispatch(action)}
                selected={selected}
                select={select}
                busy={busy}
                feedback={feedback}
                stage={stage}
                inspect={inspect}
                reduced={settings.reduced}
              />
            )}
            {["reward", "camp", "event", "shop"].includes(shown.scene.kind) && (
              <StopScene
                key={`${shown.location}-${shown.scene.kind}`}
                run={shown}
                dispatch={(action) => void dispatch(action)}
                inspect={inspect}
              />
            )}
            {shown.scene.kind === "ending" && (
              <section className="ending scene-enter">
                <Icon name="flame" size={60} />
                <p className="eyebrow">
                  {shown.scene.won ? "The beacon is lit" : "The road falls silent"}
                </p>
                <h1>{shown.scene.won ? "And morning came." : "Even a small light mattered."}</h1>
                <p className="story-copy">
                  {shown.scene.won
                    ? "Far below, a window opens. Then another. Mara lays down her shield. Eryn watches the valleys fill with gold. Aldren warms his empty hands. The light no longer belongs to them alone."
                    : "Mara stays until the last. Eryn remembers the way home. In the dark, Aldren cups the ember once more. Your names will not be written on the mountain. But someone along the road remembers your kindness."}
                </p>
                <div className="ending-stats">
                  <span>
                    <b>{shown.stats.battles}</b>Battles won
                  </span>
                  <span>
                    <b>{shown.stats.cards}</b>Cards played
                  </span>
                  <span>
                    <b>{shown.stats.damage}</b>Damage dealt
                  </span>
                  <span>
                    <b>{shown.stats.thresholds}</b>Dread awakened
                  </span>
                </div>
                <p className="muted">
                  Seed {shown.seed} · Act {shown.act + 1} · {shown.stats.turns} turns ended
                </p>
                <div className="dialog-actions">
                  <button className="primary" onClick={begin}>
                    Carry the light again
                  </button>
                  <button
                    onClick={() =>
                      inspect({
                        title: "The deck that brought you here",
                        cards: shown.deck,
                      })
                    }
                  >
                    Remember the fellowship
                  </button>
                </div>
              </section>
            )}
          </>
        )
      )}
      <footer className="footer">
        <span>
          {!title && shown
            ? `ACT ${shown.act + 1} / III · ${shown.seed}`
            : "THE LAST EMBER · FIRST EDITION"}
        </span>
        <span>
          {saved ? "Progress saved locally" : "Progress not saved"}
          <i className={saved ? "save-dot" : "save-dot failed"} />
        </span>
      </footer>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss message">
            <Icon name="close" size={17} />
          </button>
        </div>
      )}
      {tutorial !== null &&
        !title &&
        !arrival &&
        !(shown?.scene.kind === "combat" && shown.scene.introPending) && (
          <section className="tutorial" aria-label="Introduction">
            <div className="eyebrow">A first journey · {tutorial + 1} / 4</div>
            <h3>
              {
                ["Stay together", "Power has a price", "Make your first move", "Let them answer"][
                  tutorial
                ]
              }
            </h3>
            <p>
              {
                [
                  "You share health, a deck, and three energy. At each crossroads, choose left, straight ahead, or right. You discover what waits only after choosing a path.",
                  "Choose who carries the Ember. Strong magic raises Dread. Every turn, 4–7 empowers the front enemy; 8–10 empowers all enemies, then falls by 4. Lower Dread before ending to avoid the response.",
                  "Click a card. Choose an enemy for attacks; the last living enemy is targeted automatically. Guards play immediately. Intentions show what happens if you end now.",
                  "Play what you need, then End turn. Your remaining hand is discarded and you draw five. Block protects now, then clears at your next turn.",
                ][tutorial]
              }
            </p>
            <div className="dialog-actions">
              {tutorial < 2 && (
                <button className="primary" onClick={() => setTutorial(tutorial + 1)}>
                  Next
                </button>
              )}
              <button className="text-button" onClick={closeTutorial}>
                {tutorial < 2 ? "Skip introduction" : "Got it"}
              </button>
            </div>
          </section>
        )}
      {panel === "rules" && (
        <Modal title="How to carry the light" close={() => setPanel(null)}>
          <Rules />
        </Modal>
      )}
      {panel === "settings" && (
        <SettingsPanel
          settings={settings}
          updateSettings={updateSettings}
          run={run}
          busy={busy}
          error={error}
          setError={setError}
          close={() => setPanel(null)}
          showTitle={() => {
            setPanel(null);
            setTitle(true);
            setTutorial(null);
          }}
          showTutorial={() => {
            setPanel(null);
            setTutorial(0);
            setTitle(false);
          }}
          restore={(next) => {
            commit(next);
            setTitle(false);
            setPanel(null);
            setSelected(null);
            presentation.clear();
          }}
        />
      )}
      {panel === "history" && (
        <Modal title="Journeys remembered" close={() => setPanel(null)}>
          {loadHistory().length ? (
            <ul className="history-list">
              {loadHistory().map((h, i) => (
                <li key={`${h.time}-${i}`}>
                  <Icon name={h.won ? "flame" : "camp"} />
                  <span>
                    <b>{h.won ? "The beacon was lit" : `Lost in act ${h.act + 1}`}</b>
                    <small>
                      {h.seed} · {h.turns} turns · {h.cards} cards played
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No journey has ended yet. There is still a road ahead.</p>
          )}
        </Modal>
      )}
      {panel === "relics" && shown && (
        <Modal title="What we carry" close={() => setPanel(null)}>
          {shown.relics.length ? (
            <div className="relic-list">
              {shown.relics.map((id) => {
                const relic = RELICS.find((r) => r.id === id);
                return relic ? (
                  <div key={id}>
                    <Art sheet="cards" index={relic.art} />
                    <span>
                      <h3>{relic.name}</h3>
                      <p>{relic.text}</p>
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p>No relics yet. Elites, guardians, events, and merchants may offer one.</p>
          )}
        </Modal>
      )}
      {inspection && <CardInspection inspection={inspection} close={() => inspect(null)} />}
    </main>
  );
}
