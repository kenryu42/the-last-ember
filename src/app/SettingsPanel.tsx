import { SAVE_KEY } from "../platform/browser/saves";
import { parseSave } from "../game/validation/save";
import type { Settings } from "../platform/browser/settings";
import { sound } from "../ui/audio/audio";
import { Modal } from "../ui/shared/Modal";
import type { Run } from "../game/model";

export function SettingsPanel({
  settings,
  updateSettings,
  run,
  busy,
  error,
  setError,
  close,
  showTitle,
  showTutorial,
  restore,
}: {
  settings: Settings;
  updateSettings: (settings: Settings) => void;
  run: Run | null;
  busy: boolean;
  error: string;
  setError: (error: string) => void;
  close: () => void;
  showTitle: () => void;
  showTutorial: () => void;
  restore: (run: Run) => void;
}) {
  const hasRun = run !== null;
  const exportSave = () => {
    try {
      const content = run ? JSON.stringify(run, null, 2) : localStorage.getItem(SAVE_KEY);
      if (!content) {
        setError("There is no journey to export.");
        return;
      }
      const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "the-last-ember-save.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export is unavailable in this browser.");
    }
  };
  return (
    <Modal title="By your own light" close={close}>
      <div className="settings-fields">
        <label>
          Gameplay speed <span>{settings.gameplaySpeed}×</span>
          <input
            aria-label="Gameplay speed"
            aria-describedby="gameplay-speed-help"
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={settings.gameplaySpeed}
            onChange={(e) =>
              updateSettings({
                ...settings,
                gameplaySpeed: Number(e.target.value),
              })
            }
          />
        </label>
        <small id="gameplay-speed-help">
          0.5× slower · 1× default · 2× faster. Applies to the next action. Reduced motion skips
          animations at any speed.
        </small>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.muted}
            onChange={(e) => updateSettings({ ...settings, muted: e.target.checked })}
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
            onChange={(e) => updateSettings({ ...settings, music: Number(e.target.value) })}
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
            onChange={(e) => updateSettings({ ...settings, reduced: e.target.checked })}
          />
          Reduced motion, immediate results
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.shake}
            onChange={(e) => updateSettings({ ...settings, shake: e.target.checked })}
          />
          Gentle impact shake
        </label>
      </div>
      <div className="dialog-actions">
        <button onClick={exportSave}>Export journey</button>
        <button
          onClick={() => {
            showTitle();
          }}
          disabled={busy}
        >
          Save & title
        </button>
        <button
          onClick={() => {
            showTutorial();
          }}
          disabled={!hasRun || busy}
        >
          Revisit introduction
        </button>
      </div>
      <p className="muted">
        Audio begins after a click or keypress. Changes save automatically. Export keeps a JSON copy
        for recovery and development.
      </p>
      <details>
        <summary>Restore an exported journey</summary>
        <label className="field-label">
          Save file
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 1_000_000) {
                setError("Save files must be smaller than 1 MB.");
                return;
              }
              void (async () => {
                try {
                  const parsed = parseSave(await file.text());
                  if (parsed.kind === "valid") {
                    setError("");
                    restore(parsed.run);
                  } else setError(parsed.kind === "error" ? parsed.message : "This file is empty.");
                } catch {
                  setError("The selected file could not be read.");
                }
              })();
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
  );
}
