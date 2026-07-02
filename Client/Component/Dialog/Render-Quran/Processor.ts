// Client/Component/Dialog/Render-Processor.ts
import { type Config } from "./Types";
import { type AssembledVerse, getPageForVerse } from "Server/API/Quran";
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

export async function processVideoRender({
  cfg, ecfg, verses, extraTranslations, extraTransliterations, previewSize, colors, setProgress, shouldCancel
}: RenderArgs): Promise<{ url: string; ext: string; size: number }> {

  if (!RENDER_SERVICE_URL) {
    throw new Error("VITE_RENDER_SERVICE_URL is not set — check your .env and restart the dev server.");
  }

  // Dynamic data index mappings
  const primaryTr = ecfg.translations.find((t: string) => t !== "None");
  const primaryTl = ecfg.transliterations.find((t: string) => t !== "None");
  const trArr = primaryTr ? (extraTranslations[primaryTr] ?? []) : [];
  const tlArr = primaryTl ? (extraTransliterations[primaryTl] ?? []) : [];

  const renderVerses: RenderVerse[] = verses.map((v, i) => {
    // For per-page KFGQPC variants, resolve which mushaf page this verse
    // falls on and use the page-specific font family. For plain
    // uthmani/indopak there's no per-page variant, so this is a no-op.
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

  const timeline = await buildTimeline({
    surahId: cfg.surahId,
    verses: renderVerses,
    reciter: cfg.reciter.replace(/\s+/g, "_").replace(/'/g, ""),
    fallbackPerWordMs: 450,
  });

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

  const res = await fetch(`${RENDER_SERVICE_URL}/api/render-surah`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? "";
    } catch {
      // response wasn't JSON — ignore
    }
    throw new Error(`Render failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  setProgress(1);

  return { url, ext: "mp4", size: blob.size };
}