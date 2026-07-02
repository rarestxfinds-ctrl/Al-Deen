// Server-side render engine — shared types.
// Pipeline: background.mp4 + subtitles.ass + audio.mp3 --> FFmpeg --> output.mp4
// No canvas/WebCodecs/MediaRecorder involved anymore — this all runs in Node.

export interface RenderVerse {
  verseNumber: number;
  arabic: string;
  words: string[];
  translation?: string;
  transliteration?: string;
  /** Per-ayah font override. Falls back to scene.arabicFontFamily when unset.
   *  Must match the .ass Style Fontname AND the actual font file's internal
   *  family name (see render-server/src/engine/FontAssets.ts). */
  arabicFontFamily?: string;
  /** Mushaf page number this verse falls on — needed to resolve the correct
   *  per-page KFGQPC V1/V2 font file/family. */
  mushafPage?: number;
}

export type ScenePosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export interface RenderScene {
  width: number;
  height: number;

  // Typography
  arabicFontFamily: string;          // default, overridable per-verse
  arabicSize: number;
  translationSize: number;
  transliterationSize: number;

  arabicColor: string;               // any CSS color (#rgb, #rrggbb, #rrggbbaa, rgba())
  translationColor: string;
  transliterationColor: string;
  highlightColor: string;

  // Content
  verses: RenderVerse[];

  // Positioning (defaults: arabic=center, translation/transliteration=bottom-center)
  arabicPosition?: ScenePosition;
  translationPosition?: ScenePosition;
  transliterationPosition?: ScenePosition;

  // Layout padding, expressed as fraction of W/H — mirrors the old canvas padding.
  paddingXFrac?: number;              // default 0.06
  paddingYFrac?: number;              // default 0.08
}

/** Single word slice on the global timeline (ms, absolute from t=0). */
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
export interface FfmpegRenderOptions {
  backgroundVideoPath: string;
  /** Optional — reciter-audio resolution isn't wired up yet. When omitted,
   *  the render is produced silent (video + burned-in subtitles only). */
  audioPath?: string;
  scene: RenderScene;
  timeline: Timeline;
  fps: number;
  outputPath: string;
  /** Directory for scratch files (the generated .ass, etc). Defaults to os.tmpdir(). */
  workDir?: string;
  /** Directory ffmpeg's ass filter should search for the Arabic/Latin font files. */
  fontsDir?: string;
  videoBitrate?: string;             // e.g. "6M" — default "6M"
  audioBitrate?: string;             // default "192k"
  onProgress?: (p: number) => void;  // 0..1, driven off ffmpeg's -progress stream
  shouldCancel?: () => boolean;
}

export interface FfmpegRenderResult {
  outputPath: string;
  durationMs: number;
  assPath: string;
}