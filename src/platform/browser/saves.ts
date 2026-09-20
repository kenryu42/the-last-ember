import type { Run } from "../../game/model";
import type { Loaded } from "../../game/validation/save";
import { parseSave } from "../../game/validation/save";
export const SAVE_KEY = "last-ember.run.v1";
export function loadRun(): Loaded {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return {
      kind: "error",
      message:
        "Browser storage is unavailable. You can play, but progress cannot be saved here.",
    };
  }
}
export function saveRun(run: Run): string | null {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(run));
    return null;
  } catch {
    return "Saving failed. Keep this tab open and export your journey from Settings.";
  }
}
