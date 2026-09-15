import type { Run } from "../game/model";

export type Region = "forest" | "ruins" | "mountain";
export type MusicMode =
  "title" | "explore" | "camp" | "combat" | "boss" | "ending";
export type Instrument =
  "pluck" | "flute" | "strings" | "bell" | "wind" | "bass" | "drum";

export interface Note {
  readonly beat: number;
  readonly note: number;
  readonly beats: number;
  readonly instrument: Instrument;
  readonly level: number;
}

export interface Soundscape {
  readonly region: Region;
  readonly mode: MusicMode;
  readonly dread: 0 | 1 | 2;
  readonly ending?: "victory" | "defeat";
  readonly key: string;
}

const FOREST = [
  [0, 57, 0.45, "pluck", 0.7],
  [0.75, 64, 0.35, "pluck", 0.55],
  [1.5, 60, 0.5, "pluck", 0.6],
  [2.5, 67, 0.9, "flute", 0.4],
  [4, 57, 0.45, "pluck", 0.65],
  [5, 65, 0.35, "pluck", 0.5],
  [6, 64, 1.4, "flute", 0.42],
] as const;
const RUINS = [
  [0, 45, 3.5, "strings", 0.42],
  [0.5, 69, 1.4, "bell", 0.32],
  [2.75, 65, 0.8, "bell", 0.25],
  [4, 43, 3.5, "strings", 0.42],
  [5.25, 69, 0.6, "bell", 0.25],
  [6.5, 62, 0.7, "bell", 0.3],
] as const;
const MOUNTAIN = [
  [0, 50, 2.8, "wind", 0.3],
  [0, 38, 0.18, "drum", 0.38],
  [2, 41, 0.18, "drum", 0.28],
  [2.5, 57, 0.8, "strings", 0.36],
  [4, 38, 0.18, "drum", 0.4],
  [4.5, 60, 0.8, "strings", 0.38],
  [6, 41, 0.18, "drum", 0.32],
  [6.25, 64, 1.5, "strings", 0.44],
] as const;

function notes(
  rows: readonly (readonly [number, number, number, Instrument, number])[],
): readonly Note[] {
  return rows.map(([beat, note, beats, instrument, level]) => ({
    beat,
    note,
    beats,
    instrument,
    level,
  }));
}

export const REGION_SCORES: Readonly<Record<Region, readonly Note[]>> = {
  forest: notes(FOREST),
  ruins: notes(RUINS),
  mountain: notes(MOUNTAIN),
};

export function deriveSoundscape(run: Run | null, title: boolean): Soundscape {
  const region: Region =
    run?.act === 1 ? "ruins" : run?.act === 2 ? "mountain" : "forest";
  let mode: MusicMode = "explore";
  if (title || !run) mode = "title";
  else if (run.scene.kind === "combat")
    mode = run.scene.type === "boss" ? "boss" : "combat";
  else if (run.scene.kind === "camp") mode = "camp";
  else if (run.scene.kind === "ending") mode = "ending";
  const value = run?.scene.kind === "combat" ? run.scene.dread : 0;
  const dread: 0 | 1 | 2 = value >= 8 ? 2 : value >= 4 ? 1 : 0;
  const ending =
    run?.scene.kind === "ending"
      ? run.scene.won
        ? "victory"
        : "defeat"
      : undefined;
  const key = `${region}:${mode}:${dread}:${ending ?? ""}`;
  return ending
    ? { region, mode, dread, ending, key }
    : { region, mode, dread, key };
}

const PROGRESSIONS: Readonly<Record<Region, readonly number[]>> = {
  forest: [0, 5, 3, 7],
  ruins: [0, -2, 3, -4],
  mountain: [0, 3, -2, 5],
};

export function composeBar(
  soundscape: Soundscape,
  measure = 0,
): readonly Note[] {
  const base = REGION_SCORES[soundscape.region];
  const variation = ((measure % 4) + 4) % 4;
  const shift = PROGRESSIONS[soundscape.region][variation] ?? 0;
  const modeLevel =
    soundscape.mode === "camp"
      ? 0.48
      : soundscape.mode === "combat"
        ? 0.86
        : soundscape.mode === "boss"
          ? 1
          : 0.68;
  const result: Note[] = base
    .filter((note) => soundscape.mode !== "camp" || note.instrument !== "drum")
    .map((note) => ({
      ...note,
      note:
        note.instrument === "drum"
          ? note.note
          : note.note + shift + (variation === 3 && note.beat >= 6 ? 2 : 0),
      level: note.level * modeLevel,
    }));
  const root =
    (soundscape.region === "forest"
      ? 45
      : soundscape.region === "ruins"
        ? 41
        : 38) + shift;
  result.push(
    {
      beat: 0,
      note: root,
      beats: 3.8,
      instrument: "bass",
      level: 0.28 * modeLevel,
    },
    {
      beat: 4,
      note: root + (variation === 2 ? 7 : 5),
      beats: 3.8,
      instrument: "bass",
      level: 0.25 * modeLevel,
    },
    {
      beat: 0,
      note: root + 12,
      beats: 7.7,
      instrument: "strings",
      level: 0.16 * modeLevel,
    },
  );
  if (soundscape.ending) {
    const intervals =
      soundscape.ending === "victory" ? [12, 16, 19, 24] : [12, 10, 7, 3];
    intervals.forEach((interval, index) =>
      result.push({
        beat: index * 2,
        note: root + interval,
        beats: 1.6,
        instrument: soundscape.ending === "victory" ? "bell" : "wind",
        level: soundscape.ending === "victory" ? 0.3 : 0.2,
      }),
    );
  }
  if (soundscape.mode === "combat" || soundscape.mode === "boss") {
    for (let beat = 0; beat < 8; beat += soundscape.mode === "boss" ? 1 : 2)
      result.push({
        beat,
        note: soundscape.region === "mountain" ? 38 : 43,
        beats: 0.14,
        instrument: "drum",
        level: soundscape.mode === "boss" ? 0.5 : 0.3,
      });
  }
  if (soundscape.dread > 0) {
    result.push({
      beat: 0,
      note: 34,
      beats: 7.5,
      instrument: "strings",
      level: 0.2 + soundscape.dread * 0.1,
    });
    if (soundscape.dread === 2)
      result.push({
        beat: 7.25,
        note: 70,
        beats: 0.5,
        instrument: "bell",
        level: 0.34,
      });
  }
  return result.sort((a, b) => a.beat - b.beat);
}
