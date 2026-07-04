// render-server/src/routes/renderSurah.ts
import { Router } from "express";
import multer from "multer";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { renderWithFfmpeg } from "../engine/FFmpegRender";
import { cutAudioFile } from "../engine/AudioCutter";
import type { RenderScene, Timeline } from "../engine/Types";
import { stageFontsDir, cleanupFontsDir, type FontRequirement, type QuranRenderFont } from "../engine/FontAssets";

export const renderSurahRouter = Router();

const DEBUG = process.env.RENDER_DEBUG === "1" || process.env.NODE_ENV !== "production";
function dlog(...args: any[]) {
  if (DEBUG) console.log("[render-surah]", ...args);
}

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: Infinity, fieldSize: 50 * 1024 * 1024, },
});

async function downloadToTemp(url: string, ext: string, label: string): Promise<string> {
  dlog(`downloading ${label}:`, url);
  const res = await fetch(url);
  dlog(`${label} response:`, res.status, res.headers.get("content-type"), res.headers.get("content-length"));

  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (label === "full-audio" && !contentType.includes("audio") && !contentType.includes("octet-stream")) {
    console.warn(`[render-surah] WARNING: expected audio content-type for ${label}, got "${contentType}" — likely got an HTML auth/redirect page instead of the real file`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  dlog(`${label} downloaded bytes:`, buf.length);

  if (buf.length === 0) {
    console.warn(`[render-surah] WARNING: ${label} downloaded 0 bytes from ${url}`);
  }

  // Peek at the first bytes to sanity-check it's actually binary audio, not HTML.
  const head = buf.subarray(0, 16);
  const headAscii = head.toString("utf8").replace(/[^\x20-\x7e]/g, ".");
  dlog(`${label} first 16 bytes (ascii):`, JSON.stringify(headAscii));
  if (headAscii.trim().startsWith("<") || headAscii.includes("<!DOC") || headAscii.includes("<html")) {
    console.warn(`[render-surah] WARNING: ${label} content looks like HTML, not audio — this is almost certainly a Codespaces port-auth interstitial page instead of the real mp3`);
  }
  if (label === "full-audio") {
    const isId3 = head.subarray(0, 3).toString("ascii") === "ID3";
    const isMpegSync = head[0] === 0xff && (head[1] & 0xe0) === 0xe0;
    dlog(`${label} looks like valid mp3 header?`, isId3 || isMpegSync, { isId3, isMpegSync });
  }

  const p = path.join(os.tmpdir(), `${randomUUID()}${ext}`);
  await fs.writeFile(p, buf);
  dlog(`${label} written to:`, p);
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

renderSurahRouter.post("/render-surah", upload.single("background"), async (req, res) => {
  let tempUploadPath: string | null = null;
  let fontsDir: string | null = null;
  let fullAudioPath: string | null = null;
  let cutAudioPath: string | null = null;

  try {
    const scene = JSON.parse(req.body.scene) as RenderScene;
    const timeline = JSON.parse(req.body.timeline) as Timeline;
    const fps = Number(req.body.fps) || 30;
    const backgroundVideoUrl: string | undefined = req.body.backgroundVideoUrl;

    const audioUrl: string | undefined = req.body.audioUrl;
    const audioStartMs: number | undefined = req.body.audioStartMs !== undefined ? Number(req.body.audioStartMs) : undefined;
    const audioEndMs: number | undefined = req.body.audioEndMs !== undefined ? Number(req.body.audioEndMs) : undefined;

    dlog("verses count:", Array.isArray((scene as any)?.verses) ? (scene as any).verses.length : "n/a");
    dlog("timeline keys:", timeline ? Object.keys(timeline as any) : null);
    dlog("audioUrl:", audioUrl);
    dlog("audioStartMs:", audioStartMs, "audioEndMs:", audioEndMs);
    if (audioUrl && (audioStartMs === undefined || audioEndMs === undefined)) {
      console.warn("[render-surah] audioUrl present but start/end ms missing — upstream caller didn't resolve timestamps");
    }
    if (audioStartMs !== undefined && audioEndMs !== undefined && audioEndMs <= audioStartMs) {
      console.warn(`[render-surah] WARNING: audioEndMs (${audioEndMs}) <= audioStartMs (${audioStartMs}) — cut range is empty/invalid`);
    }

    if (!scene || !timeline) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!req.file && !backgroundVideoUrl) {
      return res.status(400).json({ error: "No background provided (file upload or backgroundVideoUrl required)" });
    }
    if (audioUrl && (audioStartMs === undefined || audioEndMs === undefined || Number.isNaN(audioStartMs) || Number.isNaN(audioEndMs))) {
      return res.status(400).json({ error: "audioUrl provided without valid audioStartMs/audioEndMs" });
    }

    let bgPath: string;
    if (req.file) {
      bgPath = req.file.path;
      tempUploadPath = req.file.path;
      dlog("background from upload:", bgPath, "size:", req.file.size);
    } else {
      bgPath = await downloadToTemp(backgroundVideoUrl as string, ".mp4", "background");
    }

    let finalAudioPath: string | undefined = undefined;
    if (audioUrl && audioStartMs !== undefined && audioEndMs !== undefined) {
      fullAudioPath = await downloadToTemp(audioUrl, ".mp3", "full-audio");

      const fullStat = await fs.stat(fullAudioPath);
      dlog("full-audio file size on disk:", fullStat.size);
      if (fullStat.size === 0) {
        console.warn("[render-surah] WARNING: full-audio file is empty — getSurahAudioUrl likely returned a bad/broken URL");
      }

      cutAudioPath = path.join(os.tmpdir(), `${randomUUID()}-cut.mp3`);
      dlog(`cutting audio: [${audioStartMs}ms - ${audioEndMs}ms] -> ${cutAudioPath}`);
      await cutAudioFile(fullAudioPath, cutAudioPath, audioStartMs, audioEndMs);

      const cutStat = await fs.stat(cutAudioPath);
      dlog("cut-audio file size on disk:", cutStat.size);
      if (cutStat.size === 0) {
        console.warn("[render-surah] WARNING: cut-audio file is empty after cutAudioFile — check ms range and ffmpeg args in AudioCutter");
      }

      finalAudioPath = cutAudioPath;
    } else {
      dlog("no audio provided — rendering silent");
    }

    const staged = await stageFontsDir(collectFontRequirements(scene));
    fontsDir = staged.dir;
    dlog("staged fonts dir:", fontsDir, "families:", Object.keys(staged.familyPaths ?? {}));

    const outputPath = path.join(os.tmpdir(), `${randomUUID()}.mp4`);

    dlog("starting ffmpeg render:", {
      backgroundVideoPath: bgPath,
      audioPath: finalAudioPath,
      fps,
      outputPath,
    });

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

    dlog("render complete:", result.outputPath);

    res.setHeader("Content-Type", "video/mp4");
    const fileBuf = await fs.readFile(result.outputPath);
    dlog("sending response, bytes:", fileBuf.length);
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