import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "../platform/browser/settings";
import type { Settings } from "../platform/browser/settings";
import { configureAudio } from "../ui/audio/audio";

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);
  useEffect(() => {
    configureAudio(settings);
    document.documentElement.dataset.reduced = String(settings.reduced);
    document.documentElement.dataset.shake = String(settings.shake);
  }, [settings]);
  const updateSettings = (next: Settings) => {
    setSettings(next);
    return saveSettings(next);
  };
  return { settings, updateSettings };
}
