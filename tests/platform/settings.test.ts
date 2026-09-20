import { expect, test } from "bun:test";
import {
  defaultSettings,
  settingsSchema,
} from "../../src/platform/browser/settings";

test("settings accept only the current format", () => {
  const preferences = {
    ...defaultSettings,
    music: 0.1,
    muted: true,
    reduced: true,
  };
  expect(
    settingsSchema.safeParse({ ...preferences, tutorial: false }).success,
  ).toBe(false);
  expect(settingsSchema.parse(preferences)).toEqual(preferences);
});

test("gameplay speed defaults to 1 and accepts only the supported range", () => {
  expect(defaultSettings.gameplaySpeed).toBe(1);
  for (const gameplaySpeed of [0.5, 1, 1.25, 2]) {
    const preferences = { ...defaultSettings, gameplaySpeed };
    expect(
      settingsSchema.parse(JSON.parse(JSON.stringify(preferences))),
    ).toEqual(preferences);
  }
  for (const gameplaySpeed of [0, 0.49, 2.01, Infinity, NaN, "1", null]) {
    expect(
      settingsSchema.safeParse({ ...defaultSettings, gameplaySpeed }).success,
    ).toBe(false);
  }
  const { gameplaySpeed, ...missingSpeed } = defaultSettings;
  expect(settingsSchema.safeParse(missingSpeed).success).toBe(false);
});
