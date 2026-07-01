// Client/Component/Dialog/Render-Processor.ts
import { type Config } from "./Types";
import { type AssembledVerse } from "Server/API/Quran";
import { buildTimeline, renderToVideo, type RenderVerse, type RenderScene } from "Client/Render/Engine/Index";
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

export async function processVideoRender({
  cfg, ecfg, verses, extraTranslations, extraTransliterations, previewSize, colors, setProgress, shouldCancel
}: RenderArgs) {
  
  // Asynchronous asset loader with robust tracking states
  const loadVideo = (url: string): Promise<HTMLVideoElement | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.crossOrigin = "anonymous";
      
      let resolved = false;
      const handleSuccess = () => {
        if (resolved) return;
        resolved = true;
        resolve(v);
      };
      const handleFail = () => {
        if (resolved) return;
        resolved = true;
        resolve(null);
      };

      v.addEventListener("loadedmetadata", handleSuccess, { once: true });
      v.addEventListener("loadeddata", handleSuccess, { once: true });
      v.addEventListener("error", handleFail, { once: true });
      
      v.src = url;
      v.load(); 

      setTimeout(() => {
        if (!resolved) {
          if (v.readyState >= 1 && v.duration) {
            handleSuccess();
          } else {
            handleFail();
          }
        }
      }, 6000); // 6-second safety buffer ceiling for heavy video backgrounds
    });
  };

  const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // FETCH CONCURRENTLY: Now loading the continuous loop background video asset alongside the others!
  const [introVideo, outroVideo, bgVideo, bgImg, containerImg, logoImg] = await Promise.all([
    cfg.addIntro && cfg.introUrl ? loadVideo(cfg.introUrl) : Promise.resolve(null),
    cfg.addOutro && cfg.outroUrl ? loadVideo(cfg.outroUrl) : Promise.resolve(null),
    cfg.bgKind === "video" && cfg.bgUrl ? loadVideo(cfg.bgUrl) : Promise.resolve(null), // <-- ADDED
    cfg.bgKind === "image" && cfg.bgUrl ? loadImage(cfg.bgUrl) : Promise.resolve(null),
    cfg.containerBgKind === "image" && cfg.containerBgUrl ? loadImage(cfg.containerBgUrl) : Promise.resolve(null),
    cfg.logoUrl ? loadImage(cfg.logoUrl) : Promise.resolve(null),
  ]);

  // Dynamic data index mappings
  const primaryTr = ecfg.translations.find((t) => t !== "None");
  const primaryTl = ecfg.transliterations.find((t) => t !== "None");
  const trArr = primaryTr ? (extraTranslations[primaryTr] ?? []) : [];
  const tlArr = primaryTl ? (extraTransliterations[primaryTl] ?? []) : [];

  const renderVerses: RenderVerse[] = verses.map((v) => {
    const index = v.verseNumber - 1;
    return {
      verseNumber: v.verseNumber,
      arabic: v.arabic,
      words: v.words,
      translation: primaryTr ? (trArr[index] ?? v.translation) : v.translation,
      transliteration: primaryTl ? (tlArr[index] ?? v.transliteration) : v.transliteration,
    };
  });

  const arabicFontFamily = pageFontFamily(ecfg.font, cfg.surahId, verses[0]?.verseNumber) ?? "Uthmani";
  try {
    if (document.fonts) await document.fonts.ready;
  } catch (e) {
    console.warn("Font pre-activation skipped:", e);
  }

  const reciterFolder = cfg.reciter.replace(/\s+/g, "_").replace(/'/g, "");

  const timeline = await buildTimeline({
    surahId: cfg.surahId,
    verses: renderVerses,
    reciter: reciterFolder,
    fallbackPerWordMs: 450,
    introMs: introVideo?.duration ? Math.round(introVideo.duration * 1000) : 0,
    outroMs: outroVideo?.duration ? Math.round(outroVideo.duration * 1000) : 0,
  });

  // Strict structural background state evaluation switches
  const isVideoBgActive = cfg.bgKind === "video" && !!bgVideo;
  const isImageBgActive = cfg.bgKind === "image" && !!bgImg;

  // Build final descriptor packet payload 
  const scene: RenderScene = {
    width: previewSize.w,
    height: previewSize.h,
    
    // Clear flat color and image if continuous tracking video background handles the render frame loop
    bgColor: isVideoBgActive ? "transparent" : cfg.bgColor,
    bgImage: isVideoBgActive ? null : (isImageBgActive ? bgImg : null),
    
    // Nested content blocks
    containerBg: cfg.containerBgKind === "image" && containerImg ? "transparent" : cfg.containerBg,
    containerBgImage: cfg.containerBgKind === "image" ? containerImg : null,
    
    borderColor: cfg.borderColor,
    borderWidth: cfg.borderWidth,
    borderRadius: cfg.borderRadius,
    arabicFontFamily,
    arabicSize: Math.round((previewSize.h / 1080) * ecfg.arabicSize * 3),
    translationSize: Math.round((previewSize.h / 1080) * ecfg.translationSize * 2),
    transliterationSize: Math.round((previewSize.h / 1080) * ecfg.transliterationSize * 2),
    arabicColor: colors.arabicCol,
    translationColor: colors.translationCol,
    transliterationColor: colors.transliterationCol,
    highlightColor: colors.highlightCol,
    verses: renderVerses,
    watermark: cfg.showWatermark ? cfg.watermarkText : "",
    logoImage: logoImg,
    logoCorner: cfg.logoCorner,
    arabicPosition: cfg.arabicPosition,
    translationPosition: cfg.translationPosition,
    transliterationPosition: cfg.transliterationPosition,
    showLines: cfg.showLines,
    linesCount: cfg.linesCount,
    
    // Media timeline video objects mapped downstream to canvas painter tracks
    introVideo,
    outroVideo,
    bgVideo: isVideoBgActive ? bgVideo : null // <-- ATTACHED SAFELY TO PASSTHROUGH NODE
  };

  return renderToVideo({
    scene,
    timeline,
    fps: cfg.exportFormat === "mp4" ? 30 : 24,
    format: cfg.exportFormat,
    videoBitrate: 4_000_000,
    onProgress: setProgress,
    shouldCancel,
  });
}