// Client/Render/Engine/WebCodecs.ts
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { paintFrame } from "./Painter";
import type { EncodeOptions, EncodeResult } from "./Types";

declare const VideoEncoder: any;
declare const VideoFrame: any;

export function isWebCodecsSupported(): boolean {
  return (
    typeof (globalThis as any).VideoEncoder !== "undefined" &&
    typeof (globalThis as any).OffscreenCanvas !== "undefined"
  );
}

async function pickCodec(width: number, height: number, fps: number) {
  const tryConfigs = [
    { codec: "avc1.640028", profile: "high" },
    { codec: "avc1.4D4028", profile: "main" },
    { codec: "avc1.42E01F", profile: "baseline" },
  ];
  for (const c of tryConfigs) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: c.codec,
        width, height,
        framerate: fps,
        bitrate: 4_000_000,
        avc: { format: "avc" },
      });
      if (support?.supported) return c.codec;
    } catch { /* parse fallback next */ }
  }
  return null;
}

export async function encodeWithWebCodecs(opts: EncodeOptions): Promise<EncodeResult> {
  const { scene, timeline, fps, onProgress, shouldCancel } = opts;
  const bitrate = opts.videoBitrate ?? 4_000_000;

  const codec = await pickCodec(scene.width, scene.height, fps);
  if (!codec) throw new Error("No supported H.264 codec for this resolution");

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: "avc",
      width: scene.width,
      height: scene.height,
      frameRate: fps,
    },
    fastStart: "in-memory",
  });

  const encoder = new VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: Error) => { throw e; },
  });

  encoder.configure({
    codec,
    width: scene.width,
    height: scene.height,
    framerate: fps,
    bitrate,
    avc: { format: "avc" },
  });

  const canvas = new OffscreenCanvas(scene.width, scene.height);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("OffscreenCanvas 2D context unavailable");

  const totalFrames = Math.max(1, Math.round((timeline.totalMs / 1000) * fps));
  const frameDurUs = Math.round(1_000_000 / fps);

  // Pre-attach background compilation tracks to offscreen document fragments
  const attachVideo = (v: HTMLVideoElement | null | undefined) => {
    if (!v) return;
    if (!v.isConnected) {
      v.muted = true;
      v.playsInline = true;
      v.style.position = "fixed";
      v.style.left = "-9999px";
      v.style.top = "0";
      v.style.width = "2px";
      v.style.height = "2px";
      document.body.appendChild(v);
    }
  };
  const detachVideo = (v: HTMLVideoElement | null | undefined) => {
    if (v && v.isConnected) v.remove();
  };
  
  attachVideo(scene.introVideo);
  attachVideo(scene.outroVideo);
  if ((scene as any).bgVideo) attachVideo((scene as any).bgVideo);

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

      // Synchronize video timeline layers frame-by-frame
      if (tMs < timeline.introMs && scene.introVideo) {
        await seekVideoTo(scene.introVideo, tMs / 1000);
      } else if (tMs >= timeline.bodyEndMs && scene.outroVideo) {
        await seekVideoTo(scene.outroVideo, (tMs - timeline.bodyEndMs) / 1000);
      } else if ((scene as any).bgVideo) {
        // If a custom layout looping background video element is declared inside body
        await seekVideoTo((scene as any).bgVideo, (tMs - timeline.introMs) / 1000);
      }

      paintFrame(ctx as any, scene, timeline, tMs);

      const vf = new VideoFrame(canvas as any, {
        timestamp: f * frameDurUs,
        duration: frameDurUs,
      });
      encoder.encode(vf, { keyFrame: f % fps === 0 });
      vf.close();

      if (encoder.encodeQueueSize > fps * 2) {
        await new Promise((r) => setTimeout(r, 8));
      }
      if (f % 4 === 0) onProgress?.(f / totalFrames);
    }

    await encoder.flush();
    encoder.close();
    muxer.finalize();
  } finally {
    detachVideo(scene.introVideo);
    detachVideo(scene.outroVideo);
    if ((scene as any).bgVideo) detachVideo((scene as any).bgVideo);
  }

  onProgress?.(1);
  const buf = (muxer.target as ArrayBufferTarget).buffer;
  const blob = new Blob([buf], { type: "video/mp4" });
  if (!blob.size) throw new Error("WebCodecs produced an empty file");
  return {
    blob,
    ext: "mp4",
    mime: "video/mp4",
    tier: "webcodecs",
    durationMs: timeline.totalMs,
  };
}