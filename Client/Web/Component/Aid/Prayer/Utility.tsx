import { DEFAULT_SETTINGS, MAIN_PRAYERS } from "./Constant";
import type { PrayerTimesData, MainPrayer, PrayerSettings } from "./Types";

export function loadSettings(): PrayerSettings {
  try {
    const saved = localStorage.getItem("prayer-settings");
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s: PrayerSettings) {
  localStorage.setItem("prayer-settings", JSON.stringify(s));
}

export function getNextPrayer(timings: PrayerTimesData): MainPrayer | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const prayer of MAIN_PRAYERS) {
    const [h, m] = timings[prayer].split(":").map(Number);
    if (h * 60 + m > currentMinutes) return prayer;
  }
  return "Fajr";
}

export function getPreviousPrayer(timings: PrayerTimesData, nextPrayer: MainPrayer): MainPrayer {
  const idx = MAIN_PRAYERS.indexOf(nextPrayer);
  return idx <= 0 ? "Isha" : MAIN_PRAYERS[idx - 1];
}

export function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function formatTimeRemaining(timeStr: string): string {
  const now = new Date();
  let diff = toMinutes(timeStr) - (now.getHours() * 60 + now.getMinutes());
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatTime(time24: string, format: "12h" | "24h"): string {
  if (format === "24h") return time24;
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function getElapsedProgress(timings: PrayerTimesData, nextPrayer: MainPrayer): number {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const nextMin = toMinutes(timings[nextPrayer]);
  const prevPrayer = getPreviousPrayer(timings, nextPrayer);
  const prevMin = toMinutes(timings[prevPrayer]);

  let total = nextMin - prevMin;
  let elapsed = currentMin - prevMin;
  if (total <= 0) total += 24 * 60;
  if (elapsed < 0) elapsed += 24 * 60;

  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}