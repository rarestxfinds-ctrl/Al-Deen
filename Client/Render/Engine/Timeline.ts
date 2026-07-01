// Build a word-level Timeline from existing ayah Timestamp.json files.
// Falls back to a flat perWordMs when no timestamps are available.

import { getAyahTimestamps } from "Server/API/Quran";
import type { RenderVerse, Timeline, TimelineWord } from "./Types";

export interface BuildTimelineArgs {
  surahId: number;
  verses: RenderVerse[];
  reciter: string;
  /** Used when a verse has no timestamp data. */
  fallbackPerWordMs: number;
  introMs: number;
  outroMs: number;
}

let lastTimeline: Timeline | null = null;
let lastIndex = 0;

/**
 * Parse "start-end" (ms) range strings. Falls back to linear interpolation
 * across the verse's full duration when word counts mismatch.
 */
function rangesToWordTimings(
  ranges: string[] | null,
  wordCount: number,
  fallbackPerWordMs: number
): { startMs: number; endMs: number }[] {
  if (!ranges || ranges.length === 0) {
    const out: { startMs: number; endMs: number }[] = [];
    for (let i = 0; i < wordCount; i++) {
      out.push({
        startMs: i * fallbackPerWordMs,
        endMs: (i + 1) * fallbackPerWordMs,
      });
    }
    return out;
  }

  const parsed = ranges
    .map((r) => {
      const [a, b] = r.split("-").map((n) => parseInt(n, 10));
      return { startMs: a || 0, endMs: b || 0 };
    })
    .filter((x) => x.endMs > x.startMs);

  if (parsed.length === 0) {
    return rangesToWordTimings(null, wordCount, fallbackPerWordMs);
  }

  // Normalize relative to the verse start (ranges from Timestamp.json are
  // ABSOLUTE within the surah audio file, but we only use intra-verse deltas).
  const base = parsed[0].startMs;
  const norm = parsed.map((p) => ({
    startMs: p.startMs - base,
    endMs: p.endMs - base,
  }));

  // If counts match — perfect.
  if (norm.length === wordCount) return norm;

  // Stretch / squeeze: distribute available range linearly across word count.
  const totalMs = norm[norm.length - 1].endMs;
  const out: { startMs: number; endMs: number }[] = [];
  for (let i = 0; i < wordCount; i++) {
    out.push({
      startMs: Math.round((i / wordCount) * totalMs),
      endMs: Math.round(((i + 1) / wordCount) * totalMs),
    });
  }
  return out;
}

export async function buildTimeline(args: BuildTimelineArgs): Promise<Timeline> {
  const { surahId, verses, reciter, fallbackPerWordMs, introMs, outroMs } = args;

  const words: TimelineWord[] = [];
  let cursor = introMs;

  for (let vi = 0; vi < verses.length; vi++) {
    const v = verses[vi];
    const wc = Math.max(1, v.words.length);
    let ranges: string[] | null = null;
    try {
      ranges = await getAyahTimestamps(surahId, v.verseNumber, reciter);
    } catch {
      ranges = null;
    }
    const wt = rangesToWordTimings(ranges, wc, fallbackPerWordMs);
    for (let wi = 0; wi < wc; wi++) {
      const t = wt[wi];
      words.push({
        verseIdx: vi,
        wordIdx: wi,
        startMs: cursor + t.startMs,
        endMs: cursor + t.endMs,
      });
    }
    const verseDur = wt[wt.length - 1]?.endMs ?? wc * fallbackPerWordMs;
    cursor += verseDur;
  }

  const bodyEndMs = cursor;
  return {
    introMs,
    outroMs,
    bodyStartMs: introMs,
    bodyEndMs,
    totalMs: bodyEndMs + outroMs,
    words,
  };
}

/** Locate the active word at time t (binary-ish; word counts are small). */
export function activeWordAt(timeline: Timeline, timeMs: number): TimelineWord | null {
  if (timeMs < timeline.bodyStartMs || timeMs >= timeline.bodyEndMs) return null;
  if (lastTimeline !== timeline) {
    lastTimeline = timeline;
    lastIndex = 0;
  }

  const cached = timeline.words[lastIndex];
  if (cached && timeMs >= cached.startMs && timeMs < cached.endMs) return cached;

  let lo = 0;
  let hi = timeline.words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const w = timeline.words[mid];
    if (timeMs < w.startMs) hi = mid - 1;
    else if (timeMs >= w.endMs) lo = mid + 1;
    else {
      lastIndex = mid;
      return w;
    }
  }
  return timeline.words[timeline.words.length - 1] ?? null;
}
