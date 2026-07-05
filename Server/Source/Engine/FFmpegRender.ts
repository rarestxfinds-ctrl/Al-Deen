// Headless render engine — FFmpeg tier, HarfBuzz-composited overlay version.
// background.mp4 + per-word overlay PNGs + audio.mp3 --> ffmpeg --> output.mp4
//
// There is no burned .ass file and no \k tags: the "highlight" effect is a
// cropped slice of a highlight-colored PNG, gated on/off per word via
// enable='between(t,a,b)' and stacked over the always-visible base-colored
// PNG of the same line.
//
// IMPORTANT: the background is scaled/cropped to scene.width x scene.height
// FIRST, before any overlay is composited. Every overlay x/y expression
// below assumes it's positioning against a scene.width x scene.height frame
// (e.g. "(scene.width - imgW)/2" to center). Doing scale/crop LAST instead
// positions overlays against the background's native resolution and then
// drags them along with the final resize — that's what causes oversized,
// off-center overlay PNGs.

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { rasterizeVerseLine, rasterizePlainText } from "./VerseRasterizer.js";
import type {
  FfmpegRenderOptions, FfmpegRenderResult, RenderVerse, ScenePosition, Timeline, TimelineWord,
} from "./Types.js";

function alignAnchorFor(pos: ScenePosition | undefined): "left" | "center" | "right" {
  const p = pos ?? "center";
  if (p.endsWith("-left")) return "left";
  if (p.endsWith("-right")) return "right";
  return "center";
}

function vAnchorFor(pos: ScenePosition | undefined): "top" | "middle" | "bottom" {
  const p = pos ?? "center";
  if (p.startsWith("top-")) return "top";
  if (p.startsWith("bottom-")) return "bottom";
  return "middle";
}

/** Overlay x/y expressions (ffmpeg filter language) for a given anchor + image size. */
function overlayXYExpr(
  scene: { width: number; height: number; paddingXFrac?: number; paddingYFrac?: number },
  pos: ScenePosition | undefined,
  imgWvar: string,
  imgHvar: string,
): { x: string; y: string } {
  const padX = Math.round(scene.width * (scene.paddingXFrac ?? 0.06));
  const padY = Math.round(scene.height * (scene.paddingYFrac ?? 0.08));
  const h = alignAnchorFor(pos);
  const v = vAnchorFor(pos);
  const x = h === "left" ? `${padX}` : h === "right" ? `${scene.width}-${padX}-${imgWvar}` : `(${scene.width}-${imgWvar})/2`;
  const y = v === "top" ? `${padY}` : v === "bottom" ? `${scene.height}-${padY}-${imgHvar}` : `(${scene.height}-${imgHvar})/2`;
  return { x, y };
}

interface PlannedLine {
  verseIdx: number;
  basePngPath: string;
  highlightPngPath: string;
  width: number;
  height: number;
  wordBoxes: { wordIdx: number; xMin: number; xMax: number }[];
  words: TimelineWord[];
  pos: ScenePosition | undefined;
  verseStart: number;
  verseEnd: number;
}

interface PlannedStaticText {
  pngPath: string;
  width: number;
  height: number;
  pos: ScenePosition | undefined;
  start: number;
  end: number;
}

export async function renderWithFfmpeg(opts: FfmpegRenderOptions): Promise<FfmpegRenderResult> {
  const { backgroundVideoPath, audioPath, scene, timeline, fps, outputPath, onProgress, shouldCancel } = opts;

  const workDir = opts.workDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), "quran-render-")));
  await fs.mkdir(workDir, { recursive: true });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const wordsByVerse = new Map<number, TimelineWord[]>();
  for (const w of timeline.words) {
    if (!wordsByVerse.has(w.verseIdx)) wordsByVerse.set(w.verseIdx, []);
    wordsByVerse.get(w.verseIdx)!.push(w);
  }

  const arabicLines: PlannedLine[] = [];
  const staticTexts: PlannedStaticText[] = [];

  for (let vi = 0; vi < scene.verses.length; vi++) {
    const verse: RenderVerse = scene.verses[vi];
    const vWords = (wordsByVerse.get(vi) || []).sort((a, b) => a.startMs - b.startMs);
    if (vWords.length === 0) continue;

    const spokenCount = vWords.filter((w) => w.startMs !== w.endMs).length;
    const hasTrailingMarker = verse.words.length > spokenCount;
    const verseStart = vWords[0]?.startMs ?? 0;
    const verseEnd = vWords[spokenCount - 1]?.endMs ?? verseStart;

    const fontFamily = verse.arabicFontFamily || scene.arabicFontFamily;
    const fontPath = opts.fontFamilyPaths?.get(fontFamily);
    if (!fontPath) {
      throw new Error(`No staged font file found for family "${fontFamily}" (verse ${vi}). ` +
        `Call stageFontsDir() first and pass its familyPaths through.`);
    }

    const line = await rasterizeVerseLine({
      words: verse.words,
      hasTrailingMarker,
      fontPath,
      fontSizePx: scene.arabicSize,
      baseColor: scene.arabicColor,
      highlightColor: scene.highlightColor,
      workDir,
    });

    arabicLines.push({
      verseIdx: vi,
      basePngPath: line.basePngPath,
      highlightPngPath: line.highlightPngPath,
      width: line.width,
      height: line.height,
      wordBoxes: line.wordBoxes,
      words: vWords.slice(0, spokenCount),
      pos: scene.arabicPosition,
      verseStart,
      verseEnd,
    });

    if (verse.translation) {
      const t = await rasterizePlainText(verse.translation, "Inter", scene.translationSize, scene.translationColor, workDir);
      staticTexts.push({ ...t, pos: scene.translationPosition ?? "bottom-center", start: verseStart, end: verseEnd });
    }
    if (verse.transliteration) {
      const t = await rasterizePlainText(verse.transliteration, "Inter", scene.transliterationSize, scene.transliterationColor, workDir, true);
      staticTexts.push({ ...t, pos: scene.transliterationPosition ?? "bottom-center", start: verseStart, end: verseEnd });
    }
  }

  // ---- Build ffmpeg input list + filter_complex graph ----
  const inputs: string[] = ["-stream_loop", "-1", "-i", backgroundVideoPath];
  let inputIdx = 1;
  if (audioPath) { inputs.push("-i", audioPath); inputIdx = 2; }

  const imageInputIndex = new Map<string, number>();
  const addImageInput = (p: string): number => {
    if (imageInputIndex.has(p)) return imageInputIndex.get(p)!;
    inputs.push("-loop", "1", "-i", p);
    const idx = inputIdx++;
    imageInputIndex.set(p, idx);
    return idx;
  };

  const filterParts: string[] = [];

  // Normalize the background to the target canvas size FIRST. Every overlay
  // x/y expression below assumes it's compositing onto a
  // scene.width x scene.height frame — doing scale/crop LAST instead
  // positions overlays against the background's native resolution and then
  // drags them along with the final resize, which is exactly the
  // "too big / not centered" bug.
  filterParts.push(
    `[0:v]scale=${scene.width}:${scene.height}:force_original_aspect_ratio=increase,` +
    `crop=${scene.width}:${scene.height},fps=${fps}[bg]`,
  );
  let cur = "[bg]";

  const timeRange = (a: number, b: number) => `between(t\\,${(a / 1000).toFixed(3)}\\,${(b / 1000).toFixed(3)})`;

  let labelN = 0;
  const nextLabel = () => `[v${labelN++}]`;

  // 1) always-visible base line per verse
  for (const line of arabicLines) {
    const baseIdx = addImageInput(line.basePngPath);
    const { x, y } = overlayXYExpr(scene, line.pos, `${line.width}`, `${line.height}`);
    const out = nextLabel();
    filterParts.push(
      `${cur}[${baseIdx}:v]overlay=x=${x}:y=${y}:enable='${timeRange(line.verseStart, line.verseEnd)}'${out}`,
    );
    cur = out;
  }

  // 2) per-word highlight slices — crop the highlight PNG to the word's x
  //    range, then overlay only during that word's active window.
  for (const line of arabicLines) {
    const hlIdx = addImageInput(line.highlightPngPath);
    const { x: baseX, y } = overlayXYExpr(scene, line.pos, `${line.width}`, `${line.height}`);

    for (const w of line.words) {
      const box = line.wordBoxes.find((b) => b.wordIdx === w.wordIdx);
      if (!box) continue;
      const cropW = Math.max(1, Math.round(box.xMax - box.xMin));
      const cropX = Math.round(box.xMin);

      const cropLabel = nextLabel();
      filterParts.push(`[${hlIdx}:v]crop=${cropW}:${line.height}:${cropX}:0${cropLabel}`);

      // The crop shifts the overlay's own x origin — offset the base
      // position by the crop's left edge so the slice lands back in the
      // exact spot it was cut from.
      const wordX = `(${baseX})+${cropX}`;
      const out = nextLabel();
      filterParts.push(
        `${cur}${cropLabel}overlay=x=${wordX}:y=${y}:enable='${timeRange(w.startMs, w.endMs)}'${out}`,
      );
      cur = out;
    }
  }

  // 3) static translation/transliteration overlays — the LAST overlay in
  //    the whole graph is relabeled directly to [vout] rather than piping
  //    through another scale/crop step (that final resize was the bug).
  if (staticTexts.length > 0) {
    staticTexts.forEach((t, i) => {
      const idx = addImageInput(t.pngPath);
      const { x, y } = overlayXYExpr(scene, t.pos, `${t.width}`, `${t.height}`);
      const isLast = i === staticTexts.length - 1;
      const out = isLast ? "[vout]" : nextLabel();
      filterParts.push(`${cur}[${idx}:v]overlay=x=${x}:y=${y}:enable='${timeRange(t.start, t.end)}'${out}`);
      cur = out;
    });
  } else {
    // No static text overlays at all — cur is whatever the last word-
    // highlight (or, if no verses had words, the background) produced.
    // Relabel it to [vout] with a no-op filter so -map "[vout]" always
    // resolves to a real label.
    filterParts.push(`${cur}null[vout]`);
  }

  const filterComplex = filterParts.join(";\n");
  const filterScriptPath = path.join(workDir, "filter_complex.txt");
  await fs.writeFile(filterScriptPath, filterComplex, "utf8");

  const durationSec = timeline.totalMs / 1000;
  const hasAudio = !!audioPath;

  const args = [
    "-y",
    ...inputs,
    "-filter_complex_script", filterScriptPath,
    "-map", "[vout]",
    ...(hasAudio ? ["-map", "1:a:0"] : []),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-b:v", opts.videoBitrate ?? "6M",
    "-pix_fmt", "yuv420p",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", opts.audioBitrate ?? "192k"] : ["-an"]),
    "-t", durationSec.toFixed(3),
    "-movflags", "+faststart",
    "-progress", "pipe:1",
    "-nostats",
    outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderrTail = "";
    let cancelled = false;
    const cancelTimer = shouldCancel
      ? setInterval(() => { if (shouldCancel()) { cancelled = true; proc.kill("SIGKILL"); } }, 500)
      : null;

    proc.stdout?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk: string) => {
      for (const line of chunk.split("\n")) {
        const m = line.match(/^out_time_ms=(\d+)$/);
        if (m) onProgress?.(Math.max(0, Math.min(1, parseInt(m[1], 10) / 1000 / timeline.totalMs)));
      }
    });
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (c: string) => { stderrTail = (stderrTail + c).slice(-4000); });
    proc.on("error", (err) => { if (cancelTimer) clearInterval(cancelTimer); reject(new Error(`Failed to launch ffmpeg: ${err.message}`)); });
    proc.on("close", (code) => {
      if (cancelTimer) clearInterval(cancelTimer);
      if (cancelled) return reject(new Error("Render cancelled"));
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}\n${stderrTail}`));
    });
  });

  onProgress?.(1);
  const stat = await fs.stat(outputPath).catch(() => null);
  if (!stat || stat.size === 0) throw new Error("FFmpeg produced an empty or missing output file");

  return { outputPath, durationMs: timeline.totalMs };
}