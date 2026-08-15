// Client/Render/Engine/CanvasFallback.ts
import { type AssembledVerse } from "Server/API/Quran";
import { 
  type Config, 
  RESOLUTIONS, 
  RECITERS, 
  pageFontFamily 
} from "./Types"; // Adjust this relative path depending on your folder layout

// ====================== Real render (canvas + MediaRecorder → webm download) ======================
export async function renderToWebm(args: {
  verses: AssembledVerse[];
  cfg: Config & Record<string, any>;
  arabicCol: string;
  translationCol: string;
  transliterationCol: string;
  highlightCol: string;
  extraTranslations: Record<string, string[]>;
  extraTransliterations: Record<string, string[]>;
}): Promise<void> {
  const { verses, cfg, arabicCol, translationCol, transliterationCol, highlightCol, extraTranslations, extraTransliterations } = args;
  if (!verses.length) throw new Error("No ayahs in range");
  const res = RESOLUTIONS[cfg.resolution];
  const W = res.w, H = res.h;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Pre-load background image if any
  let bgImg: HTMLImageElement | null = null;
  if (cfg.bgKind === "image" && cfg.bgUrl) {
    bgImg = await loadImage(cfg.bgUrl);
  }
  let containerImg: HTMLImageElement | null = null;
  if (cfg.containerBgKind === "image" && cfg.containerBgUrl) {
    containerImg = await loadImage(cfg.containerBgUrl);
  }
  let logoImg: HTMLImageElement | null = null;
  if (cfg.logoUrl) {
    logoImg = await loadImage(cfg.logoUrl).catch(() => null);
  }

  const fps = 30;
  const stream = canvas.captureStream(fps);
  const wantMp4 = (cfg as any).exportFormat === "mp4";
  const mp4Mime = "video/mp4;codecs=avc1.42E01E";
  let mime: string;
  if (wantMp4 && MediaRecorder.isTypeSupported(mp4Mime)) mime = mp4Mime;
  else if (wantMp4 && MediaRecorder.isTypeSupported("video/mp4")) mime = "video/mp4";
  else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) mime = "video/webm;codecs=vp9";
  else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) mime = "video/webm;codecs=vp8";
  else mime = "video/webm";
  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(stream, { mimeType: mime });
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
  });

  rec.start();

  const perWord = 0.6; // seconds
  const totalWords = verses.reduce((a, v) => a + v.words.length, 0);
  const introSec = cfg.addIntro ? 1.2 : 0;
  const outroSec = cfg.addOutro ? 1.2 : 0;
  const totalSec = introSec + totalWords * perWord + outroSec;
  const totalFrames = Math.ceil(totalSec * fps);

  const drawBg = () => {
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      ctx.fillStyle = cfg.bgColor;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, W, H);
  };

  const drawContainerCard = (cardX: number, cardY: number, cardW: number, cardH: number) => {
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, cfg.borderRadius);
    if (containerImg) {
      ctx.clip();
      ctx.drawImage(containerImg, cardX, cardY, cardW, cardH);
    } else {
      ctx.fillStyle = cfg.containerBg;
      ctx.fill();
    }
    ctx.restore();
    if (cfg.borderWidth > 0) {
      ctx.save();
      ctx.strokeStyle = cfg.borderColor;
      ctx.lineWidth = cfg.borderWidth;
      roundRect(ctx, cardX, cardY, cardW, cardH, cfg.borderRadius);
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawCenteredText = (text: string, x: number, y: number, maxW: number, size: number, color: string, font: string, align: CanvasTextAlign = "center") => {
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    const lines = wrapText(ctx, text, maxW);
    const lineHeight = size * 1.4;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lineHeight));
    return lines.length * lineHeight;
  };

  const drawFrame = (frameIdx: number) => {
    const t = frameIdx / fps;
    drawBg();

    // Branding
    if (logoImg) {
      const h = 80; const w = (logoImg.width / logoImg.height) * h;
      ctx.drawImage(logoImg, W - w - 40, 40, w, h);
    }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 28px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = logoImg ? "left" : "right";
    ctx.fillText("Al-Deen.org", logoImg ? 40 : W - 40, 40);

    // Intro/Outro are now videos rendered via DOM-snapshot path; canvas fallback skips them.
    if (t < introSec && cfg.addIntro) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); return; }
    if (t > introSec + totalWords * perWord && cfg.addOutro) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); return; }

    const tick = Math.min(totalWords - 1, Math.max(0, Math.floor((t - introSec) / perWord)));
    let vIdx = 0, before = 0;
    for (let i = 0; i < verses.length; i++) {
      if (tick < before + verses[i].words.length) { vIdx = i; break; }
      before += verses[i].words.length;
    }
    const v = verses[vIdx];
    const wordIdx = tick - before;

    // Card
    const cardW = Math.min(W * 0.85, 1400);
    const cardH = H * 0.7;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;
    drawContainerCard(cardX, cardY, cardW, cardH);

    // Arabic line (no per-word highlight in canvas to keep things robust; whole text in arabicCol, current word in highlight)
    const ff = pageFontFamily(cfg.font, cfg.surahId, v.verseNumber) || "serif";
    ctx.save();
    ctx.font = `${cfg.arabicSize * 2}px ${ff}, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const arabicY = cardY + cardH * 0.35;
    const fullText = v.words.join(cfg.font === "uthmani_v1" ? "" : " ");
    ctx.fillStyle = arabicCol;
    const arLines = wrapText(ctx, fullText, cardW - 80);
    const arLH = cfg.arabicSize * 2 * 1.4;
    arLines.forEach((ln, i) => ctx.fillText(ln, W / 2, arabicY - ((arLines.length - 1) * arLH) / 2 + i * arLH));
    // Highlight current word at top
    ctx.fillStyle = highlightCol;
    ctx.font = `${cfg.arabicSize * 2}px ${ff}, serif`;
    ctx.fillText(v.words[wordIdx] || "", W / 2, cardY + 60);
    ctx.restore();

    // Translations
    let yCursor = cardY + cardH * 0.62;
    const activeTr = cfg.translations.filter((t) => t !== "None");
    const activeTl = cfg.transliterations.filter((t) => t !== "None");
    activeTl.forEach((src) => {
      const text = extraTransliterations[src]?.[v.verseNumber - 1] ?? "";
      if (!text) return;
      const used = drawCenteredText(text, W / 2, yCursor, cardW - 80, cfg.transliterationSize * 2, transliterationCol, "italic sans-serif");
      yCursor += used + 16;
    });
    activeTr.forEach((src) => {
      const text = extraTranslations[src]?.[v.verseNumber - 1] ?? "";
      if (!text) return;
      const used = drawCenteredText(text, W / 2, yCursor, cardW - 80, cfg.translationSize * 2, translationCol, "sans-serif");
      yCursor += used + 16;
    });
  };

  for (let f = 0; f < totalFrames; f++) {
    drawFrame(f);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  rec.stop();
  const blob = await done;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Surah-${cfg.surahId}-${cfg.ayahStart}-${cfg.ayahEnd}.${ext}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function makeDefaults(surahId: number, ayahNumber: number | undefined, mode: "render" | "embed"): Config {
  return {
    resolution: "1080p",
    width: 600,
    height: 480,
    exportFormat: "webm",
    reciter: RECITERS[0],
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
  };
}