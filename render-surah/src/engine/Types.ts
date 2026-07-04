export interface RenderVerse {
  verseNumber: number;
  arabic: string;
  words: string[]; // last entry may be the ayah-number marker glyph
  translation?: string;
  transliteration?: string;
  arabicFontFamily?: string;
  mushafPage?: number;
}

export type ScenePosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export interface RenderScene {
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
  verses: RenderVerse[];
  arabicPosition?: ScenePosition;
  translationPosition?: ScenePosition;
  transliterationPosition?: ScenePosition;
  paddingXFrac?: number;
  paddingYFrac?: number;
}

export interface TimelineWord {
  verseIdx: number;
  wordIdx: number;
  startMs: number;
  endMs: number;
}

export interface Timeline {
  bodyStartMs: number;
  bodyEndMs: number;
  totalMs: number;
  words: TimelineWord[];
}

/** One shaped, positioned glyph from HarfBuzz, resolved to a GID opentype.js can draw. */
export interface ShapedGlyph {
  glyphId: number;
  cluster: number;   // char index into the source string this glyph came from
  x: number;          // pen-space x (px, already scaled to fontSize), left edge
  y: number;
  xAdvance: number;
}

/** Pixel-space bounding box of one word's glyphs within a rasterized line image. */
export interface WordBox {
  wordIdx: number;
  xMin: number;
  xMax: number;
}

export interface ShapedLine {
  glyphs: ShapedGlyph[];
  wordBoxes: WordBox[];   // spoken words only (excludes trailing ayah marker)
  markerBox?: WordBox;    // ayah-number marker, if present, always unhighlighted
  totalWidth: number;
  ascent: number;
  descent: number;
}

export interface RasterizedVerseLine {
  basePngPath: string;       // whole line, unhighlighted color, transparent bg
  highlightPngPath: string;  // whole line, highlighted color, transparent bg
  width: number;
  height: number;
  /** word crop rects in the SAME pixel space as the two PNGs above */
  wordBoxes: WordBox[];
}

export interface FfmpegRenderOptions {
  backgroundVideoPath: string;
  audioPath?: string;
  scene: RenderScene;
  timeline: Timeline;
  fps: number;
  outputPath: string;
  workDir?: string;
  fontFamilyPaths?: Map<string, string>; // family name -> real .ttf path (from stageFontsDir)
  videoBitrate?: string;
  audioBitrate?: string;
  onProgress?: (p: number) => void;
  shouldCancel?: () => boolean;
}

export interface FfmpegRenderResult {
  outputPath: string;
  durationMs: number;
}