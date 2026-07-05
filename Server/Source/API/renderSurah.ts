import { Router } from "express";
import multer from "multer";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

import { renderWithFfmpeg } from "../Engine/FFmpegRender.js";
import { cutAudioFile } from "../Engine/AudioCutter.js";
import { stageFontsDir, cleanupFontsDir, type FontRequirement, type QuranRenderFont } from "../Engine/FontAssets.js";
import { buildTimeline } from "../Engine/Timeline"; // 🌟 real engine, server-only
import type { RenderScene, Timeline } from "../Engine/Types.js";

export const renderSurahRouter = Router();

const DEBUG = process.env.RENDER_DEBUG === "1" || process.env.NODE_ENV !== "production";
function dlog(...args: any[]) {
  if (DEBUG) console.log("[Server]", ...args);
}

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: Infinity, fieldSize: 50 * 1024 * 1024 },
});

async function downloadToTemp(url: string, ext: string, label: string): Promise<string> {
  dlog(`downloading ${label}:`, url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    console.warn(`[Server] WARNING: ${label} downloaded 0 bytes from ${url}`);
  }

  const p = path.join(os.tmpdir(), `${randomUUID()}${ext}`);
  await fs.writeFile(p, buf);
  return p;
}

function collectFontRequirements(scene: RenderScene): FontRequirement[] {
  const reqs: FontRequirement[] = [];
  const seen = new Set<string>();

  const add = (family: string | undefined, page: number | undefined) => {
    if (!family) return;
    const key = `${family}|${page ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    const m = family.match(/^Uthmani-V([124])-(\d+)$/);
    if (m) {
      reqs.push({ font: (`uthmani_v${m[1]}` as QuranRenderFont), page: parseInt(m[2], 10) });
    } else if (family === "IndoPak") {
      reqs.push({ font: "indopak" });
    } else {
      reqs.push({ font: "uthmani" });
    }
  };

  for (const v of scene.verses as any[]) {
    add(v.arabicFontFamily ?? scene.arabicFontFamily, v.mushafPage);
  }
  if (reqs.length === 0) add(scene.arabicFontFamily, undefined);

  return reqs;
}

// 🌟 Route renamed to match client: POST /api/renderSurah
renderSurahRouter.post("/renderSurah", upload.single("background"), async (req, res) => {
  let tempUploadPath: string | null = null;
  let fontsDir: string | null = null;
  let fullAudioPath: string | null = null;
  let cutAudioPath: string | null = null;

  try {
    const scene = JSON.parse(req.body.scene) as RenderScene;
    const timestamps = JSON.parse(req.body.timestamps) as (string[] | null)[]; // 🌟 raw, not pre-built
    const fallbackPerWordMs = Number(req.body.fallbackPerWordMs) || 450;
    const fps = Number(req.body.fps) || 30;
    const backgroundVideoUrl: string | undefined = req.body.backgroundVideoUrl;

    const audioUrl: string | undefined = req.body.audioUrl;
    const audioStartMs: number | undefined = req.body.audioStartMs !== undefined ? Number(req.body.audioStartMs) : undefined;
    const audioEndMs: number | undefined = req.body.audioEndMs !== undefined ? Number(req.body.audioEndMs) : undefined;

    if (!scene || !timestamps) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!req.file && !backgroundVideoUrl) {
      return res.status(400).json({ error: "No background provided (file upload or backgroundVideoUrl required)" });
    }

    // 🌟 Build the timeline server-side now, using the real engine
    const timeline: Timeline = await buildTimeline({
      verses: scene.verses,
      timestamps,
      fallbackPerWordMs,
    });
    dlog("timeline built, keys:", Object.keys(timeline as any));

    let bgPath: string;
    if (req.file) {
      bgPath = req.file.path;
      tempUploadPath = req.file.path;
    } else {
      bgPath = await downloadToTemp(backgroundVideoUrl as string, ".mp4", "background");
    }

    let finalAudioPath: string | undefined = undefined;
    if (audioUrl && audioStartMs !== undefined && audioEndMs !== undefined) {
      fullAudioPath = await downloadToTemp(audioUrl, ".mp3", "full-audio");
      cutAudioPath = path.join(os.tmpdir(), `${randomUUID()}-cut.mp3`);
      await cutAudioFile(fullAudioPath, cutAudioPath, audioStartMs, audioEndMs);
      finalAudioPath = cutAudioPath;
    }

    const staged = await stageFontsDir(collectFontRequirements(scene));
    fontsDir = staged.dir;

    const outputPath = path.join(os.tmpdir(), `${randomUUID()}.mp4`);

    const result = await renderWithFfmpeg({
      backgroundVideoPath: bgPath,
      audioPath: finalAudioPath,
      scene,
      timeline,
      fps,
      outputPath,
      fontFamilyPaths: staged.familyPaths,
      videoBitrate: "6M",
    });

    res.setHeader("Content-Type", "video/mp4");
    const fileBuf = await fs.readFile(result.outputPath);
    res.send(fileBuf);
  } catch (err: any) {
    console.log("Render failed:", err);
    res.status(500).json({ error: err.message ?? "Render failed" });
  } finally {
    if (tempUploadPath) fs.unlink(tempUploadPath).catch(() => {});
    if (fontsDir) cleanupFontsDir(fontsDir).catch(() => {});
    if (fullAudioPath) fs.unlink(fullAudioPath).catch(() => {});
    if (cutAudioPath) fs.unlink(cutAudioPath).catch(() => {});
  }
});