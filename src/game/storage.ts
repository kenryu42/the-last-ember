import { z } from "zod";
import {
  BREAK_FORMATION,
  CARDS,
  FADING_STRIKE,
  FLAME_UPGRADES,
  RELICS,
} from "./content";
import { reachable } from "./engine";
import { runSchema } from "./model";
import type { Run } from "./model";

export const SAVE_KEY = "last-ember.run.v1";
export const SETTINGS_KEY = "last-ember.settings.v1";
const VIDEO_SOUND_KEY = "last-ember.video-sound.v1";
let videoSoundEnabled = false;

export function loadVideoSound(): boolean {
  try {
    videoSoundEnabled = localStorage.getItem(VIDEO_SOUND_KEY) === "true";
  } catch {
    // Keep the session preference when browser storage is unavailable.
  }
  return videoSoundEnabled;
}

export function saveVideoSound(enabled: boolean): void {
  videoSoundEnabled = enabled;
  try {
    localStorage.setItem(VIDEO_SOUND_KEY, String(enabled));
  } catch {
    // The preference still applies for this session.
  }
}

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
export type Loaded =
  | { kind: "empty" }
  | { kind: "valid"; run: Run }
  | { kind: "error"; message: string };

function validProgression(run: Run): boolean {
  const scene = run.scene;
  const node = run.route.find((node) => node.id === run.location);
  if (scene.kind !== "ending" && run.hp === 0) return false;
  if (run.location === null)
    return (
      run.row === -1 &&
      scene.kind === "map" &&
      run.route.some((node) => reachable(run, node))
    );
  if (!node || node.row !== run.row) return false;
  switch (scene.kind) {
    case "map":
      return run.route.some((next) => reachable(run, next));
    case "combat":
      return node.kind === scene.type;
    case "camp":
    case "event":
    case "shop":
      return node.kind === scene.kind;
    case "reward":
      return scene.boss
        ? node.kind === "boss" && run.act < 2
        : node.kind === "battle" || node.kind === "elite";
    case "ending":
      return scene.won
        ? run.hp > 0 && run.act === 2 && node.kind === "boss"
        : run.hp === 0 &&
            ["battle", "elite", "boss", "event"].includes(node.kind);
  }
}
export function parseSave(text: string | null): Loaded {
  if (!text) return { kind: "empty" };
  try {
    const result = runSchema.safeParse(JSON.parse(text));
    if (!result.success)
      return {
        kind: "error",
        message: "This save does not match the current game format.",
      };
    const run = result.data,
      s = run.scene;
    const cardIds = new Set(
        [...CARDS, ...FLAME_UPGRADES, BREAK_FORMATION, FADING_STRIKE].map(
          (c) => c.id,
        ),
      ),
      relicIds = new Set(RELICS.map((r) => r.id));
    const zones =
      s.kind === "combat"
        ? [...s.draw, ...s.hand, ...s.discard, ...s.exhaust]
        : [];
    const offers =
      s.kind === "reward" || s.kind === "shop"
        ? s.cards.filter((x) => x !== null)
        : [];
    const bad =
      !validProgression(run) ||
      (run.prototype?.ember === true &&
        run.row >= 0 &&
        run.actBearer === null) ||
      run.hp > run.maxHp ||
      run.deck.some((c) => !cardIds.has(c.def)) ||
      run.deck.some(
        (c) =>
          FLAME_UPGRADES.some((branch) => branch.id === c.def) && !c.upgraded,
      ) ||
      new Set(run.deck.map((c) => c.uid)).size !== run.deck.length ||
      run.relics.some((id) => !relicIds.has(id)) ||
      (s.kind === "event" &&
        s.pendingUpgrade !== undefined &&
        (!run.prototype?.branchUpgrades ||
          s.resolved === null ||
          !run.deck.some(
            (c) =>
              c.uid === s.pendingUpgrade && c.def === "flame" && !c.upgraded,
          ))) ||
      offers.some((id) => id !== null && !cardIds.has(id)) ||
      ((s.kind === "reward" || s.kind === "shop") &&
        s.relic !== null &&
        !relicIds.has(s.relic)) ||
      (s.kind === "combat" &&
        (run.hp === 0 ||
          !s.enemies.some((e) => e.hp > 0) ||
          (s.introPending && s.turn !== 1) ||
          (run.dreadRules === "recurring"
            ? s.dreadResponse !== "fury" || s.fired !== undefined
            : s.dreadResponse !== undefined || s.fired === undefined) ||
          (s.objective !== undefined &&
            s.objective.progress >= s.objective.target) ||
          (s.ember?.window === "choose" && s.turn !== 1) ||
          (s.ember !== undefined && s.ember.bearer !== run.actBearer) ||
          (run.prototype?.ember === true && s.ember === undefined) ||
          (run.relics.some(
            (id) => id === "hushed-coal" || id === "black-lantern",
          ) &&
            !s.relicTurn) ||
          new Set(s.enemies.map((e) => e.uid)).size !== s.enemies.length ||
          s.enemies.some(
            (e) =>
              e.uid < 0 ||
              e.uid >= run.nextId ||
              run.deck.some((c) => c.uid === e.uid),
          ) ||
          zones.length !== run.deck.length ||
          new Set(zones.map((c) => c.uid)).size !== zones.length ||
          zones.some(
            (c) =>
              !run.deck.some(
                (d) =>
                  d.uid === c.uid &&
                  d.def === c.def &&
                  d.upgraded === c.upgraded,
              ),
          ) ||
          s.enemies.some((e) => e.hp > e.maxHp) ||
          s.hand.length > 10)) ||
      run.deck.some((c) => c.uid >= run.nextId) ||
      run.route.length !== 18 ||
      new Set(run.route.map((n) => n.id)).size !== run.route.length ||
      new Set(run.route.map((n) => `${n.row}-${n.lane}`)).size !== 18 ||
      run.route.some((n) => (n.row === 5) !== (n.kind === "boss")) ||
      run.route.some((n) =>
        n.row === 5
          ? n.links.length !== 0
          : n.links.length !== 3 || new Set(n.links).size !== 3,
      ) ||
      run.route.some((n) =>
        n.links.some(
          (link) =>
            !run.route.some(
              (other) => other.id === link && other.row === n.row + 1,
            ),
        ),
      ) ||
      (run.location !== null &&
        !run.route.some((n) => n.id === run.location && n.row === run.row));
    if (bad)
      return {
        kind: "error",
        message: "This save has inconsistent game data.",
      };
    return { kind: "valid", run };
  } catch {
    return {
      kind: "error",
      message: "This save could not be read.",
    };
  }
}
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
const historySchema = z.array(
  z.object({
    seed: z.string(),
    won: z.boolean(),
    act: z.number(),
    turns: z.number(),
    cards: z.number(),
    time: z.string(),
  }),
);
export type History = z.infer<typeof historySchema>;
export function loadHistory(): History {
  try {
    const parsed = historySchema.safeParse(
      JSON.parse(localStorage.getItem("last-ember.history") ?? "[]"),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
export function recordEnding(run: Run) {
  if (run.scene.kind !== "ending") return;
  try {
    const history = loadHistory();
    history.unshift({
      seed: run.seed,
      won: run.scene.won,
      act: run.act,
      turns: run.stats.turns,
      cards: run.stats.cards,
      time: new Date().toISOString(),
    });
    localStorage.setItem(
      "last-ember.history",
      JSON.stringify(history.slice(0, 20)),
    );
  } catch {
    /* History must not interrupt the ending. */
  }
}
