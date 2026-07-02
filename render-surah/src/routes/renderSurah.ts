// render-server/src/routes/renderSurah.ts
import { Router } from "express";
import multer from "multer";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { renderWithFfmpeg } from "../engine/FFmpegRender";
import type { RenderScene, Timeline } from "../engine/Types";
import { stageFontsDir, cleanupFontsDir, type FontRequirement, type QuranRenderFont } from "../engine/FontAssets";

export const renderSurahRouter = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: Infinity },
});

async function downloadToTemp(url: string, ext: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
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
    // family strings look like "Uthmani-V2-42" or plain "Uthmani"/"IndoPak".
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
  try {
    const scene = JSON.parse(req.body.scene) as RenderScene;
    const timeline = JSON.parse(req.body.timeline) as Timeline;
    const fps = Number(req.body.fps) || 30;
    const backgroundVideoUrl: string | undefined = req.body.backgroundVideoUrl;

    if (!scene || !timeline) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!req.file && !backgroundVideoUrl) {
      return res.status(400).json({ error: "No background provided (file upload or backgroundVideoUrl required)" });
    }

    let bgPath: string;
    if (req.file) {
      bgPath = req.file.path;
      tempUploadPath = req.file.path;
    } else {
      bgPath = await downloadToTemp(backgroundVideoUrl as string, ".mp4");
    }

    fontsDir = await stageFontsDir(collectFontRequirements(scene));

    const outputPath = path.join(os.tmpdir(), `${randomUUID()}.mp4`);

    const result = await renderWithFfmpeg({
      backgroundVideoPath: bgPath,
      audioPath: undefined,
      scene,
      timeline,
      fps,
      outputPath,
      fontsDir,
      videoBitrate: "6M",
    });

    res.setHeader("Content-Type", "video/mp4");
    const fileBuf = await fs.readFile(result.outputPath);
    res.send(fileBuf);
  } catch (err: any) {
    console.error("Render failed:", err);
    res.status(500).json({ error: err.message ?? "Render failed" });
  } finally {
    if (tempUploadPath) fs.unlink(tempUploadPath).catch(() => {});
    if (fontsDir) cleanupFontsDir(fontsDir).catch(() => {});
  }
});