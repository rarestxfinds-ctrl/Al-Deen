// Rasterizes one already-shaped verse line TWICE (base color, highlight
// color) using opentype.js glyph outlines drawn at HarfBuzz's computed
// pen positions. Same GID space in both libraries -> positions from
// HarfBuzz map 1:1 onto opentype.js glyph lookups.

import { createCanvas } from "@napi-rs/canvas";
import opentypeDefault from "opentype.js";
// opentype.js is CJS (`module.exports = { parse, load, ... }`). Under
// Node's native ESM loader, `import * as ns` wraps the whole CJS exports
// object into `ns.default` instead of spreading its members onto the
// namespace — so `ns.parse` is undefined even though `ns.default.parse`
// exists. A default import gets the real thing directly.
const opentype = opentypeDefault as unknown as typeof import("opentype.js");
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

import { shapeLine } from "./LineShaper.js";
import type { RasterizedVerseLine, WordBox } from "./Types.js";

const otFontCache = new Map<string, opentype.Font>();
async function loadOtFont(fontPath: string): Promise<opentype.Font> {
  const cached = otFontCache.get(fontPath);
  if (cached) return cached;
  const buf = await fs.readFile(fontPath);
  const font = opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
  otFontCache.set(fontPath, font);
  return font;
}

const HORIZONTAL_PAD = 24; // px canvas margin so glyph overshoot/shadow isn't clipped
const WORD_BOX_PAD = 3;    // px padding on each side of a word's crop rect, so
                            // the cursive join stroke at a word boundary isn't
                            // sliced mid-stroke by the highlight overlay

export interface RasterizeArgs {
  words: string[];
  hasTrailingMarker: boolean;
  fontPath: string;
  fontSizePx: number;
  baseColor: string;       // css color string, e.g. "#E8D9B0"
  highlightColor: string;  // css color string
  workDir: string;
}

export async function rasterizeVerseLine(args: RasterizeArgs): Promise<RasterizedVerseLine> {
  const shaped = await shapeLine({
    words: args.words,
    hasTrailingMarker: args.hasTrailingMarker,
    fontPath: args.fontPath,
    fontSizePx: args.fontSizePx,
  });

  const otFont = await loadOtFont(args.fontPath);

  const minX = Math.min(0, ...shaped.glyphs.map((g) => g.x));
  const maxX = Math.max(0, ...shaped.glyphs.map((g) => g.x + g.xAdvance));
  const width = Math.ceil(maxX - minX) + HORIZONTAL_PAD * 2;
  const height = Math.ceil(shaped.ascent + shaped.descent) + HORIZONTAL_PAD * 2;

  const baselineY = HORIZONTAL_PAD + shaped.ascent;
  const originX = HORIZONTAL_PAD - minX;

  async function drawPass(color: string): Promise<string> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    for (const g of shaped.glyphs) {
      const glyph = otFont.glyphs.get(g.glyphId);
      const glyphPath = glyph.getPath(originX + g.x, baselineY - g.y, args.fontSizePx);
      glyphPath.fill = color;
      // opentype.js Path#draw builds the ctx path via moveTo/lineTo/curveTo
      // then fills it — this is the actual outline HarfBuzz positioned,
      // not a re-shaped/re-laid-out string, so joins stay correct.
      glyphPath.draw(ctx as unknown as CanvasRenderingContext2D);
    }

    const outPath = path.join(args.workDir, `line-${randomUUID()}.png`);
    const buf = await canvas.encode("png");
    await fs.writeFile(outPath, buf);
    return outPath;
  }

  const basePngPath = await drawPass(args.baseColor);
  const highlightPngPath = await drawPass(args.highlightColor);

  // Convert word boxes from shaper's pen-space into this canvas's pixel
  // space, with padding, clamped to canvas bounds.
  const toCanvasSpace = (b: WordBox): WordBox => ({
    wordIdx: b.wordIdx,
    xMin: Math.max(0, originX + b.xMin - WORD_BOX_PAD),
    xMax: Math.min(width, originX + b.xMax + WORD_BOX_PAD),
  });

  const wordBoxes = shaped.wordBoxes.map(toCanvasSpace);

  return { basePngPath, highlightPngPath, width, height, wordBoxes };
}

/** Simple (non-cursive) text rasterizer for translation/transliteration
 *  lines — no HarfBuzz needed since Latin text doesn't need joining, but we
 *  reuse the same canvas so styling stays consistent with the Arabic line. */
export async function rasterizePlainText(
  text: string,
  fontFamily: string,
  fontSizePx: number,
  color: string,
  workDir: string,
  italic = false,
): Promise<{ pngPath: string; width: number; height: number }> {
  const measureCanvas = createCanvas(10, 10);
  const mctx = measureCanvas.getContext("2d");
  mctx.font = `${italic ? "italic " : ""}${fontSizePx}px "${fontFamily}"`;
  const metrics = mctx.measureText(text);
  const width = Math.ceil(metrics.width) + HORIZONTAL_PAD * 2;
  const height = Math.ceil(fontSizePx * 1.4) + HORIZONTAL_PAD * 2;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.font = `${italic ? "italic " : ""}${fontSizePx}px "${fontFamily}"`;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, HORIZONTAL_PAD, HORIZONTAL_PAD + fontSizePx);

  const outPath = path.join(workDir, `text-${randomUUID()}.png`);
  await fs.writeFile(outPath, await canvas.encode("png"));
  return { pngPath: outPath, width, height };
}