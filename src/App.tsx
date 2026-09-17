import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ACTS, RELICS, cardDef, needsTarget } from "./game/content";
import { newRun, resolve } from "./game/engine";
import type { Action, Card, Frame, Run } from "./game/model";
import {
  SAVE_KEY,
  loadHistory,
  loadRun,
  loadSettings,
  parseSave,
  recordEnding,
  saveRun,
  saveSettings,
} from "./game/storage";
import type { Settings } from "./game/storage";
import { configureAudio, setSoundscape, sound, wakeAudio } from "./ui/audio";
import { CombatEffects, attackTiming, powerfulCard } from "./ui/combat-effects";
import { Art, CardView, Icon, Modal, Rules } from "./ui/components";
import { CombatBoard, JourneyMap, StopScene } from "./ui/scenes";
import type { Inspect } from "./ui/scenes";
import "./ui/style.css";

const Playtest = import.meta.env?.DEV
  ? lazy(() =>
      import("./ui/playtest").then(({ Playtest }) => ({ default: Playtest })),
    )
  : null;

type Panel = "rules" | "settings" | "history" | "relics" | null;
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export function App() {
  const [loaded] = useState(loadRun),
    [run, setRun] = useState<Run | null>(
      loaded.kind === "valid" ? loaded.run : null,
    );
  const current = useRef(run),
    locked = useRef(false);
  const [title, setTitle] = useState(true),
    [settings, setSettings] = useState(loadSettings),
    settingsRef = useRef(settings);
  const [panel, setPanel] = useState<Panel>(null),
    [inspection, inspect] = useState<Inspect>(null),
    [inspectedCard, setInspectedCard] = useState<Card | null>(null);
  const [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  const [visual, setVisual] = useState<Run | null>(null),
    [feedback, setFeedback] = useState<Frame | null>(null),
    [stage, setStage] = useState<"anticipate" | "impact">("impact");
  const [error, setError] = useState(
      loaded.kind === "error" ? loaded.message : "",
    ),
    [saved, setSaved] = useState(true);
  const [tutorial, setTutorial] = useState<number | null>(null);
  const [actingCard, setActingCard] = useState<Card | null>(null);
  const [benchmark, setBenchmark] = useState(false);
  const shown = visual ?? run;
  useEffect(() => {
    setSoundscape(shown, title);
  }, [shown, title]);
  useEffect(() => {
    configureAudio(settings);
    settingsRef.current = settings;
    document.documentElement.dataset.reduced = String(settings.reduced);
    document.documentElement.dataset.shake = String(settings.shake);
  }, [settings]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const updateSettings = (next: Settings) => {
    setSettings(next);
    if (!saveSettings(next))
      setError("Settings could not be saved in this browser.");
  };
  const commit = (next: Run) => {
    current.current = next;
    setRun(next);
    const message = saveRun(next);
    setSaved(message === null);
    if (message) setError(message);
  };
  const dispatch = async (action: Action) => {
    if (!current.current || locked.current) return;
    wakeAudio();
    const before = current.current,
      result = resolve(before, action);
    if (result.error) {
      setError(result.error);
      return;
    }
    locked.current = true;
    setBusy(true);
    setSelected(null);
    setError("");
    setFeedback(null);
    const playedCard =
      action.type === "play" && before.scene.kind === "combat"
        ? (before.scene.hand.find((card) => card.uid === action.uid) ?? null)
        : null;
    setActingCard(playedCard);
    if (action.type === "play" && !settingsRef.current.reduced) {
      const source = document.querySelector<HTMLElement>(
        `.hand [data-card="${action.uid}"]`,
      );
      const destination = document
        .querySelector(".end-pile")
        ?.getBoundingClientRect();
      if (source && destination) {
        const rect = source.getBoundingClientRect(),
          ghost = source.cloneNode(true);
        if (ghost instanceof HTMLElement) {
          ghost.classList.add("flying-card");
          ghost.classList.remove("selected");
          ghost.setAttribute("aria-hidden", "true");
          ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
          document.body.append(ghost);
          const animation = ghost.animate(
            [
              { transform: "translateY(-10px) scale(1)", opacity: 1 },
              {
                transform: `translate(${destination.left - rect.left}px,${destination.top - rect.top}px) scale(.25) rotate(12deg)`,
                opacity: 0,
              },
            ],
            { duration: 360, easing: "cubic-bezier(.3,0,.5,1)" },
          );
          animation.onfinish = () => ghost.remove();
        }
      }
    }
    commit(result.run);
    if (result.run.scene.kind === "ending" && before.scene.kind !== "ending")
      recordEnding(result.run);
    if (before.scene.kind === "combat" && !settingsRef.current.reduced) {
      setVisual(before);
      for (const frame of result.frames) {
        setFeedback(frame);
        setStage("anticipate");
        const powerful = powerfulCard(playedCard);
        const timing = attackTiming(frame.cue, powerful);
        if (["blade", "arrow", "spell", "enemy"].includes(frame.cue))
          sound(frame.cue, { phase: "launch", blocked: false, powerful });
        await delay(timing.travel);
        // Keep the board mounted until input unlocks. Revealing reward controls
        // sooner makes an apparently available click disappear into the lock.
        if (frame.run.scene.kind === "combat") setVisual(frame.run);
        setStage("impact");
        sound(frame.cue, {
          phase: "impact",
          blocked: frame.text.includes("blocked"),
          powerful,
        });
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
    locked.current = false;
    setBusy(false);
    if (tutorial === 2 && action.type === "play") setTutorial(3);
    if (tutorial === 3 && action.type === "end") {
      setTutorial(null);
    }
  };
  const select = (card: Card) => {
    wakeAudio();
    if (locked.current) return;
    if (needsTarget(cardDef(card.def))) {
      const scene = current.current?.scene;
      const living =
        scene?.kind === "combat"
          ? scene.enemies.filter((enemy) => enemy.hp > 0)
          : [];
      if (living.length === 1 && living[0])
        void dispatch({ type: "play", uid: card.uid, target: living[0].uid });
      else setSelected(selected === card.uid ? null : card.uid);
    } else void dispatch({ type: "play", uid: card.uid, target: null });
  };
  const begin = () => {
    const next = newRun(`ember-${Date.now().toString(36)}`);
    setError("");
    commit(next);
    setTitle(false);
    setPanel(null);
    setFeedback(null);
    setSelected(null);
    setTutorial(0);
    wakeAudio();
  };
  const exportSave = () => {
    try {
      const content = current.current
        ? JSON.stringify(current.current, null, 2)
        : localStorage.getItem(SAVE_KEY);
      if (!content) {
        setError("There is no journey to export.");
        return;
      }
      const url = URL.createObjectURL(
        new Blob([content], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "the-last-ember-save.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export is unavailable in this browser.");
    }
  };
  const closeTutorial = () => {
    setTutorial(null);
  };
  if (benchmark && Playtest)
    return (
      <Suspense fallback={<p role="status">Loading benchmark…</p>}>
        <Playtest close={() => setBenchmark(false)} />
      </Suspense>
    );
  return (
    <main
      className={`app ${title ? "title-screen" : ""} ${shown?.scene.kind === "combat" && !title ? "in-combat" : ""}`}
      style={{
        backgroundImage: `url(/assets/${title ? "forest" : (ACTS[shown?.act ?? 0]?.file ?? "forest")}.webp)`,
      }}
      onPointerDown={wakeAudio}
      onKeyDown={wakeAudio}
    >
      <div className="atmosphere" aria-hidden="true" />
      {!title && busy && feedback && !settings.reduced && (
        <CombatEffects frame={feedback} stage={stage} card={actingCard} />
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
            <button
              onClick={() =>
                inspect({ title: "Your permanent deck", cards: shown.deck })
              }
            >
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
                  setFeedback(null);
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
              className={
                run && run.scene.kind !== "ending" ? "secondary" : "primary"
              }
              onClick={begin}
            >
              Begin a new journey <Icon name="arrow" size={18} />
            </button>
            <button className="text-button" onClick={() => setPanel("history")}>
              Journeys remembered
            </button>
            {Playtest &&
              typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).get("benchmark") ===
                "1" && (
                <button
                  className="text-button"
                  onClick={() => setBenchmark(true)}
                >
                  v0.2 benchmark · isolated test mode
                </button>
              )}
          </div>
          <p className="title-footnote">
            Turn-based · Saved locally · Made for a quiet evening
          </p>
        </section>
      ) : (
        shown && (
          <>
            {shown.scene.kind === "map" && (
              <JourneyMap
                run={shown}
                dispatch={(action) => void dispatch(action)}
              />
            )}
            {shown.scene.kind === "combat" && (
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
                  {shown.scene.won
                    ? "The beacon is lit"
                    : "The road falls silent"}
                </p>
                <h1>
                  {shown.scene.won
                    ? "And morning came."
                    : "Even a small light mattered."}
                </h1>
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
                  Seed {shown.seed} · Act {shown.act + 1} · {shown.stats.turns}{" "}
                  turns ended
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
      {tutorial !== null && !title && (
        <aside className="tutorial" role="region" aria-label="Introduction">
          <div className="eyebrow">A first journey · {tutorial + 1} / 4</div>
          <h3>
            {
              [
                "Stay together",
                "Power has a price",
                "Make your first move",
                "Let them answer",
              ][tutorial]
            }
          </h3>
          <p>
            {
              [
                "You share health, a deck, and three energy. Follow a lit road node. A sword begins a battle; a question mark is a story.",
                "Strong ember magic raises Dread. At turn end, thresholds at 4 and 8 awaken once. You can lower Dread before ending to keep them quiet.",
                "Click a card. Choose an enemy for attacks; the last living enemy is targeted automatically. Guards play immediately. Intentions show what happens if you end now.",
                "Play what you need, then End turn. Your remaining hand is discarded and you draw five. Block protects now, then clears at your next turn.",
              ][tutorial]
            }
          </p>
          <div className="dialog-actions">
            {tutorial < 2 && (
              <button
                className="primary"
                onClick={() => setTutorial(tutorial + 1)}
              >
                Next
              </button>
            )}
            <button className="text-button" onClick={closeTutorial}>
              {tutorial < 2 ? "Skip introduction" : "Got it"}
            </button>
          </div>
        </aside>
      )}
      {panel === "rules" && (
        <Modal title="How to carry the light" close={() => setPanel(null)}>
          <Rules />
        </Modal>
      )}
      {panel === "settings" && (
        <Modal title="By your own light" close={() => setPanel(null)}>
          <div className="settings-fields">
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={(e) =>
                  updateSettings({ ...settings, muted: e.target.checked })
                }
              />
              Mute all audio
            </label>
            <label>
              Ambient music <span>{Math.round(settings.music * 100)}%</span>
              <input
                aria-label="Ambient music volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.music}
                onChange={(e) =>
                  updateSettings({ ...settings, music: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Sound effects <span>{Math.round(settings.effects * 100)}%</span>
              <input
                aria-label="Sound effects volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.effects}
                onChange={(e) => {
                  updateSettings({
                    ...settings,
                    effects: Number(e.target.value),
                  });
                  sound("shield");
                }}
              />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.reduced}
                onChange={(e) =>
                  updateSettings({ ...settings, reduced: e.target.checked })
                }
              />
              Reduced motion, immediate results
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.shake}
                onChange={(e) =>
                  updateSettings({ ...settings, shake: e.target.checked })
                }
              />
              Gentle impact shake
            </label>
          </div>
          <div className="dialog-actions">
            <button onClick={exportSave}>Export journey</button>
            <button
              onClick={() => {
                setPanel(null);
                setTitle(true);
                setTutorial(null);
              }}
              disabled={busy}
            >
              Save & title
            </button>
            <button
              onClick={() => {
                setPanel(null);
                setTutorial(0);
                setTitle(false);
              }}
              disabled={!run || busy}
            >
              Revisit introduction
            </button>
          </div>
          <p className="muted">
            Audio begins after a click or keypress. Changes save automatically.
            Export keeps a JSON copy for recovery and development.
          </p>
          <details>
            <summary>Restore an exported journey</summary>
            <label className="field-label">
              Save file
              <input
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1_000_000) {
                    setError("Save files must be smaller than 1 MB.");
                    return;
                  }
                  try {
                    const parsed = parseSave(await file.text());
                    if (parsed.kind === "valid") {
                      setError("");
                      commit(parsed.run);
                      setTitle(false);
                      setPanel(null);
                      setSelected(null);
                      setFeedback(null);
                    } else
                      setError(
                        parsed.kind === "error"
                          ? parsed.message
                          : "This file is empty.",
                      );
                  } catch {
                    setError("The selected file could not be read.");
                  }
                }}
              />
            </label>
            {error && (
              <p role="alert" className="warning">
                {error}
              </p>
            )}
          </details>
        </Modal>
      )}
      {panel === "history" && (
        <Modal title="Journeys remembered" close={() => setPanel(null)}>
          {loadHistory().length ? (
            <ul className="history-list">
              {loadHistory().map((h, i) => (
                <li key={`${h.time}-${i}`}>
                  <Icon name={h.won ? "flame" : "camp"} />
                  <span>
                    <b>
                      {h.won
                        ? "The beacon was lit"
                        : `Lost in act ${h.act + 1}`}
                    </b>
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
            <p>
              No relics yet. Elites, guardians, events, and merchants may offer
              one.
            </p>
          )}
        </Modal>
      )}
      {inspection && (
        <Modal
          title={`${inspection.title} · ${inspection.cards.length}`}
          close={() => {
            inspect(null);
            setInspectedCard(null);
          }}
          wide
        >
          {inspectedCard ? (
            <>
              <p>
                Every card has one improvement. Visit a camp to improve this
                copy.
              </p>
              <div className="upgrade-compare">
                <CardView card={inspectedCard} />
                {!inspectedCard.upgraded && (
                  <>
                    <Icon name="arrow" size={30} />
                    <CardView
                      card={{ ...inspectedCard, upgraded: true }}
                      preview
                    />
                  </>
                )}
              </div>
              <button onClick={() => setInspectedCard(null)}>
                Back to cards
              </button>
            </>
          ) : inspection.cards.length ? (
            <>
              <p className="muted">Select a card to inspect its improvement.</p>
              <div className="deck-grid">
                {inspection.cards.map((card) => (
                  <CardView
                    key={card.uid}
                    card={card}
                    onClick={() => setInspectedCard(card)}
                  />
                ))}
              </div>
            </>
          ) : (
            <p>There are no cards here.</p>
          )}
        </Modal>
      )}
    </main>
  );
}
