// Headless render engine — FFmpeg tier.
// background.mp4 + subtitles.ass + audio.mp3 --> ffmpeg --> output.mp4
//
// Runs entirely server-side via the native ffmpeg binary. No browser APIs.

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

import { buildAss } from "./AssBuilder";
import type { FfmpegRenderOptions, FfmpegRenderResult } from "./Types";

function escapeForFilter(p: string): string {
  // ffmpeg's filtergraph parser treats ':' and '\' and single quotes specially
  // inside the subtitles/ass filter's file path argument.
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function parseTimeToMs(t: string): number {
  // ffmpeg -progress emits out_time=HH:MM:SS.micro
  const m = t.match(/(\d+):(\d+):(\d+)\.(\d+)/);
  if (!m) return 0;
  const [, h, mi, s, frac] = m;
  return (
    parseInt(h, 10) * 3600000 +
    parseInt(mi, 10) * 60000 +
    parseInt(s, 10) * 1000 +
    Math.round(parseInt(frac.padEnd(6, "0").slice(0, 6), 10) / 1000)
  );
}
export async function renderWithFfmpeg(opts: FfmpegRenderOptions): Promise<FfmpegRenderResult> {
  const {
    backgroundVideoPath,
    audioPath,
    scene,
    timeline,
    fps,
    outputPath,
    fontsDir,
    videoBitrate = "6M",
    audioBitrate = "192k",
    onProgress,
    shouldCancel,
  } = opts;

  const workDir = opts.workDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), "quran-render-")));
  await fs.mkdir(workDir, { recursive: true });

  const { assText } = buildAss(scene, timeline);
  const assPath = path.join(workDir, `subtitles-${randomUUID()}.ass`);
  await fs.writeFile(assPath, assText, "utf8");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const durationSec = timeline.totalMs / 1000;
  const assFilterArg = fontsDir
    ? `ass=${escapeForFilter(assPath)}:fontsdir=${escapeForFilter(fontsDir)}`
    : `ass=${escapeForFilter(assPath)}`;

  const vf = [
    `scale=${scene.width}:${scene.height}:force_original_aspect_ratio=increase`,
    `crop=${scene.width}:${scene.height}`,
    `fps=${fps}`,
    assFilterArg,
  ].join(",");

  const hasAudio = !!audioPath;

  const args = [
    "-y",
    "-stream_loop", "-1",
    "-i", backgroundVideoPath,
    ...(hasAudio ? ["-i", audioPath as string] : []),
    "-vf", vf,
    "-map", "0:v:0",
    ...(hasAudio ? ["-map", "1:a:0"] : []),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-b:v", videoBitrate,
    "-pix_fmt", "yuv420p",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", audioBitrate] : ["-an"]),
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
      ? setInterval(() => {
          if (shouldCancel()) {
            cancelled = true;
            proc.kill("SIGKILL");
          }
        }, 500)
      : null;

    proc.stdout?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk: string) => {
      for (const line of chunk.split("\n")) {
        const m = line.match(/^out_time=(.+)$/);
        if (m) {
          const ms = parseTimeToMs(m[1]);
          onProgress?.(Math.max(0, Math.min(1, ms / timeline.totalMs)));
        }
      }
    });

    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-4000);
    });

    proc.on("error", (err) => {
      if (cancelTimer) clearInterval(cancelTimer);
      reject(new Error(`Failed to launch ffmpeg: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (cancelTimer) clearInterval(cancelTimer);
      if (cancelled) { reject(new Error("Render cancelled")); return; }
      if (code === 0) { resolve(); return; }
      reject(new Error(`ffmpeg exited with code ${code}\n${stderrTail}`));
    });
  });

  onProgress?.(1);

  const stat = await fs.stat(outputPath).catch(() => null);
  if (!stat || stat.size === 0) throw new Error("FFmpeg produced an empty or missing output file");

  return { outputPath, durationMs: timeline.totalMs, assPath };
}