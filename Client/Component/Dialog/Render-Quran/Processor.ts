// Client/Component/Dialog/Render-Processor.ts
import { type Config } from "./Types";
import { type AssembledVerse, getPageForVerse, getSurahTimestamps, getSurahAudioUrl } from "Server/API/Quran";
import { buildTimeline, type RenderVerse, type RenderScene } from "Client/Render/Engine/Index"; // client-safe barrel only
import { pageFontFamily } from "./Types";

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

const RENDER_SERVICE_URL = (import.meta.env.VITE_RENDER_SERVICE_URL as string | undefined)?.replace(/\/+$/, "");

const DEBUG = true;
function dlog(...args: any[]) {
  if (DEBUG) console.log("[render-processor]", ...args);
}

function parseRange(r: string): { start: number; end: number } {
  const [a, b] = r.split("-").map(Number);
  return { start: a, end: b };
}

export async function processVideoRender({
  cfg, ecfg, verses, extraTranslations, extraTransliterations, previewSize, colors, setProgress, shouldCancel
}: RenderArgs): Promise<{ url: string; ext: string; size: number }> {

  dlog("cfg.surahId:", cfg.surahId, "cfg.ayahStart:", cfg.ayahStart, "cfg.ayahEnd:", cfg.ayahEnd);
  dlog("cfg.reciter (raw):", JSON.stringify(cfg.reciter));
  dlog("verses received:", verses.length, "first verse#:", verses[0]?.verseNumber, "last verse#:", verses[verses.length - 1]?.verseNumber);
  dlog("window.location.origin:", window.location.origin);

  if (!RENDER_SERVICE_URL) {
    throw new Error("VITE_RENDER_SERVICE_URL is not set — check your .env and restart the dev server.");
  }

  // Dynamic data index mappings
  const primaryTr = ecfg.translations.find((t: string) => t !== "None");
  const primaryTl = ecfg.transliterations.find((t: string) => t !== "None");
  const trArr = primaryTr ? (extraTranslations[primaryTr] ?? []) : [];
  const tlArr = primaryTl ? (extraTransliterations[primaryTl] ?? []) : [];

  dlog("primaryTr:", primaryTr, "trArr length:", trArr.length);
  dlog("primaryTl:", primaryTl, "tlArr length:", tlArr.length);

  const renderVerses: RenderVerse[] = verses.map((v, i) => {
    const page = getPageForVerse(cfg.surahId, v.verseNumber);
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
  });

  dlog("renderVerses built:", renderVerses.length, "sample[0]:", renderVerses[0]);

  // ---- Real timestamps + audio for the selected ayah range ----
  const reciterKey = cfg.reciter.replace(/\s+/g, "_").replace(/'/g, "");
  dlog("reciterKey (transformed):", JSON.stringify(reciterKey), "differs from raw?", reciterKey !== cfg.reciter);

  const fullSurahTimestamps = await getSurahTimestamps(cfg.surahId, reciterKey); // string[][] | null, indexed by verseNumber-1, absolute ms in the full-surah audio file

  dlog(
    "getSurahTimestamps result:",
    fullSurahTimestamps ? `array of ${fullSurahTimestamps.length} verses` : "NULL"
  );
  if (fullSurahTimestamps) {
    dlog("fullSurahTimestamps[0] (verse 1):", fullSurahTimestamps[0]);
    dlog("fullSurahTimestamps at ayahStart-1:", fullSurahTimestamps[cfg.ayahStart - 1]);
    dlog("fullSurahTimestamps at ayahEnd-1:", fullSurahTimestamps[cfg.ayahEnd - 1]);
  }

  // Slice out exactly the verses in [cfg.ayahStart, cfg.ayahEnd] — same range
  // `verses` (and therefore renderVerses) was already filtered to upstream.
  const rangeTimestamps: string[][] | null =
    fullSurahTimestamps?.slice(cfg.ayahStart - 1, cfg.ayahEnd) ?? null;

  dlog(
    "rangeTimestamps:",
    rangeTimestamps ? `${rangeTimestamps.length} verses sliced (expected ${renderVerses.length})` : "NULL"
  );
  dlog("rangeTimestamps === renderVerses.length match?", rangeTimestamps?.length === renderVerses.length);

  let audioUrl: string | undefined;
  let audioStartMs: number | undefined;
  let audioEndMs: number | undefined;
  let perVerseTimestamps: (string[] | null)[];

  if (rangeTimestamps && rangeTimestamps.length === renderVerses.length) {
    dlog("taking REAL timestamp path");

    // Absolute ms bounds within the full-surah audio file, for the server
    // to cut with ffmpeg.
    const firstRange = parseRange(rangeTimestamps[0][0]);
    const lastVerseRanges = rangeTimestamps[rangeTimestamps.length - 1];
    const lastRange = parseRange(lastVerseRanges[lastVerseRanges.length - 1]);
    audioStartMs = firstRange.start;
    audioEndMs = lastRange.end;

    dlog("firstRange:", firstRange, "lastRange:", lastRange);
    dlog("audioStartMs:", audioStartMs, "audioEndMs:", audioEndMs, "duration:", audioEndMs - audioStartMs);
    if (audioEndMs <= audioStartMs) {
      console.warn("[render-processor] WARNING: audioEndMs <= audioStartMs — invalid/empty range");
    }

    // Rebase every range to 0ms at audioStartMs — buildTimeline (and the
    // renderer downstream) expects timings relative to the clip that's
    // actually being rendered, not the full surah.
    perVerseTimestamps = rangeTimestamps.map((verseRanges) =>
      verseRanges.map((r) => {
        const { start, end } = parseRange(r);
        return `${start - (audioStartMs as number)}-${end - (audioStartMs as number)}`;
      }),
    );

    dlog("perVerseTimestamps (rebased) sample[0]:", perVerseTimestamps[0]);

    const rawUrl = await getSurahAudioUrl(cfg.surahId, reciterKey);
    dlog("getSurahAudioUrl raw result:", rawUrl ?? "NULL");

    // getSurahAudioUrl returns a root-relative path (from Vite's ?url glob
    // import), resolved against the CLIENT dev server's own origin
    // (window.location.origin — e.g. port 8080). It is NOT the render
    // service's origin (VITE_RENDER_SERVICE_URL, e.g. port 8081) — the audio
    // file is served by this app, not the render server. The render server
    // fetches this URL itself (Node has no browser origin to resolve a
    // relative path against), so it must be made absolute here before
    // being sent over.
    audioUrl = rawUrl ? new URL(rawUrl, window.location.origin).toString() : undefined;
    dlog("audioUrl resolved to absolute:", audioUrl ?? "undefined");
  } else {
    dlog("taking FALLBACK path — no real timestamps/audio, using linear per-word timing");
    // No real timestamp data for this surah/reciter — fall back to linear
    // per-word timing (buildTimeline's existing fallback path) and skip
    // audio entirely, since we have no reliable ms boundaries to cut on.
    perVerseTimestamps = renderVerses.map(() => null);
  }

  dlog("final audioUrl:", audioUrl ?? "undefined", "audioStartMs:", audioStartMs, "audioEndMs:", audioEndMs);

  const timeline = await buildTimeline({
    verses: renderVerses,
    timestamps: perVerseTimestamps,
    fallbackPerWordMs: 450,
  });

  dlog("timeline built, keys:", Object.keys(timeline as any));

  const scene: RenderScene = {
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

  dlog("background mode:", hasLocalBgFile ? "local file" : bgIsRemoteUrl ? "remote url" : "NONE");

  if (shouldCancel()) throw new Error("Render cancelled");

  const form = new FormData();
  form.append("scene", JSON.stringify(scene));
  form.append("timeline", JSON.stringify(timeline));
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
    dlog("FormData: audio fields appended");
  } else {
    dlog("FormData: NO audio fields appended (audioUrl/audioStartMs/audioEndMs missing)");
  }

  dlog("POSTing to:", `${RENDER_SERVICE_URL}/api/render-surah`);

  const res = await fetch(`${RENDER_SERVICE_URL}/api/render-surah`, {
    method: "POST",
    body: form,
  });

  dlog("response status:", res.status, res.ok);

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? "";
      dlog("error response body:", body);
    } catch {
      // response wasn't JSON — ignore
    }
    throw new Error(`Render failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  const blob = await res.blob();
  dlog("response blob size:", blob.size, "type:", blob.type);
  const url = URL.createObjectURL(blob);
  setProgress(1);

  return { url, ext: "mp4", size: blob.size };
}