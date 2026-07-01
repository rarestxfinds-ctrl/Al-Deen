// Client/Render/Engine/Painter.ts
import { activeWordAt } from "./Timeline";
import type { RenderScene, ScenePosition, Timeline } from "./Types";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawCover(
  ctx: Ctx,
  img: HTMLImageElement | ImageBitmap | HTMLVideoElement,
  x: number, y: number, w: number, h: number
) {
  const iw = (img as any).videoWidth ?? (img as any).width;
  const ih = (img as any).videoHeight ?? (img as any).height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img as any, dx, dy, dw, dh);
}

function isTransparent(color: string): boolean {
  if (!color) return true;
  const c = color.trim().toLowerCase();
  if (c === "transparent" || c === "none") return true;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((p) => p.trim());
    if (parts.length === 4 && parseFloat(parts[3]) === 0) return true;
  }
  if (/^#[0-9a-f]{8}$/.test(c) && c.endsWith("00")) return true;
  return false;
}

function layoutArabicLines(
  ctx: Ctx,
  words: string[],
  maxWidth: number,
  spaceWidth: number
): { word: string; idx: number; width: number }[][] {
  const lines: { word: string; idx: number; width: number }[][] = [];
  let current: { word: string; idx: number; width: number }[] = [];
  let used = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const wWidth = ctx.measureText(w).width;
    const need = current.length === 0 ? wWidth : used + spaceWidth + wWidth;
    if (need > maxWidth && current.length > 0) {
      lines.push(current);
      current = [{ word: w, idx: i, width: wWidth }];
      used = wWidth;
    } else {
      current.push({ word: w, idx: i, width: wWidth });
      used = need;
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

function wrapPlain(ctx: Ctx, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface PaintResult {
  phase: "intro" | "body" | "outro";
}

// Track internal global state variables cleanly for layout lookups
let lastValidVerseIdx = 0;

export function paintFrame(
  ctx: Ctx,
  scene: RenderScene,
  timeline: Timeline,
  timeMs: number
): PaintResult {
  const { width: W, height: H } = scene;

  // CRITICAL FIX: Ensure full pixel clearing on every frame redraw to stop accumulating overlap text artifacts
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.restore();

  // ---------------- Intro Phase ----------------
  if (timeMs < timeline.introMs && scene.introVideo) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    drawCover(ctx, scene.introVideo, 0, 0, W, H);
    return { phase: "intro" };
  }
  
  // ---------------- Outro Phase ----------------
  if (timeMs >= timeline.bodyEndMs && scene.outroVideo) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    drawCover(ctx, scene.outroVideo, 0, 0, W, H);
    return { phase: "outro" };
  }

  // ---------------- Core Background Phase ----------------
  // CRITICAL FIX: If background color is explicit transparent but a video asset is active,
  // skip fillRect to protect buffer blending pipeline layers
  if (!isTransparent(scene.bgColor)) {
    ctx.fillStyle = scene.bgColor || "#000000";
    ctx.fillRect(0, 0, W, H);
  } else {
    // Fill fallback base background color safely
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
  }

  // Draw background image if available
  if (scene.bgImage) {
    drawCover(ctx, scene.bgImage as any, 0, 0, W, H);
  } 
  // FIX FOR BLACK SCREEN EXPORT: If scene background mode contains a background video hook, paint it explicitly here!
  else if ((scene as any).bgVideo) {
    drawCover(ctx, (scene as any).bgVideo, 0, 0, W, H);
  }

  // ---------------- Container Canvas Layer ----------------
  const padX = Math.round(W * 0.06);
  const padY = Math.round(H * 0.08);
  const cx = padX, cy = padY;
  const cw = W - padX * 2, ch = H - padY * 2;

  const containerHasFill = !isTransparent(scene.containerBg) || !!scene.containerBgImage;
  if (containerHasFill) {
    ctx.save();
    roundRectPath(ctx, cx, cy, cw, ch, scene.borderRadius);
    if (!isTransparent(scene.containerBg)) {
      ctx.fillStyle = scene.containerBg;
      ctx.fill();
    }
    if (scene.containerBgImage) {
      ctx.save();
      roundRectPath(ctx, cx, cy, cw, ch, scene.borderRadius);
      ctx.clip();
      drawCover(ctx, scene.containerBgImage as any, cx, cy, cw, ch);
      ctx.restore();
    }
    if (scene.borderWidth > 0) {
      ctx.lineWidth = scene.borderWidth;
      ctx.strokeStyle = scene.borderColor;
      roundRectPath(ctx, cx, cy, cw, ch, scene.borderRadius);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------- Timeline Query Track Calculation ----------------
  const active = activeWordAt(timeline, timeMs);
  
  if (timeMs === 0 || timeMs <= timeline.introMs) {
    lastValidVerseIdx = 0;
  }

  if (active) {
    lastValidVerseIdx = active.verseIdx;
  }

  // FIX FOR OVERLAPPING PARENT TEXT: Guarantee fallback to last evaluated verse item inside tracking bounds 
  // rather than bouncing randomly back to Index 0 during audio translation transition gaps
  const verseIdx = lastValidVerseIdx;
  const activeWordIdx = active ? active.wordIdx : -1;
  const verse = scene.verses[verseIdx];
  
  // If there is no verse available within bounds, wrap up frame parsing gracefully
  if (!verse) return { phase: "body" };

  const innerX = cx + Math.round(cw * 0.05);
  const innerW = cw - Math.round(cw * 0.05) * 2;
  const innerY = cy + Math.round(ch * 0.05);
  const innerH = ch - Math.round(ch * 0.05) * 2;

  // -------- Mushaf-style lines overlay Guide Layer --------
  if (scene.showLines) {
    const n = Math.max(2, scene.linesCount ?? 8);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const ly = innerY + Math.round((innerH / (n - 1)) * i);
      ctx.beginPath();
      ctx.moveTo(innerX, ly);
      ctx.lineTo(innerX + innerW, ly);
      ctx.stroke();
    }
    ctx.restore();
  }

  // -------- Position Layout Engine --------
  function posXY(pos: ScenePosition | undefined, blockH: number, blockW: number): { x: number; y: number; align: "left" | "center" | "right" } {
    const p = pos ?? "center";
    const vy = p.startsWith("top-") ? innerY
            : p.startsWith("bottom-") ? innerY + innerH - blockH
            : innerY + Math.round((innerH - blockH) / 2);
    const align: "left" | "center" | "right" =
      p.endsWith("-left") ? "left" : p.endsWith("-right") ? "right" : "center";
    const vx = align === "left" ? innerX
            : align === "right" ? innerX + innerW
            : innerX + Math.round(innerW / 2);
    return { x: vx, y: vy, align };
  }

  // -------- Render Arabic Block Layout (RTL) --------
  ctx.save();
  ctx.font = `${scene.arabicSize}px "${scene.arabicFontFamily}", "Uthmani", serif`;
  const spaceWidth = ctx.measureText(" ").width;
  const arLines = layoutArabicLines(ctx, verse.words, innerW, spaceWidth);
  const arabicLineHeight = Math.round(scene.arabicSize * 1.9);
  const arBlockH = arLines.length * arabicLineHeight;
  const arPos = posXY(scene.arabicPosition, arBlockH, innerW);

  ctx.textBaseline = "alphabetic";
  (ctx as any).direction = "rtl";
  let arY = arPos.y;
  for (const line of arLines) {
    const lineWidth = line.reduce((a, t) => a + t.width, 0) + Math.max(0, line.length - 1) * spaceWidth;
    let xRight: number;
    if (arPos.align === "left") xRight = innerX + lineWidth;
    else if (arPos.align === "right") xRight = innerX + innerW;
    else xRight = innerX + (innerW + lineWidth) / 2;
    ctx.textAlign = "right";
    for (const tok of line) {
      const isActive = tok.idx === activeWordIdx;
      ctx.fillStyle = isActive ? scene.highlightColor : scene.arabicColor;
      ctx.fillText(tok.word, xRight, arY + scene.arabicSize);
      xRight -= tok.width + spaceWidth;
    }
    arY += arabicLineHeight;
  }
  ctx.restore();

  // -------- Render Transliteration Layout Layer --------
  if (verse.transliteration) {
    ctx.save();
    ctx.font = `italic ${scene.transliterationSize}px "Inter", system-ui, sans-serif`;
    const tlLines = wrapPlain(ctx, verse.transliteration, innerW);
    const tLH = Math.round(scene.transliterationSize * 1.5);
    const tlBlockH = tlLines.length * tLH;
    const tlPos = posXY(scene.transliterationPosition, tlBlockH, innerW);
    (ctx as any).direction = "ltr";
    ctx.fillStyle = scene.transliterationColor;
    ctx.textAlign = tlPos.align;
    let tlY = tlPos.y;
    for (const line of tlLines) {
      ctx.fillText(line, tlPos.x, tlY + scene.transliterationSize);
      tlY += tLH;
    }
    ctx.restore();
  }

  // -------- Render Translation Layout Layer --------
  if (verse.translation) {
    ctx.save();
    ctx.font = `${scene.translationSize}px "Inter", system-ui, sans-serif`;
    const trLines = wrapPlain(ctx, verse.translation, innerW);
    const tLH = Math.round(scene.translationSize * 1.5);
    const trBlockH = trLines.length * tLH;
    const trPos = posXY(scene.translationPosition, trBlockH, innerW);
    (ctx as any).direction = "ltr";
    ctx.fillStyle = scene.translationColor;
    ctx.textAlign = trPos.align;
    let trY = trPos.y;
    for (const line of trLines) {
      ctx.fillText(line, trPos.x, trY + scene.translationSize);
      trY += tLH;
    }
    ctx.restore();
  }

  // -------- Brand Logo Overlays --------
  if (scene.logoImage) {
    ctx.save();
    const corner = scene.logoCorner ?? "tr";
    const targetH = Math.round(Math.min(W, H) * 0.08);
    const iw = (scene.logoImage as any).width || 1;
    const ih = (scene.logoImage as any).height || 1;
    const ratio = iw / ih;
    const lh = targetH;
    const lw = Math.round(targetH * ratio);
    const margin = Math.round(Math.min(W, H) * 0.03);
    const lx = corner === "tl" || corner === "bl" ? margin : W - lw - margin;
    const ly = corner === "tl" || corner === "tr" ? margin : H - lh - margin;
    ctx.drawImage(scene.logoImage as any, lx, ly, lw, lh);
    ctx.restore();
  }

  // -------- Structural Watermark Metadata Layer --------
  if (scene.watermark) {
    ctx.save();
    const wmSize = Math.round(Math.min(W, H) * 0.022);
    ctx.font = `600 ${wmSize}px "Inter", system-ui, sans-serif`;
    const logoCorner = scene.logoCorner ?? "tr";
    const wmCorner = logoCorner === "tr" ? "br" : "tr";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    (ctx as any).direction = "ltr";
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.85;
    const margin = Math.round(Math.min(W, H) * 0.03);
    const wx = W - margin;
    const wy = wmCorner === "tr" ? margin + wmSize : H - margin;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.fillText(scene.watermark, wx, wy);
    ctx.restore();
  }

  return { phase: "body" };
}