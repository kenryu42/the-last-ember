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
