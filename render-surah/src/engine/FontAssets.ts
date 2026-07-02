// Resolves Quran font family -> real TTF file paths, and builds a flat
// scratch directory ffmpeg/libass can scan via `fontsdir`.
//
// libass's fontsdir scan is NON-recursive, so the nested
// Asset/Font/Quran/Uthmani/KFGQPC/V{1,2,4}/Page/TTF/{page}.ttf layout can't be
// passed to ffmpeg directly — we symlink the specific files a given render
// actually needs into one flat temp folder per job.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";

/** Root of the mirrored Asset/Font/Quran directory on the render server's disk. */
export const FONT_ASSET_ROOT =
  process.env.RENDER_FONT_ASSET_ROOT ?? path.join(__dirname, "..", "..", "assets", "Font", "Quran");

export type QuranRenderFont = "uthmani" | "indopak" | "uthmani_v1" | "uthmani_v2" | "uthmani_v4";

/**
 * Family name to embed in the .ass Style — MUST match what buildAss/AssBuilder
 * uses as the Style's Fontname, and must match the font file's own internal
 * family name (libass matches on that, not the filename).
 */
export function fontFamilyFor(font: QuranRenderFont, page?: number): string {
  if (font === "uthmani_v1" && page) return `Uthmani-V1-${page}`;
  if (font === "uthmani_v2" && page) return `Uthmani-V2-${page}`;
  if (font === "uthmani_v4" && page) return `Uthmani-V4-${page}`;
  if (font === "indopak") return "IndoPak";
  return "Uthmani"; // plain Hafs/standard fallback (no per-page variant)
}

/** Absolute path to the real TTF file backing a given family. */
function ttfPathFor(font: QuranRenderFont, page?: number): string | null {
  switch (font) {
    case "uthmani_v1":
      if (!page) return null;
      return path.join(FONT_ASSET_ROOT, "Uthmani", "KFGQPC", "V1", "Page", "TTF", `${page}.ttf`);
    case "uthmani_v2":
      if (!page) return null;
      return path.join(FONT_ASSET_ROOT, "Uthmani", "KFGQPC", "V2", "Page", "TTF", `${page}.ttf`);
    case "uthmani_v4":
      // V4 only ships COLRv1 / OT-SVG color-font variants in this asset set:
      //   Uthmani/KFGQPC/V4/Page/COLRv1/TTF/{page}.ttf
      //   Uthmani/KFGQPC/V4/Page/OT-SVG/TTF/{page}.ttf
      // libass/ffmpeg's software rasterizer can't render color fonts, so
      // there's no usable plain outline TTF for V4 pages — caller should
      // fall back to the standard Uthmani font instead of this variant
      // until a plain-outline V4 set exists.
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

/**
 * Symlinks the exact font files a render needs into one flat temp dir and
 * returns that dir's path for use as ffmpeg's `fontsdir`.
 */
export async function stageFontsDir(requirements: FontRequirement[]): Promise<string> {
  const dir = path.join(os.tmpdir(), `quran-fonts-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  const seen = new Set<string>();
  for (const req of requirements) {
    const family = fontFamilyFor(req.font, req.page);
    if (seen.has(family)) continue;
    seen.add(family);

    let srcPath = ttfPathFor(req.font, req.page);

    // V4 has no plain TTF (color-font only) — fall back to standard Uthmani
    // so the render still shows correct glyphs rather than tofu boxes.
    if (!srcPath) srcPath = ttfPathFor("uthmani");
    if (!srcPath) continue;

    try {
      await fs.access(srcPath);
    } catch {
      console.warn(`[fonts] Missing font file for family "${family}": ${srcPath}`);
      continue;
    }

    const destPath = path.join(dir, path.basename(srcPath) + `-${randomUUID()}.ttf`);
    try {
      await fs.symlink(srcPath, destPath);
    } catch {
      // symlink can fail on some filesystems (e.g. certain Docker/Windows
      // mounts) — fall back to a real copy.
      await fs.copyFile(srcPath, destPath);
    }
  }

  return dir;
}

export async function cleanupFontsDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}