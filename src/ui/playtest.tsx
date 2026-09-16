import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cardDef, enemyDef, needsTarget } from "../game/content";
import { resolve } from "../game/engine";
import type { Action, Card, Run } from "../game/model";
import {
  PLAYTEST_DECKS,
  PLAYTEST_ENCOUNTERS,
  createPlaytestRun,
} from "../game/playtest-fixtures";
import {
  DecisionClock,
  beginRecord,
  exportFight,
  exportFightCsv,
  metricDefinitions,
  projectPhase,
  recordAction,
  summarize,
} from "../game/playtest";
import type { FightRecord, TestRules } from "../game/playtest";
import { CardView, Modal } from "./components";
import { CombatBoard } from "./scenes";
import type { Inspect } from "./scenes";
import "./playtest.css";

const questions = [
  "Turns with no useful action, and why",
  "One turn with two concrete alternatives",
  "Turn victory or defeat felt inevitable",
  "Did you delay winning to obtain healing? Why?",
  "What surprised you?",
  "How did you try to recover?",
  "Which decision was decisive?",
  "What was frustrating?",
];
type Fixture = Parameters<typeof createPlaytestRun>[0];
type Session = { run: Run; record: FightRecord; started: number };

function download(content: string, extension: "json" | "csv") {
  const url = URL.createObjectURL(
    new Blob([content], {
      type: extension === "json" ? "application/json" : "text/csv",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `last-ember-v02.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Playtest({ close }: { close: () => void }) {
  const [fixture, setFixture] = useState<Fixture>({
    seed: "pair-1",
    deckId: "quiet",
    encounterId: "fury",
  });
  const [rules, setRules] = useState<TestRules>("control");
  const [player, setPlayer] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [inspection, inspect] = useState<Inspect>(null);
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState<"reset" | "exit" | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const clock = useRef(new DecisionClock());
  const eligible = session?.run.scene.kind === "combat" && !paused && !confirm;
  useLayoutEffect(() => {
    const sync = () =>
      clock.current.set(eligible && !document.hidden, performance.now());
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clock.current.set(false, performance.now());
      document.removeEventListener("visibilitychange", sync);
    };
  }, [eligible, session]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const projection = useMemo(
    () =>
      session?.run.scene.kind === "combat"
        ? projectPhase(session.run, session.record.config.rules)
        : null,
    [session],
  );
  const dispatch = (action: Action) => {
    if (!session || !eligible) return;
    const now = performance.now();
    clock.current.set(false, now);
    const result = resolve(session.run, action, session.record.config.rules);
    if (result.error) {
      setError(result.error);
      clock.current.set(!document.hidden, performance.now());
      return;
    }
    const decisionMs = clock.current.take(now);
    setSession({
      ...session,
      run: result.run,
      record: recordAction(
        session.record,
        session.run,
        action,
        result,
        decisionMs,
        now - session.started,
      ),
    });
    setSelected(null);
    setError("");
  };
  const select = (card: Card) => {
    if (session?.run.scene.kind !== "combat") return;
    const enemies = session.run.scene.enemies.filter((e) => e.hp > 0);
    if (needsTarget(cardDef(card.def)) && enemies.length !== 1)
      setSelected(selected === card.uid ? null : card.uid);
    else
      dispatch({
        type: "play",
        uid: card.uid,
        target: enemies[0]?.uid ?? null,
      });
  };
  const start = () => {
    const run = createPlaytestRun(fixture);
    const config = {
      ...fixture,
      variant: fixture.variant ?? "base",
      seed: run.seed,
      rules,
      player: player.trim() || "anonymous",
    };
    clock.current = new DecisionClock();
    setSession({
      run,
      record: beginRecord(config, run),
      started: performance.now(),
    });
    setPaused(false);
    setSelected(null);
    setNotes({});
    setError("");
  };
  return (
    <main
      className="app playtest"
      style={{ backgroundImage: "url(/assets/forest.webp)" }}
    >
      <header className="topbar">
        <b>The Last Ember · v0.2 benchmark</b>
        <button onClick={() => (session ? setConfirm("exit") : close())}>
          Return to adventure
        </button>
      </header>
      <section className="benchmark-banner" aria-label="Benchmark identity">
        <strong>
          {session
            ? `${session.record.config.rules === "control" ? "CONTROL · current permanent strength" : "CANDIDATE · conditional strength"} · ${session.record.config.deckId} / ${session.record.config.encounterId} · ${session.record.config.variant} · seed ${session.record.config.seed}`
            : "Isolated structural experiment"}
        </strong>
        <p>
          No adventure saves or history are changed. No rewards or travel.
          Export before resetting or leaving; benchmark data stays only in this
          tab.
        </p>
        {session && (
          <div className="dialog-actions">
            <button onClick={() => setConfirm("reset")}>
              {session.record.result ? "Reset benchmark" : "Abandon / reset"}
            </button>
            {session.run.scene.kind === "combat" && (
              <button onClick={() => setPaused(!paused)}>
                {paused ? "Resume benchmark" : "Pause benchmark"}
              </button>
            )}
          </div>
        )}
      </section>
      {!session ? (
        <section className="benchmark-setup">
          <h1>Compare the same fight.</h1>
          <p>
            70 health · 3 energy · 12 base cards · 5 opening cards · Act II · no
            relics
          </p>
          <div className="benchmark-fields">
            <label>
              Rules
              <select
                value={rules}
                onChange={(e) => {
                  if (
                    e.target.value === "control" ||
                    e.target.value === "candidate"
                  )
                    setRules(e.target.value);
                }}
              >
                <option value="control">Current rules · control</option>
                <option value="candidate">
                  Conditional strength · candidate
                </option>
              </select>
            </label>
            <label>
              Deck
              <select
                value={fixture.deckId}
                onChange={(e) => {
                  const deck = PLAYTEST_DECKS.find(
                    (d) => d.id === e.target.value,
                  );
                  if (deck)
                    setFixture({
                      ...fixture,
                      deckId: deck.id,
                      variant: "base",
                    });
                }}
              >
                {PLAYTEST_DECKS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Encounter
              <select
                value={fixture.encounterId}
                onChange={(e) => {
                  const encounter = PLAYTEST_ENCOUNTERS.find(
                    (d) => d.id === e.target.value,
                  );
                  if (encounter)
                    setFixture({ ...fixture, encounterId: encounter.id });
                }}
              >
                {PLAYTEST_ENCOUNTERS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Variant
              <select
                value={fixture.variant ?? "base"}
                onChange={(e) => {
                  if (e.target.value === "base")
                    setFixture({ ...fixture, variant: "base" });
                  else if (fixture.deckId !== "quiet")
                    setFixture({
                      ...fixture,
                      deckId: fixture.deckId,
                      variant: "ablation",
                    });
                }}
              >
                <option value="base">Base · paired comparison matrix</option>
                {fixture.deckId !== "quiet" && (
                  <option value="ablation">
                    Diagnostic only ·{" "}
                    {fixture.deckId === "exposed"
                      ? "Spark + Sacrifice"
                      : "2 × Iron answer"}{" "}
                    replaced by Strike
                  </option>
                )}
              </select>
            </label>
            <label>
              Seed
              <input
                maxLength={80}
                value={fixture.seed}
                onChange={(e) =>
                  setFixture({ ...fixture, seed: e.target.value })
                }
              />
            </label>
            <label>
              Local player pseudonym
              <input
                maxLength={80}
                value={player}
                placeholder="anonymous"
                onChange={(e) => setPlayer(e.target.value)}
              />
            </label>
          </div>
          <p>
            Thresholds unlock once at player turn end. Candidate strength
            switches off below its threshold and back on above it. Summons and
            granted block are not undone. Control retains permanent strength.
          </p>
          <p className="muted">
            Use the same deck, encounter and seed in both rules. Results resolve
            immediately in both modes. Pause for interruptions; visible idle
            time otherwise counts as active decision time.
          </p>
          <button className="primary" onClick={start}>
            Start benchmark fight
          </button>
        </section>
      ) : session.run.scene.kind === "combat" ? (
        <>
          {paused && (
            <p className="benchmark-banner" role="status">
              Paused. Active decision time is stopped.
            </p>
          )}
          {projection && (
            <details className="phase-projection" open>
              <summary>
                Exact end-turn projection · {session.run.hp - projection.run.hp}{" "}
                health lost · {projection.run.hp} health remaining
              </summary>
              <p>
                In order, including pending thresholds, Weak, boss conditions
                and earlier Howl. New summons wait this phase. Newly reached
                locked thresholds during Howl wait for the next player end.
              </p>
              <ol>
                {projection.frames
                  .filter((f) => f.cue !== "draw")
                  .map((f, i) => (
                    <li key={i}>{f.text}</li>
                  ))}
              </ol>
              <p>
                {projection.run.scene.kind === "ending"
                  ? "This phase ends the fight in defeat."
                  : `Next player turn clears remaining party block. Next Dread: ${projection.run.scene.kind === "combat" ? projection.run.scene.dread : ""}.`}
              </p>
              {projection.run.scene.kind === "combat" && (
                <p>
                  Enemy outcome:{" "}
                  {projection.run.scene.enemies
                    .filter((e) => e.hp > 0)
                    .map(
                      (e) =>
                        `${enemyDef(e.def).name} ${e.hp} HP / ${e.block} block`,
                    )
                    .join("; ")}
                </p>
              )}
            </details>
          )}
          <CombatBoard
            run={session.run}
            combat={session.run.scene}
            dispatch={dispatch}
            selected={selected}
            select={select}
            busy={!eligible}
            feedback={null}
            stage="impact"
            inspect={inspect}
            reduced
            mode={session.record.config.rules}
          />
        </>
      ) : (
        session.record.result && (
          <section className="benchmark-results">
            <h1>
              Benchmark{" "}
              {session.record.result.outcome === "win" ? "victory" : "defeat"}
            </h1>
            <p>
              {session.record.result.finalHealth} health ·{" "}
              {session.record.result.playerTurns} player turns ·{" "}
              {summarize(session.record).played} cards played ·{" "}
              {summarize(session.record).drawn} drawn
            </p>
            <p>
              Duration {(session.record.result.durationMs / 1000).toFixed(1)}s ·
              active decision{" "}
              {(summarize(session.record).activeDecisionMs / 1000).toFixed(1)}s
            </p>
            <p>
              Suppressed pre-block attack damage:{" "}
              {summarize(session.record).suppressedAttackDamage}. This is not
              health saved.
            </p>
            <h2>Short observer notes</h2>
            <div className="benchmark-fields">
              {questions.map((question) => (
                <label key={question}>
                  {question}
                  <textarea
                    rows={2}
                    value={notes[question] ?? ""}
                    onChange={(e) =>
                      setNotes({ ...notes, [question]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="dialog-actions">
              <button
                className="primary"
                onClick={() =>
                  download(exportFight(session.record, notes), "json")
                }
              >
                Export fight JSON + notes
              </button>
              <button
                onClick={() => download(exportFightCsv(session.record), "csv")}
              >
                Export summary CSV
              </button>
            </div>
            <details>
              <summary>Measurement definitions and recorded data</summary>
              {Object.entries(metricDefinitions).map(([key, text]) => (
                <p key={key}>
                  <b>{key}: </b>
                  {text}
                </p>
              ))}
              <pre>{exportFight(session.record, notes)}</pre>
            </details>
          </section>
        )
      )}
      {error && <p role="alert">{error}</p>}
      {confirm && (
        <Modal
          title={
            session?.record.result
              ? "Clear benchmark data?"
              : "Abandon this benchmark?"
          }
          close={() => setConfirm(null)}
        >
          <p>
            {session?.record.result
              ? "Export your result and notes first. Reset clears only this benchmark."
              : "This fight will not be recorded as a completed result. Your adventure is unchanged."}
          </p>
          <button onClick={() => setConfirm(null)}>Keep benchmark</button>
          <button
            onClick={() => {
              const exit = confirm === "exit";
              setSession(null);
              setConfirm(null);
              setSelected(null);
              setNotes({});
              if (exit) close();
            }}
          >
            Confirm {confirm === "exit" ? "return to adventure" : "reset"}
          </button>
        </Modal>
      )}
      {inspection && (
        <Modal title={inspection.title} close={() => inspect(null)} wide>
          <div className="deck-grid">
            {inspection.cards.map((card) => (
              <CardView key={card.uid} card={card} />
            ))}
          </div>
        </Modal>
      )}
    </main>
  );
}
