// Build a word-level Timeline from real per-verse timestamp data (already
// resolved upstream by Render-Processor.ts via getSurahTimestamps /
// getAyahTimestamps). Falls back to a flat perWordMs when a verse has no
// timestamp data, or when its timestamp count doesn't match its word count.

import type { RenderVerse, Timeline, TimelineWord } from "./Types";

export interface BuildTimelineArgs {
  verses: RenderVerse[];
  /** One entry per verse, aligned by index to `verses`. Each entry is either
   *  an array of "start-end" ms range strings (one per spoken word, already
   *  rebased to 0ms at the clip's start — see Render-Processor.ts), or null
   *  if no real timestamp data is available for that verse. */
  timestamps: (string[] | null)[];
  /** Used when a verse has no timestamp data, or its range count doesn't
   *  match its spoken word count. */
  fallbackPerWordMs: number;
}

let lastTimeline: Timeline | null = null;
let lastIndex = 0;

function dbgTime(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.debug("[TimelineBuilder]", ...args);
}

/**
 * Parse "start-end" (ms) range strings without stripping the base offset —
 * the ranges passed in are already rebased to 0ms at the clip's start by
 * Render-Processor.ts.
 */
function rangesToWordTimings(
  verseIdx: number,
  ranges: string[] | null,
  wordCount: number,
  fallbackPerWordMs: number
): { startMs: number; endMs: number }[] {
  if (!ranges || ranges.length === 0) {
    dbgTime(`verse[${verseIdx}]: ⚠ No ranges array received. Generating linear fallbacks.`);
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
    dbgTime(`verse[${verseIdx}]: ❌ All range strings failed to parse or had 0 duration.`);
    return rangesToWordTimings(verseIdx, null, wordCount, fallbackPerWordMs);
  }

  dbgTime(`verse[${verseIdx}]: Successfully parsed ${parsed.length} ranges ->`, JSON.stringify(parsed));

  if (parsed.length === wordCount) {
    dbgTime(`verse[${verseIdx}]: Count matches perfectly (${parsed.length} tokens). Using exact timestamp mappings.`);
    return parsed;
  }

  // Stretch/squeeze fallback if counts drift (e.g. word tokenization
  // doesn't line up 1:1 with audio-timestamp segmentation for this verse).
  dbgTime(`verse[${verseIdx}]: ⚠ Mismatch! Got ${parsed.length} ranges, but verse needs ${wordCount} words. Stretching timeline evenly.`);
  const totalMs = parsed[parsed.length - 1].endMs;
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
  const { verses, timestamps, fallbackPerWordMs } = args;

  dbgTime(`⚡ buildTimeline initiated — Verses to process: ${verses.length}`);

  const words: TimelineWord[] = [];
  let cursor = 0;

  for (let vi = 0; vi < verses.length; vi++) {
    const v = verses[vi];

    // Separate total visual tokens from actual spoken audio blocks — the
    // last token may be the trailing ayah-number marker glyph, which has
    // no spoken audio of its own.
    const totalWc = v.words.length;
    const spokenWc = Math.max(1, totalWc - 1);

    dbgTime(`----------------------------------------------------------------------`);
    dbgTime(`Processing verse index [${vi}] (Ayah Number: ${v.verseNumber})`);
    dbgTime(`Visual Token Count (totalWc): ${totalWc} | Expected Spoken Words (spokenWc): ${spokenWc}`);

    const ranges = timestamps[vi] ?? null;
    if (ranges) {
      dbgTime(`verse[${vi}]: real timestamps provided (${ranges.length} ranges)`);
    } else {
      dbgTime(`verse[${vi}]: no real timestamps for this verse — using linear fallback`);
    }

    const wt = rangesToWordTimings(vi, ranges, spokenWc, fallbackPerWordMs);

    for (let wi = 0; wi < totalWc; wi++) {
      // The final token (ayah-number marker) gets zero duration, pinned to
      // the end of the verse's spoken audio.
      const t = wi < spokenWc
        ? wt[wi]
        : { startMs: wt[wt.length - 1]?.endMs ?? 0, endMs: wt[wt.length - 1]?.endMs ?? 0 };

      words.push({
        verseIdx: vi,
        wordIdx: wi,
        startMs: t.startMs,
        endMs: t.endMs,
      });
    }

    const verseDur = wt[wt.length - 1]?.endMs ?? (spokenWc * fallbackPerWordMs);
    dbgTime(`Verse calculated final timeline boundary: ${verseDur}ms`);
    cursor = Math.max(cursor, verseDur);
  }

  const bodyEndMs = cursor;
  dbgTime(`======================================================================`);
  dbgTime(`🏁 buildTimeline Complete!`);
  dbgTime(`Total word timeline events generated: ${words.length}`);
  dbgTime(`Final timeline runtime (bodyEndMs): ${bodyEndMs}ms`);

  return {
    bodyStartMs: 0,
    bodyEndMs,
    totalMs: bodyEndMs,
    words,
  };
}

/** Locate the active word at time t */
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