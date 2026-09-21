import { useCallback, useEffect, useRef, useState } from "react";
import { resolve } from "../game/engine/resolve";
import { newRun } from "../game/engine/run";
import { shouldAutoEndTurn } from "../game/selectors/turn";
import type { Action, Resolution, RouteNode, Run } from "../game/model";
import { loadRun, saveRun } from "../platform/browser/saves";
import { recordEnding } from "../platform/browser/history";
import type { Settings } from "../platform/browser/settings";

export function useGameSession(options: {
  settings: Settings;
  present: (before: Run, action: Action, result: Resolution, settings: Settings) => Promise<void>;
  onActionStart: () => void;
  onActionComplete: (action: Action) => void;
}) {
  const [loaded] = useState(loadRun);
  const [run, setRun] = useState<Run | null>(loaded.kind === "valid" ? loaded.run : null);
  const current = useRef(run);
  const settings = useRef(options.settings);
  useEffect(() => {
    settings.current = options.settings;
  }, [options.settings]);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(loaded.kind === "error" ? loaded.message : "");
  const [saved, setSaved] = useState(true);
  const [arrival, setArrival] = useState<{ from: Run; node: RouteNode } | null>(null);
  const completeArrival = useCallback(() => {
    setArrival(null);
    locked.current = false;
    setBusy(false);
  }, []);
  const commit = (next: Run) => {
    current.current = next;
    setRun(next);
    const message = saveRun(next);
    setSaved(message === null);
    if (message) setError(message);
  };
  const dispatch = async (action: Action): Promise<void> => {
    const before = current.current;
    if (!before || locked.current || (before.scene.kind === "combat" && before.scene.introPending))
      return;
    const result = resolve(before, action);
    if (result.error) {
      setError(result.error);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    options.onActionStart();
    if (action.type === "travel") {
      const node = before.route.find((node) => node.id === action.node);
      if (node) {
        // Commit the encounter before travel plays, including its pending introduction.
        const arrived: Run =
          result.run.scene.kind === "combat"
            ? {
                ...result.run,
                scene: { ...result.run.scene, introPending: true },
              }
            : result.run;
        commit(arrived);
        setArrival({ from: before, node });
        return;
      }
    }
    commit(result.run);
    if (result.run.scene.kind === "ending" && before.scene.kind !== "ending")
      recordEnding(result.run);
    try {
      await options.present(before, action, result, settings.current);
    } finally {
      locked.current = false;
      setBusy(false);
    }
    options.onActionComplete(action);
    if (shouldAutoEndTurn(result.run)) await dispatch({ type: "end" });
  };
  const enterEncounter = () => {
    const active = current.current;
    if (locked.current || active?.scene.kind !== "combat" || !active.scene.introPending) return;
    const scene = { ...active.scene };
    delete scene.introPending;
    commit({ ...active, scene });
  };
  const beginRun = () => {
    const next = newRun(`ember-${Date.now().toString(36)}`, "recurring", {
      kind: "escape",
      target: 4,
      ember: true,
      branchUpgrades: true,
      blockConversion: true,
      concealment: true,
      escapeAct: 1,
    });
    setError("");
    commit(next);
  };
  return {
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
  };
}
