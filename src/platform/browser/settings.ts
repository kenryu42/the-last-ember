import { z } from "zod";
const SETTINGS_KEY = "last-ember.settings.v1";
export const settingsSchema = z.strictObject({
  music: z.number().min(0).max(1),
  effects: z.number().min(0).max(1),
  muted: z.boolean(),
  reduced: z.boolean(),
  shake: z.boolean(),
  gameplaySpeed: z.number().min(0.5).max(2),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  music: 0.25,
  effects: 0.55,
  muted: false,
  reduced: false,
  shake: true,
  gameplaySpeed: 1,
};
export function loadSettings(): Settings {
  try {
    const result = settingsSchema.safeParse(
      JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null"),
    );
    return result.success
      ? result.data
      : {
          ...defaultSettings,
          reduced:
            typeof matchMedia !== "undefined" &&
            matchMedia("(prefers-reduced-motion: reduce)").matches,
        };
  } catch {
    return defaultSettings;
  }
}
export function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
