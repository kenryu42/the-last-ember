import type { Cue } from "../game/model";
import type { Run } from "../game/model";
import type { Settings } from "../game/storage";
import { composeBar, deriveSoundscape } from "./music";
import type { Instrument } from "./music";

// Original synthesized cues. Audio is presentation only and never gates a rule action.
let context: AudioContext | null = null;
let musicGain: GainNode | null = null;
let effectsGain: GainNode | null = null;
let settings: Settings | null = null;
let musicVoices = 0;
let effectVoices = 0;
let variation = 0;
let soundscape = deriveSoundscape(null, true);
let playingKey = "";
let nextBar = 0;
let measure = 0;
let barNotes: readonly ReturnType<typeof composeBar>[number][] = [];
let nextNote = 0;
let lastMusicTick = 0;
const MAX_MUSIC_VOICES = 18;
const MAX_EFFECT_VOICES = 24;
const MUSIC_LOOKAHEAD = 0.22;
interface MusicVoice {
  readonly oscillator: OscillatorNode;
  readonly gain: GainNode;
  readonly startsAt: number;
}
const scheduledMusic = new Set<MusicVoice>();
export function configureAudio(next: Settings) {
  settings = next;
  if (context && musicGain && effectsGain) {
    musicGain.gain.setTargetAtTime(
      next.muted ? 0 : next.music * 0.22,
      context.currentTime,
      0.15,
    );
    effectsGain.gain.setTargetAtTime(
      next.muted ? 0 : next.effects * 0.7,
      context.currentTime,
      0.04,
    );
  }
}

export function setSoundscape(run: Run | null, title: boolean): void {
  const next = deriveSoundscape(run, title);
  if (next.key === soundscape.key) return;
  soundscape = next;
  if (context) {
    clearMusicVoices(context);
    nextBar = context.currentTime + 0.12;
    measure = 0;
    barNotes = [];
    nextNote = 0;
    playingKey = "";
  }
}

function clearMusicVoices(ctx: AudioContext): void {
  const now = ctx.currentTime;
  for (const voice of scheduledMusic) {
    try {
      voice.gain.gain.cancelScheduledValues(now);
      if (voice.startsAt > now) {
        voice.oscillator.stop(now);
      } else {
        voice.gain.gain.setTargetAtTime(0.0001, now, 0.06);
        voice.oscillator.stop(now + 0.28);
      }
    } catch {
      /* A voice may already have ended between scheduler ticks. */
    }
  }
}

function frequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function playMusicNote(
  ctx: AudioContext,
  at: number,
  note: number,
  duration: number,
  instrument: Instrument,
  level: number,
) {
  if (!musicGain || musicVoices >= MAX_MUSIC_VOICES) return;
  const oscillator = ctx.createOscillator(),
    gain = ctx.createGain(),
    filter = ctx.createBiquadFilter();
  const end = at + duration;
  const pitch = frequency(note);
  oscillator.frequency.setValueAtTime(
    instrument === "drum" ? Math.max(90, pitch) : pitch,
    at,
  );
  if (instrument === "drum")
    oscillator.frequency.exponentialRampToValueAtTime(
      42,
      at + Math.min(0.12, duration),
    );
  oscillator.type =
    instrument === "strings" || instrument === "wind"
      ? "sawtooth"
      : instrument === "pluck"
        ? "triangle"
        : "sine";
  filter.type = "lowpass";
  filter.frequency.value =
    instrument === "pluck"
      ? 2200
      : instrument === "bell"
        ? 3600
        : instrument === "bass"
          ? 520
          : 900;
  const attack =
    instrument === "strings" || instrument === "wind"
      ? 0.18
      : instrument === "bass"
        ? 0.035
        : 0.012;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.002, level * 0.12),
    at + Math.min(attack, duration * 0.4),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  musicVoices++;
  const voice: MusicVoice = { oscillator, gain, startsAt: at };
  scheduledMusic.add(voice);
  oscillator.start(at);
  oscillator.stop(end + 0.02);
  oscillator.onended = () => {
    musicVoices--;
    scheduledMusic.delete(voice);
    oscillator.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

function scheduleMusic() {
  try {
    scheduleMusicNotes();
  } catch {
    // Browsers can invalidate queued Web Audio operations during suspension.
    barNotes = [];
    nextNote = 0;
  }
}

function scheduleMusicNotes() {
  const ctx = context;
  if (!ctx || ctx.state !== "running") return;
  const beat =
    soundscape.mode === "combat" || soundscape.mode === "boss"
      ? 0.42
      : soundscape.mode === "camp"
        ? 0.68
        : 0.56;
  const barLength = beat * 8;
  // nextBar is the START of the current phrase, not the next unscheduled note.
  // Only a missed scheduler interval should reset it, never normal bar progress.
  if (lastMusicTick > 0 && ctx.currentTime - lastMusicTick > 0.75) {
    clearMusicVoices(ctx);
    nextBar = ctx.currentTime + 0.08;
    barNotes = [];
    nextNote = 0;
  }
  lastMusicTick = ctx.currentTime;
  if (playingKey !== soundscape.key) {
    playingKey = soundscape.key;
    nextBar = Math.max(nextBar, ctx.currentTime + 0.08);
  }
  const horizon = ctx.currentTime + MUSIC_LOOKAHEAD;
  while (nextBar < horizon) {
    if (barNotes.length === 0) barNotes = composeBar(soundscape, measure);
    while (nextNote < barNotes.length) {
      const part = barNotes[nextNote];
      if (!part || nextBar + part.beat * beat > horizon) return;
      playMusicNote(
        ctx,
        nextBar + part.beat * beat,
        part.note,
        part.beats * beat,
        part.instrument,
        part.level,
      );
      nextNote++;
    }
    nextBar += barLength;
    measure++;
    barNotes = [];
    nextNote = 0;
  }
}
export function wakeAudio() {
  try {
    if (!context) {
      context = new AudioContext();
      musicGain = context.createGain();
      effectsGain = context.createGain();
      const limiter = context.createDynamicsCompressor();
      musicGain.gain.value = 0;
      effectsGain.gain.value = 0;
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 8;
      musicGain.connect(limiter);
      const echo = context.createDelay(1),
        echoGain = context.createGain();
      echo.delayTime.value = 0.24;
      echoGain.gain.value = 0.19;
      musicGain.connect(echo);
      echo.connect(echoGain);
      echoGain.connect(limiter);
      echoGain.connect(echo);
      effectsGain.connect(limiter);
      limiter.connect(context.destination);
      if (settings) configureAudio(settings);
      nextBar = context.currentTime + 0.08;
      setInterval(scheduleMusic, 100);
    }
    void context
      .resume()
      .then(scheduleMusic)
      .catch(() => {});
  } catch {
    /* Silent play remains available when Web Audio is unavailable. */
  }
}
export interface SoundDetail {
  readonly phase: "launch" | "impact";
  readonly blocked: boolean;
  readonly powerful: boolean;
}
export function sound(cue: Cue, detail?: SoundDetail) {
  if (
    !context ||
    !settings ||
    settings.muted ||
    settings.effects === 0 ||
    effectVoices >= MAX_EFFECT_VOICES
  )
    return;
  try {
    const ctx = context,
      now = ctx.currentTime;
    // A short filtered noise transient gives the blade, arrow, shield and
    // incoming hit a material texture instead of another musical notification.
    if (["blade", "arrow", "spell", "shield", "enemy", "death"].includes(cue)) {
      const duration =
        cue === "spell"
          ? detail?.powerful
            ? 0.34
            : 0.26
          : detail?.phase === "launch"
            ? 0.12
            : 0.2;
      const buffer = ctx.createBuffer(
        1,
        Math.ceil(ctx.sampleRate * duration),
        ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      // Local presentation noise; it never consumes the run's seeded RNG.
      let noise = (variation + 1) * 0x9e3779b9;
      for (let i = 0; i < data.length; i++) {
        noise ^= noise << 13;
        noise ^= noise >>> 17;
        noise ^= noise << 5;
        data[i] = noise / 2147483648;
      }
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value =
        cue === "arrow"
          ? detail?.phase === "impact"
            ? 1200
            : 2800
          : cue === "spell"
            ? detail?.phase === "impact"
              ? 850
              : 2300
            : cue === "shield"
              ? 1600
              : detail?.phase === "launch"
                ? 2100
                : 700;
      filter.Q.value = cue === "shield" ? 3 : 0.7;
      const peak = detail?.blocked ? 0.18 : detail?.powerful ? 0.32 : 0.25;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(
        peak,
        now +
          (cue === "spell" && detail?.phase === "launch"
            ? duration * 0.6
            : 0.008),
      );
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      if (!effectsGain) return;
      gain.connect(effectsGain);
      effectVoices++;
      source.start(now);
      source.onended = () => {
        effectVoices--;
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
    variation++;
    const notes: Record<Cue, number[]> = {
      blade: [180, 70],
      arrow: [900, 320],
      spell: [180, 360, 720],
      shield: [470, 690],
      heal: [330, 440, 660],
      draw: [600, 800],
      dread: [95, 89],
      enemy: [130, 55],
      death: [180, 80],
      reward: [440, 550, 660],
      victory: [262, 330, 392, 523],
      defeat: [220, 196, 147],
    };
    notes[cue].forEach((frequency, index) => {
      if (effectVoices >= MAX_EFFECT_VOICES) return;
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        start = now + index * 0.045,
        duration = ["victory", "defeat", "spell", "heal"].includes(cue)
          ? 0.5
          : 0.18;
      effectVoices++;
      oscillator.type = ["blade", "enemy", "dread"].includes(cue)
        ? "triangle"
        : "sine";
      oscillator.detune.value = ((variation % 5) - 2) * 3;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.75,
        start + duration,
      );
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        settings ? settings.effects * 0.11 : 0,
        start + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      if (!effectsGain) return;
      gain.connect(effectsGain);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
      oscillator.onended = () => {
        effectVoices--;
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* A failed cue must not break gameplay. */
  }
}
