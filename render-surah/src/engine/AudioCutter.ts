// Cuts an arbitrary [startMs, endMs) range out of an audio file with ffmpeg.
// Lives in render-server (Node-only) — NOT in Server/API/Quran.ts, which is
// bundled into the client via Vite and can't contain node:fs/child_process.

import { spawn } from "node:child_process";

export function cutAudioFile(
  inputPath: string,
  outputPath: string,
  startMs: number,
  endMs: number,
): Promise<void> {
  const startSec = (startMs / 1000).toFixed(3);
  const durSec = ((endMs - startMs) / 1000).toFixed(3);

  // -ss AFTER -i (not before) trades a bit of seek speed for sample-accurate
  // cutting. MP3 has no keyframes, so a pre-input -ss can drift by a whole
  // MP3 frame (~26ms) — audible/visible against word-level highlight timing
  // that's accurate to single-digit ms. Re-encoding (not -c copy) is
  // required for the same reason: stream copy can only cut on frame
  // boundaries.
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
      else reject(new Error(`ffmpeg audio cut failed (code ${code})\n${stderrTail}`));
    });
  });
}