// Fallback 1: OffscreenCanvas painter + on-screen Canvas + MediaRecorder.
// Safari / Firefox / anywhere WebCodecs isn't available.

import fixWebmDuration from "fix-webm-duration";
import { paintFrame } from "./Painter";
import type { EncodeOptions, EncodeResult, EngineTier } from "./Types";

export function isMediaRecorderSupported(): boolean {
  return typeof (window as any).MediaRecorder !== "undefined";
}

interface RunArgs extends EncodeOptions {
  tier: EngineTier;             // "mediarecorder" | "canvas"
  useOffscreen: boolean;        // false for fallback 2
}

async function run(opts: RunArgs): Promise<EncodeResult> {
  const { scene, timeline, fps, format, onProgress, shouldCancel, tier, useOffscreen } = opts;

  // Real DOM canvas is required as the capture source for captureStream().
  const out = document.createElement("canvas");
  out.width = scene.width;
  out.height = scene.height;
  const outCtx = out.getContext("2d", { alpha: false });
  if (!outCtx) throw new Error("Canvas 2D context unavailable");

  // Painter writes either to an offscreen canvas (then blitted) or directly
  // to the visible canvas — same code path either way.
  let paintCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D = outCtx;
  let scratch: OffscreenCanvas | null = null;
  if (useOffscreen && typeof OffscreenCanvas !== "undefined") {
    scratch = new OffscreenCanvas(scene.width, scene.height);
    const sctx = scratch.getContext("2d", { alpha: false });
    if (sctx) paintCtx = sctx;
  }

  const wantMp4 = format === "mp4";
  const candidates = wantMp4
    ? ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  const mime = candidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "video/webm";
  const ext: "mp4" | "webm" = mime.startsWith("video/mp4") ? "mp4" : "webm";

  const stream = out.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: opts.videoBitrate ?? 4_000_000,
  });
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
    rec.onerror = (e: any) => reject(new Error("Recorder error: " + (e?.error?.message || "unknown")));
  });

  paintFrame(paintCtx, scene, timeline, 0);
  if (scratch) outCtx.drawImage(scratch as any, 0, 0);
  videoTrack?.requestFrame?.();

  rec.start(100);

  const totalFrames = Math.max(1, Math.round((timeline.totalMs / 1000) * fps));

  const seekVideoTo = (v: HTMLVideoElement, sec: number) =>
    new Promise<void>((resolve) => {
      const target = Math.max(0, Math.min(sec, (v.duration || sec) - 0.001));
      if (Math.abs(v.currentTime - target) < 1 / fps) { resolve(); return; }
      const done = () => { v.removeEventListener("seeked", done); resolve(); };
      v.addEventListener("seeked", done, { once: true });
      try { v.currentTime = target; } catch { resolve(); }
      setTimeout(() => { v.removeEventListener("seeked", done); resolve(); }, 200);
    });

  try {
    for (let f = 0; f < totalFrames; f++) {
      if (shouldCancel?.()) break;
      const tMs = (f / fps) * 1000;

      if (tMs < timeline.introMs && scene.introVideo) {
        await seekVideoTo(scene.introVideo, tMs / 1000);
      } else if (tMs >= timeline.bodyEndMs && scene.outroVideo) {
        await seekVideoTo(scene.outroVideo, (tMs - timeline.bodyEndMs) / 1000);
      }

      paintFrame(paintCtx, scene, timeline, tMs);
      if (scratch) outCtx.drawImage(scratch as any, 0, 0);
      videoTrack?.requestFrame?.();

      if (f % 4 === 0) onProgress?.(f / totalFrames);

      if (f % fps === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    if (rec.state !== "inactive") rec.stop();
  }

  const raw = await done;
  const blob = ext === "webm"
    ? await fixWebmDuration(raw, timeline.totalMs, { logger: false }).catch(() => raw)
    : raw;
  if (!blob.size) throw new Error("Recorded video is empty");
  onProgress?.(1);
  return { blob, ext, mime: mime.split(";")[0], tier, durationMs: timeline.totalMs };
}

export function encodeWithMediaRecorder(opts: EncodeOptions): Promise<EncodeResult> {
  return run({ ...opts, tier: "mediarecorder", useOffscreen: true });
}
export function encodeWithCanvas(opts: EncodeOptions): Promise<EncodeResult> {
  return run({ ...opts, tier: "canvas", useOffscreen: false });
}