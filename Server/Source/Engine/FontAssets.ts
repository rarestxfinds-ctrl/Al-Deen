// Resolves Quran font family -> real TTF file paths, and builds a flat
// scratch directory ffmpeg/libass can scan via `fontsdir`.
//
// libass's fontsdir scan is NON-recursive, so the nested
// /Asset/Font/Quran/Uthmani/KFGQPC/V{1,2,4}/Page/TTF/{page}.ttf layout can't be
// passed to ffmpeg directly — we symlink the specific files a given render
// actually needs into one flat temp folder per job.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FONT_ASSET_ROOT =
  process.env.RENDER_FONT_ASSET_ROOT ?? path.join(__dirname, "..", "..", "assets", "Font", "Quran");

export type QuranRenderFont = "uthmani" | "indopak" | "uthmani_v1" | "uthmani_v2" | "uthmani_v4";

export function fontFamilyFor(font: QuranRenderFont, page?: number): string {
  if (font === "uthmani" && page) return "KFGQPC HAFS Uthmanic Script";
  if (font === "uthmani_v1" && page) return `QCF_P${String(page).padStart(3, "0")}`;
  if (font === "uthmani_v2" && page) return `QCF20${String(page).padStart(2, "0")}`;
  if (font === "uthmani_v4" && page) return "KFGQPC HAFS Uthmanic Script";
  if (font === "indopak") return "AlQuran IndoPak by QuranWBW";
  return "KFGQPC HAFS Uthmanic Script";
}

function ttfPathFor(font: QuranRenderFont, page?: number): string | null {
  switch (font) {
    case "uthmani_v1":
      if (!page) return null;
      return path.join(FONT_ASSET_ROOT, "Uthmani", "KFGQPC", "V1", "Page", "TTF", `${page}.ttf`);
    case "uthmani_v2":
      if (!page) return null;
      return path.join(FONT_ASSET_ROOT, "Uthmani", "KFGQPC", "V2", "Page", "TTF", `${page}.ttf`);
    case "uthmani_v4":
      return null;
    case "indopak":
      return path.join(FONT_ASSET_ROOT, "Nastaleeq-IndoPak", "TTF.ttf");
    case "uthmani":
    default:
      return path.join(FONT_ASSET_ROOT, "Uthmani", "TTF.ttf");
  }
}

export interface FontRequirement {
  font: QuranRenderFont;
  page?: number;
}

export interface StagedFonts {
  /** Flat temp dir for ffmpeg's `fontsdir` (libass rendering). */
  dir: string;
  /** family name -> real source ttf path, for LineShaper's HarfBuzz-based
   *  whole-ayah shaping (reads the file directly; doesn't need the flat
   *  symlinked dir). */
  familyPaths: Map<string, string>;
}

export async function stageFontsDir(requirements: FontRequirement[]): Promise<StagedFonts> {
  const dir = path.join(os.tmpdir(), `quran-fonts-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  const familyPaths = new Map<string, string>();
  const seen = new Set<string>();
  for (const req of requirements) {
    const family = fontFamilyFor(req.font, req.page);
    if (seen.has(family)) continue;
    seen.add(family);

    let srcPath = ttfPathFor(req.font, req.page);
    if (!srcPath) srcPath = ttfPathFor("uthmani");
    if (!srcPath) continue;

    try {
      await fs.access(srcPath);
    } catch {
      console.warn(`[fonts] Missing font file for family "${family}": ${srcPath}`);
      continue;
    }

    familyPaths.set(family, srcPath);

    const destPath = path.join(dir, path.basename(srcPath) + `-${randomUUID()}.ttf`);
    try {
      await fs.symlink(srcPath, destPath);
    } catch {
      await fs.copyFile(srcPath, destPath);
    }
  }

  return { dir, familyPaths };
}

export async function cleanupFontsDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}