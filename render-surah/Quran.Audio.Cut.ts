// Server/Render-Surah/Quran.Audio.Cut.ts
//
// Server-only. Cuts a verse range out of a full-surah audio file using its
// Timestamp/{surahId}.json data, and returns rebased (0-start) timestamps
// for the cut clip — ready to feed into buildTimeline() for the video renderer.
//
// Do NOT import this from client components — it uses node:child_process
// and node:fs and will crash the browser bundle if pulled in client-side.

import { spawn } from "node:child_process";
import { promises as nodeFs } from "node:fs";
import * as nodePath from "node:path";

export const QURAN_AUDIO_FS_ROOT =
  process.env.QURAN_AUDIO_FS_ROOT ??
  nodePath.join(process.cwd(), "Server", "Data", "Quran", "Surah", "Qiraat");

function surahAudioFsPath(reciter: string, surahId: number): string {
  return nodePath.join(QURAN_AUDIO_FS_ROOT, reciter, "Audio", `${surahId}.mp3`);
}

function surahTimestampFsPath(reciter: string, surahId: number): string {
  return nodePath.join(QURAN_AUDIO_FS_ROOT, reciter, "Timestamp", `${surahId}.json`);
}

/**
 * Reads Timestamp/{surahId}.json straight off disk. Separate from
 * getSurahTimestamps() in Quran.ts (which goes through Vite's glob system)
 * because ffmpeg cutting runs server-side against the real file, not a
 * bundler URL.
 */
async function readSurahTimestampsFs(surahId: number, reciter: string): Promise<string[][]> {
  const raw = await nodeFs.readFile(surahTimestampFsPath(reciter, surahId), "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`Malformed timestamp file for surah ${surahId} (${reciter})`);
  return data as string[][];
}

export interface AyahRange {
  /** 1-indexed, inclusive. Pass the same number for both to cut a single ayah. */
  startVerse: number;
  endVerse: number;
}

export interface CutSurahAudioResult {
  outputPath: string;
  /** Rebased timestamps for the cut clip — index 0 corresponds to startVerse. */
  timestamps: string[][];
  durationMs: number;
}

function parseRange(r: string): { start: number; end: number } {
  const [a, b] = r.split("-").map(Number);
  return { start: a, end: b };
}

/**
 * Cuts [startVerse, endVerse] out of the full surah audio and writes it to
 * outputPath, returning timestamps rebased to start at 0ms for that clip —
 * feed those directly into buildTimeline() instead of the old per-ayah
 * Timestamp.json mock data.
 */
export async function cutSurahAudio(
  surahId: number,
  reciter: string,
  range: AyahRange,
  outputPath: string,
): Promise<CutSurahAudioResult> {
  const allTimestamps = await readSurahTimestampsFs(surahId, reciter);

  if (range.startVerse < 1 || range.endVerse > allTimestamps.length || range.startVerse > range.endVerse) {
    throw new Error(
      `Invalid ayah range ${range.startVerse}-${range.endVerse} for surah ${surahId} ` +
      `(surah has ${allTimestamps.length} verses)`,
    );
  }

  const versesInRange = allTimestamps.slice(range.startVerse - 1, range.endVerse);
  const flatRanges = versesInRange.flat().map(parseRange);
  const cutStartMs = flatRanges[0].start;
  const cutEndMs = flatRanges[flatRanges.length - 1].end;

  const inputPath = surahAudioFsPath(reciter, surahId);
  await nodeFs.access(inputPath).catch(() => {
    throw new Error(`No surah audio file found at ${inputPath}`);
  });
  await nodeFs.mkdir(nodePath.dirname(outputPath), { recursive: true });

  await ffmpegCut(inputPath, outputPath, cutStartMs, cutEndMs);

  const rebasedTimestamps: string[][] = versesInRange.map((verseRanges) =>
    verseRanges.map((r) => {
      const { start, end } = parseRange(r);
      return `${start - cutStartMs}-${end - cutStartMs}`;
    }),
  );

  return { outputPath, timestamps: rebasedTimestamps, durationMs: cutEndMs - cutStartMs };
}

function ffmpegCut(inputPath: string, outputPath: string, startMs: number, endMs: number): Promise<void> {
  const startSec = (startMs / 1000).toFixed(3);
  const durSec = ((endMs - startMs) / 1000).toFixed(3);

  // -ss AFTER -i (not before) trades a bit of seek speed for sample-accurate
  // cutting — mp3 has no keyframes, so a pre-input -ss can drift by a whole
  // frame (~26ms), which is audible/visible against word-level highlight
  // timing. Re-encoding (not -c copy) is required for the same reason.
  const args = [
    "-y",
    "-i", inputPath,
    "-ss", startSec,
    "-t", durSec,
    "-c:a", "libmp3lame",
    "-q:a", "2",
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderrTail = "";
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (c: string) => { stderrTail = (stderrTail + c).slice(-2000); });
    proc.on("error", (err) => reject(new Error(`Failed to launch ffmpeg: ${err.message}`)));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg cut failed (code ${code})\n${stderrTail}`));
    });
  });
}