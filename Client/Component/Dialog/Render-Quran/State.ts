// Client/Component/Dialog/Use-Render-Surah-State.ts
import { useState, useEffect, useMemo } from "react";
import { type Config, type RenderFont, fontToType } from "./Types";
import { getSurah, type AssembledSurah, type AssembledVerse } from "Server/API/Quran";

export function useRenderSurahState(surahId: number, ayahNumber: number | undefined, mode: "render" | "embed", app: any, open: boolean) {
  const [cfg, setCfg] = useState<Config>(() => ({
    resolution: "1080p",
    width: 600,
    height: 480,
    exportFormat: "webm",
    reciter: "Mishari Al-Afasy",
    surahId,
    ayahStart: ayahNumber ?? 1,
    ayahEnd: ayahNumber ?? 1,
    bgKind: "color",
    bgColor: "#0b1f17",
    bgUrl: "",
    containerBgKind: "color",
    containerBg: "transparent",
    containerBgUrl: "",
    borderColor: "#ffffff",
    borderWidth: 0,
    borderRadius: 24,
    arabicColor: "#111827",
    translationColor: "#374151",
    transliterationColor: "#6b7280",
    highlightColor: "#16a34a",
    autoContrast: true,
    logoUrl: "",
    logoCorner: "tr",
    addIntro: false,
    introUrl: "",
    addOutro: false,
    outroUrl: "",
    audioPlayback: true,
    showTafsir: true,
    showCopy: true,
    showShare: false,
    hoverTooltip: true,
    arabicPosition: "center",
    translationPosition: "bottom-center",
    transliterationPosition: "bottom-center",
    showLines: false,
    linesCount: 8,
    showWatermark: true,
    watermarkText: "Al-Deen.org",
  }));

  // App-level derived configurations
  const ecfg = useMemo(() => {
    const trs = app.selectedTranslations?.length ? app.selectedTranslations.map((t: string) => t === "translation" ? "Direct" : t) : ["None"];
    const tls = app.selectedAyahTransliterator && app.selectedAyahTransliterator !== "None" ? [app.selectedAyahTransliterator] : ["None"];
    return {
      ...cfg,
      font: app.quranFont as RenderFont,
      translations: trs,
      transliterations: tls,
      showWBW: true,
      arabicSize: 16 + (app.fontSize ?? 3) * 6,
      translationSize: 12 + (app.translationFontSize ?? 3) * 3,
      transliterationSize: 12 + (app.transliterationSize ?? 3) * 3,
    };
  }, [cfg, app.quranFont, app.selectedTranslations, app.selectedAyahTransliterator, app.fontSize, app.translationFontSize, app.transliterationSize]);

  const inlineWbwTr = app.inlineTranslation !== "None" ? app.inlineTranslation : undefined;
  const inlineWbwTl = app.inlineTransliteration !== "None" ? app.inlineTransliteration : undefined;

  const [surahData, setSurahData] = useState<AssembledSurah | null>(null);
  const [extraTranslations, setExtraTranslations] = useState<Record<string, string[]>>({});
  const [extraTransliterations, setExtraTransliterations] = useState<Record<string, string[]>>({});

  // Sync when dialog visibility props refresh
  useEffect(() => {
    if (!open) return;
    setCfg((c) => ({ ...c, surahId, ayahStart: ayahNumber ?? 1, ayahEnd: ayahNumber ?? c.ayahEnd }));
  }, [open, surahId, ayahNumber]);

  // Primary Quran text fetching
  useEffect(() => {
    let cancelled = false;
    setSurahData(null);
    getSurah(cfg.surahId, {
      fontType: fontToType(ecfg.font),
      translation: ecfg.translations.find((t) => t !== "None"),
      transliteration: ecfg.transliterations.find((t) => t !== "None"),
      wbwTranslationInline: inlineWbwTr,
      wbwTransliterationInline: inlineWbwTl,
    }).then((d) => { if (!cancelled) setSurahData(d); });
    return () => { cancelled = true; };
  }, [cfg.surahId, ecfg.font, ecfg.translations, ecfg.transliterations, inlineWbwTr, inlineWbwTl]);

  // Handle out of bound verse ranges gracefully
  const totalAyahs = surahData?.verses.length ?? 0;
  useEffect(() => {
    if (!totalAyahs) return;
    setCfg((c) => {
      const start = Math.max(1, Math.min(c.ayahStart, totalAyahs));
      const end = Math.max(start, Math.min(c.ayahEnd || totalAyahs, totalAyahs));
      if (start === c.ayahStart && end === c.ayahEnd) return c;
      return { ...c, ayahStart: start, ayahEnd: end };
    });
  }, [totalAyahs]);

  // Sub-resource translation array loaders
  useEffect(() => {
    let cancelled = false;
    const sources = ecfg.translations.filter((t) => t !== "None");
    Promise.all(sources.map((src) =>
      getSurah(cfg.surahId, { fontType: fontToType(ecfg.font), translation: src })
        .then((d) => [src, d.verses.map((v) => v.translation ?? "")] as const)
        .catch(() => [src, [] as string[]] as const)
    )).then((entries) => {
      if (cancelled) return;
      const m: Record<string, string[]> = {};
      entries.forEach(([k, v]) => (m[k] = v));
      setExtraTranslations(m);
    });
    return () => { cancelled = true; };
  }, [ecfg.translations, cfg.surahId, ecfg.font]);

  useEffect(() => {
    let cancelled = false;
    const sources = ecfg.transliterations.filter((t) => t !== "None");
    Promise.all(sources.map((src) =>
      getSurah(cfg.surahId, { fontType: fontToType(ecfg.font), transliteration: src })
        .then((d) => [src, d.verses.map((v) => v.transliteration ?? "")] as const)
        .catch(() => [src, [] as string[]] as const)
    )).then((entries) => {
      if (cancelled) return;
      const m: Record<string, string[]> = {};
      entries.forEach(([k, v]) => (m[k] = v));
      setExtraTransliterations(m);
    });
    return () => { cancelled = true; };
  }, [ecfg.transliterations, cfg.surahId, ecfg.font]);

  return { cfg, setCfg, ecfg, surahData, extraTranslations, extraTransliterations };
}