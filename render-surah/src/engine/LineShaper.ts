// Shapes one full verse line with HarfBuzz — the whole line goes through the
// shaper as a single run, so Arabic joining and BiDi are handled correctly.
// Word boundaries are recovered afterward from HarfBuzz's cluster indices.
//
// Written against harfbuzzjs@1.4.0's class-based API (Blob/Face/Font/Buffer +
// free `shape()` function) — NOT the old hbjs(instance) factory wrapper.
// There is no manual WASM instantiate step; importing the package is enough.

import { promises as fs } from "node:fs";
import { Blob, Face, Font, Buffer as HbBuffer, Direction, shape as hbShape } from "harfbuzzjs";

import type { ShapedGlyph, ShapedLine, WordBox } from "./Types";

// Face/Font objects are cheap to reuse and expensive-ish to build (parses
// the font file each time) — cache per font file path across verses.
const faceCache = new Map<string, Face>();

async function getFace(fontPath: string): Promise<Face> {
  const cached = faceCache.get(fontPath);
  if (cached) return cached;
  const buf = await fs.readFile(fontPath);
  // Blob wants an ArrayBuffer, not a Node Buffer — slice out the exact
  // backing range in case `buf` is a view into a larger pooled allocation.
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const blob = new Blob(arrayBuffer);
  const face = new Face(blob, 0);
  faceCache.set(fontPath, face);
  return face;
}

export interface ShapeLineArgs {
  words: string[];
  hasTrailingMarker: boolean;
  fontPath: string;
  fontSizePx: number;
}

function buildLogicalString(words: string[], hasTrailingMarker: boolean): {
  text: string;
  spokenRanges: { start: number; end: number }[];
  markerRange?: { start: number; end: number };
} {
  const spokenWords = hasTrailingMarker ? words.slice(0, -1) : words;
  const spokenRanges: { start: number; end: number }[] = [];
  let text = "";
  for (let i = 0; i < spokenWords.length; i++) {
    const start = text.length;
    text += spokenWords[i];
    const end = text.length;
    spokenRanges.push({ start, end });
    if (i < spokenWords.length - 1) text += " ";
  }
  let markerRange: { start: number; end: number } | undefined;
  if (hasTrailingMarker) {
    text += " ";
    const start = text.length;
    text += words[words.length - 1];
    markerRange = { start, end: text.length };
  }
  return { text, spokenRanges, markerRange };
}

function wordIdxForCluster(
  cl: number,
  spokenRanges: { start: number; end: number }[],
  markerRange?: { start: number; end: number },
): { kind: "spoken"; idx: number } | { kind: "marker" } | null {
  for (let i = 0; i < spokenRanges.length; i++) {
    if (cl >= spokenRanges[i].start && cl < spokenRanges[i].end) return { kind: "spoken", idx: i };
  }
  if (markerRange && cl >= markerRange.start && cl < markerRange.end) return { kind: "marker" };
  return null;
}

export async function shapeLine(args: ShapeLineArgs): Promise<ShapedLine> {
  const face = await getFace(args.fontPath);
  const font = new Font(face);

  // hb_font_set_scale semantics: the scale IS the units-per-em you want
  // results expressed in. Setting it to the target pixel size means every
  // position/advance the shaper returns comes back already in pixels — no
  // manual upem division and no 26.6 fixed-point unscaling needed with this
  // rewrite (unlike the old hbjs wrapper).
  font.setScale(args.fontSizePx, args.fontSizePx);

  const { text, spokenRanges, markerRange } = buildLogicalString(args.words, args.hasTrailingMarker);

  const buffer = new HbBuffer();
  buffer.addText(text);
  buffer.setDirection(Direction.RTL);
  buffer.setScript("Arab");
  buffer.setLanguage("ar");
  buffer.guessSegmentProperties(); // fills in anything still unset, won't override explicit dir/script/lang

  hbShape(font, buffer);

  const shaped = buffer.getGlyphInfosAndPositions();

  // Walk glyphs in HarfBuzz's returned order, accumulating the pen. For RTL
  // buffers HarfBuzz returns glyphs in left-to-right *drawing* order, so a
  // plain left-to-right pen walk produces correct visual layout.
  let pen = 0;
  const glyphs: ShapedGlyph[] = [];
  const spokenBoxes = new Map<number, { min: number; max: number }>();
  let markerBoxAcc: { min: number; max: number } | null = null;

  for (const g of shaped) {
    const xAdvance = g.xAdvance ?? 0;
    const xOffset = g.xOffset ?? 0;
    const yOffset = g.yOffset ?? 0;
    const glyphX = pen + xOffset;

    glyphs.push({
      glyphId: g.codepoint, // post-shaping, `codepoint` IS the glyph id
      cluster: g.cluster,
      x: glyphX,
      y: yOffset,
      xAdvance,
    });

    const owner = wordIdxForCluster(g.cluster, spokenRanges, markerRange);
    const left = Math.min(glyphX, glyphX + xAdvance);
    const right = Math.max(glyphX, glyphX + xAdvance);
    if (owner?.kind === "spoken") {
      const b = spokenBoxes.get(owner.idx) ?? { min: Infinity, max: -Infinity };
      b.min = Math.min(b.min, left);
      b.max = Math.max(b.max, right);
      spokenBoxes.set(owner.idx, b);
    } else if (owner?.kind === "marker") {
      markerBoxAcc = markerBoxAcc
        ? { min: Math.min(markerBoxAcc.min, left), max: Math.max(markerBoxAcc.max, right) }
        : { min: left, max: right };
    }

    pen += xAdvance;
  }

  const wordBoxes: WordBox[] = spokenRanges.map((_, idx) => {
    const b = spokenBoxes.get(idx);
    return { wordIdx: idx, xMin: b?.min ?? 0, xMax: b?.max ?? 0 };
  });

  const markerBox: WordBox | undefined = markerBoxAcc
    ? { wordIdx: spokenRanges.length, xMin: markerBoxAcc.min, xMax: markerBoxAcc.max }
    : undefined;

  const allX = glyphs.flatMap((g) => [g.x, g.x + g.xAdvance]);
  const totalWidth = allX.length ? Math.max(...allX) - Math.min(...allX) : 0;

  // Real font metrics now, instead of the 0.8/0.3 fontSize guess from before
  // — hExtents() is a direct HarfBuzz call against the scaled font.
  const extents = font.hExtents();
  const ascent = extents?.ascender ?? args.fontSizePx * 0.8;
  const descent = Math.abs(extents?.descender ?? args.fontSizePx * 0.3);

  return { glyphs, wordBoxes, markerBox, totalWidth, ascent, descent };
}

export function clearFaceCache(): void {
  faceCache.clear();
}