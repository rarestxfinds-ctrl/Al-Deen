// @Web/Component/Dialog/Render-Processor.ts
import { type Config } from "./Types";
import { pageFontFamily } from "./Types";

// Locally explicitly typed structural interfaces severed from obsolete server dependencies
export interface AssembledVerse {
  verseNumber: number;
  arabic: string;
  translation?: string;
  transliteration?: string;
  words: string[];
  wbwTranslation?: string[];
  wbwTranslationHover?: string[];
  wbwTranslationInline?: string[];
}

// Plain data shapes only — no engine logic lives on the client anymore.
// These mirror Server/Source/Engine/Types.ts but are NOT imported from it
// (the two repos are separate; keep these in sync manually or via a shared
// types package if you want a single source of truth later).
interface RenderVerseInput {
  verseNumber: number;
  arabic: string;
  words: string[];
  translation?: string;
  transliteration?: string;
  arabicFontFamily: string;
  mushafPage: number;
}

interface RenderSceneInput {
  width: number;
  height: number;
  arabicFontFamily: string;
  arabicSize: number;
  translationSize: number;
  transliterationSize: number;
  arabicColor: string;
  translationColor: string;
  transliterationColor: string;
  highlightColor: string;
  verses: RenderVerseInput[];
  arabicPosition: Config["arabicPosition"];
  translationPosition: Config["translationPosition"];
  transliterationPosition: Config["transliterationPosition"];
}

interface RenderArgs {
  cfg: Config;
  ecfg: Config & Record<string, any>;
  verses: AssembledVerse[];
  extraTranslations: Record<string, string[]>;
  extraTransliterations: Record<string, string[]>;
  previewSize: { w: number; h: number };
  colors: { arabicCol: string; translationCol: string; transliterationCol: string; highlightCol: string };
  setProgress: (p: number) => void;
  shouldCancel: () => boolean;
}

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";
const RENDER_SERVICE_URL = (import.meta.env.VITE_RENDER_SERVICE_URL as string | undefined)?.replace(/\/+$/, "");

const DEBUG = true;
function dlog(...args: any[]) {
  if (DEBUG) console.log("[render-processor]", ...args);
}

function parseRange(r: string): { start: number; end: number } {
  const [a, b] = r.split("-").map(Number);
  return { start: a, end: b };
}

async function fetchPageForVerse(surahId: number, verseNumber: number): Promise<number> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran/page-lookup?surah=${surahId}&verse=${verseNumber}`);
  if (!response.ok) return 1;
  const data = await response.json();
  return data.page || 1;
}

async function fetchSurahTimestamps(surahId: number, reciterKey: string): Promise<string[][] | null> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/audio/timestamps?surah=${surahId}&reciter=${encodeURIComponent(reciterKey)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchSurahAudioUrl(surahId: number, reciterKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/audio/url?surah=${surahId}&reciter=${encodeURIComponent(reciterKey)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  } catch {
    return null;
  }
}

export async function processVideoRender({
  cfg, ecfg, verses, extraTranslations, extraTransliterations, previewSize, colors, setProgress, shouldCancel
}: RenderArgs): Promise<{ url: string; ext: string; size: number }> {

  dlog("cfg.surahId:", cfg.surahId, "cfg.ayahStart:", cfg.ayahStart, "cfg.ayahEnd:", cfg.ayahEnd);
  dlog("cfg.reciter (raw):", JSON.stringify(cfg.reciter));
  dlog("verses received:", verses.length, "first verse#:", verses[0]?.verseNumber, "last verse#:", verses[verses.length - 1]?.verseNumber);

  if (!RENDER_SERVICE_URL) {
    throw new Error("VITE_RENDER_SERVICE_URL is not set — check your .env and restart the dev server.");
  }

  const primaryTr = ecfg.translations.find((t: string) => t !== "None");
  const primaryTl = ecfg.transliterations.find((t: string) => t !== "None");
  const trArr = primaryTr ? (extraTranslations[primaryTr] ?? []) : [];
  const tlArr = primaryTl ? (extraTransliterations[primaryTl] ?? []) : [];

  const renderVerses: RenderVerseInput[] = await Promise.all(
    verses.map(async (v, i) => {
      const page = await fetchPageForVerse(cfg.surahId, v.verseNumber);
      const arabicFontFamily = pageFontFamily(ecfg.font, cfg.surahId, v.verseNumber) ?? ecfg.font;

      return {
        verseNumber: v.verseNumber,
        arabic: v.arabic,
        words: v.words,
        translation: primaryTr ? (trArr[i] ?? v.translation) : v.translation,
        transliteration: primaryTl ? (tlArr[i] ?? v.transliteration) : v.transliteration,
        arabicFontFamily,
        mushafPage: page,
      };
    })
  );

  dlog("renderVerses built:", renderVerses.length, "sample[0]:", renderVerses[0]);

  const reciterKey = cfg.reciter.replace(/\s+/g, "_").replace(/'/g, "");
  const fullSurahTimestamps = await fetchSurahTimestamps(cfg.surahId, reciterKey);

  const rangeTimestamps: string[][] | null =
    fullSurahTimestamps?.slice(cfg.ayahStart - 1, cfg.ayahEnd) ?? null;

  let audioUrl: string | undefined;
  let audioStartMs: number | undefined;
  let audioEndMs: number | undefined;
  let perVerseTimestamps: (string[] | null)[];

  if (rangeTimestamps && rangeTimestamps.length === renderVerses.length) {
    dlog("taking REAL timestamp path");

    const firstRange = parseRange(rangeTimestamps[0][0]);
    const lastVerseRanges = rangeTimestamps[rangeTimestamps.length - 1];
    const lastRange = parseRange(lastVerseRanges[lastVerseRanges.length - 1]);
    audioStartMs = firstRange.start;
    audioEndMs = lastRange.end;

    perVerseTimestamps = rangeTimestamps.map((verseRanges) =>
      verseRanges.map((r) => {
        const { start, end } = parseRange(r);
        return `${start - (audioStartMs as number)}-${end - (audioStartMs as number)}`;
      }),
    );

    const rawUrl = await fetchSurahAudioUrl(cfg.surahId, reciterKey);
    audioUrl = rawUrl ? new URL(rawUrl, window.location.origin).toString() : undefined;
  } else {
    dlog("taking FALLBACK path — no real timestamps/audio, using linear per-word timing");
    perVerseTimestamps = renderVerses.map(() => null);
  }

  // NOTE: buildTimeline() no longer runs on the client — it's server-only
  // engine code. We send raw verses + rebased per-verse timestamps and let
  // the server build the timeline right before rendering.

  const scene: RenderSceneInput = {
    width: previewSize.w,
    height: previewSize.h,
    arabicFontFamily: pageFontFamily(ecfg.font, cfg.surahId, renderVerses[0]?.verseNumber ?? 1) ?? ecfg.font ?? "Uthmani",
    arabicSize: Math.round((previewSize.h / 1080) * ecfg.arabicSize * 3),
    translationSize: Math.round((previewSize.h / 1080) * ecfg.translationSize * 2),
    transliterationSize: Math.round((previewSize.h / 1080) * ecfg.transliterationSize * 2),
    arabicColor: colors.arabicCol,
    translationColor: colors.translationCol,
    transliterationColor: colors.transliterationCol,
    highlightColor: colors.highlightCol,
    verses: renderVerses,
    arabicPosition: cfg.arabicPosition,
    translationPosition: cfg.translationPosition,
    transliterationPosition: cfg.transliterationPosition,
  };

  const hasLocalBgFile = !!cfg.bgFile;
  const bgIsRemoteUrl = !hasLocalBgFile && !!cfg.bgUrl && !cfg.bgUrl.startsWith("blob:");
  if (!hasLocalBgFile && !bgIsRemoteUrl) {
    throw new Error("No background video/image set.");
  }

  if (shouldCancel()) throw new Error("Render cancelled");

  const form = new FormData();
  form.append("scene", JSON.stringify(scene));
  form.append("timestamps", JSON.stringify(perVerseTimestamps)); // 🌟 raw, not a built timeline
  form.append("fallbackPerWordMs", "450");
  form.append("fps", String(cfg.exportFormat === "mp4" ? 30 : 24));
  if (hasLocalBgFile) {
    form.append("background", cfg.bgFile as File);
  } else {
    form.append("backgroundVideoUrl", cfg.bgUrl);
  }
  if (audioUrl && audioStartMs !== undefined && audioEndMs !== undefined) {
    form.append("audioUrl", audioUrl);
    form.append("audioStartMs", String(audioStartMs));
    form.append("audioEndMs", String(audioEndMs));
  }

  dlog("POSTing to:", `${RENDER_SERVICE_URL}/api/renderSurah`);

  const res = await fetch(`${RENDER_SERVICE_URL}/api/renderSurah`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? "";
    } catch {}
    throw new Error(`Render failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  setProgress(1);

  return { url, ext: "mp4", size: blob.size };
}