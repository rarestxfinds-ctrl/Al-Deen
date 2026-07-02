// Builds a .ass subtitle file from a RenderScene + Timeline.
//
// Design notes:
// - Word-level highlighting is NOT done with ASS karaoke (\k) tags — karaoke
//   fill doesn't give us the "one word swaps to highlightColor, rest stay
//   arabicColor" look we need, and it fights with RTL shaping. Instead we
//   emit one Dialogue line per word-timeslot containing the FULL verse text,
//   with inline \c override tags coloring only the active word.
// - RTL is left to libass/fribidi: word order in `words` is assumed to be
//   natural reading order, so we just join with spaces and let the shaper
//   handle bidi. No manual right-to-left cursor math (that was a canvas-only
//   concern).
// - Font switching per-ayah is done via a distinct ASS Style per unique
//   (font, size, role) combination referenced by each Dialogue line.

import type { RenderScene, RenderVerse, Timeline, TimelineWord, ScenePosition } from "./Types";

function cssColorToAssBgr(color: string, opacityOverride?: number): string {
  // Returns "&HAABBGGRR" style hex minus the leading &H (caller wraps it).
  // ASS alpha is inverted: 00 = opaque, FF = fully transparent.
  let r = 255, g = 255, b = 255, a = 0; // default opaque white
  const c = (color || "").trim().toLowerCase();

  const hex8 = c.match(/^#([0-9a-f]{8})$/);
  const hex6 = c.match(/^#([0-9a-f]{6})$/);
  const hex3 = c.match(/^#([0-9a-f]{3})$/);
  const rgbaFn = c.match(/rgba?\(([^)]+)\)/);

  if (hex8) {
    const v = hex8[1];
    r = parseInt(v.slice(0, 2), 16);
    g = parseInt(v.slice(2, 4), 16);
    b = parseInt(v.slice(4, 6), 16);
    const alpha01 = parseInt(v.slice(6, 8), 16) / 255;
    a = Math.round((1 - alpha01) * 255);
  } else if (hex6) {
    const v = hex6[1];
    r = parseInt(v.slice(0, 2), 16);
    g = parseInt(v.slice(2, 4), 16);
    b = parseInt(v.slice(4, 6), 16);
  } else if (hex3) {
    const v = hex3[1];
    r = parseInt(v[0] + v[0], 16);
    g = parseInt(v[1] + v[1], 16);
    b = parseInt(v[2] + v[2], 16);
  } else if (rgbaFn) {
    const parts = rgbaFn[1].split(",").map((p) => p.trim());
    r = Math.round(parseFloat(parts[0]) || 0);
    g = Math.round(parseFloat(parts[1]) || 0);
    b = Math.round(parseFloat(parts[2]) || 0);
    const alpha01 = parts.length === 4 ? parseFloat(parts[3]) : 1;
    a = Math.round((1 - (isNaN(alpha01) ? 1 : alpha01)) * 255);
  }

  if (opacityOverride !== undefined) {
    a = Math.round((1 - opacityOverride) * 255);
  }

  const hx = (n: number) => n.toString(16).padStart(2, "0");
  return `&H${hx(a)}${hx(b)}${hx(g)}${hx(r)}`.toUpperCase();
}

function msToAssTime(ms: number): string {
  const totalCs = Math.max(0, Math.round(ms / 10)); // centiseconds
  const h = Math.floor(totalCs / 360000);
  const m = Math.floor((totalCs % 360000) / 6000);
  const s = Math.floor((totalCs % 6000) / 100);
  const cs = totalCs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\N");
}

function alignmentFor(pos: ScenePosition | undefined): number {
  // ASS numpad alignment: 7 8 9 / 4 5 6 / 1 2 3 (top/mid/bottom x left/center/right)
  const p = pos ?? "center";
  const row = p.startsWith("top-") ? 7 : p.startsWith("bottom-") ? 1 : 4;
  const col = p.endsWith("-left") ? 0 : p.endsWith("-right") ? 2 : 1;
  return row + col;
}

function posFor(scene: RenderScene, pos: ScenePosition | undefined): { x: number; y: number } {
  const { width: W, height: H } = scene;
  const padX = Math.round(W * (scene.paddingXFrac ?? 0.06));
  const padY = Math.round(H * (scene.paddingYFrac ?? 0.08));
  const innerX = padX + Math.round((W - padX * 2) * 0.05);
  const innerW = (W - padX * 2) - Math.round((W - padX * 2) * 0.05) * 2;
  const innerY = padY + Math.round((H - padY * 2) * 0.05);
  const innerH = (H - padY * 2) - Math.round((H - padY * 2) * 0.05) * 2;

  const p = pos ?? "center";
  const y = p.startsWith("top-") ? innerY : p.startsWith("bottom-") ? innerY + innerH : innerY + Math.round(innerH / 2);
  const x = p.endsWith("-left") ? innerX : p.endsWith("-right") ? innerX + innerW : innerX + Math.round(innerW / 2);
  return { x, y };
}

interface StyleDef {
  name: string;
  fontName: string;
  fontSize: number;
  primaryColor: string; // ASS hex, unused per-run (we override inline) but required as default
  bold: boolean;
  rtl: boolean;
}

function styleKey(fontName: string, fontSize: number, tag: string): string {
  return `${tag}_${fontName.replace(/[^A-Za-z0-9]/g, "")}_${fontSize}`;
}

function buildStylesSection(styles: StyleDef[]): string {
  const header =
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, " +
    "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, " +
    "Alignment, MarginL, MarginR, MarginV, Encoding";
  const lines = styles.map((s) =>
    `Style: ${s.name},${s.fontName},${s.fontSize},${s.primaryColor},&H000000FF,&H00000000,&H80000000,` +
    `${s.bold ? -1 : 0},0,0,0,100,100,0,0,1,${Math.max(2, Math.round(s.fontSize * 0.06))},0,5,10,10,10,1`
  );
  return `[V4+ Styles]\n${header}\n${lines.join("\n")}\n`;
}

export interface AssBuildResult {
  assText: string;
}

export function buildAss(scene: RenderScene, timeline: Timeline): AssBuildResult {
  const { width, height } = scene;

  const styles = new Map<string, StyleDef>();
  const ensureStyle = (tag: string, fontName: string, fontSize: number, rtl: boolean, bold: boolean): string => {
    const key = styleKey(fontName, fontSize, tag);
    if (!styles.has(key)) {
      styles.set(key, {
        name: key,
        fontName,
        fontSize,
        primaryColor: "&H00FFFFFF",
        bold,
        rtl,
      });
    }
    return key;
  };

  const events: string[] = [];
  const wordsByVerse = new Map<number, TimelineWord[]>();
  for (const w of timeline.words) {
    if (!wordsByVerse.has(w.verseIdx)) wordsByVerse.set(w.verseIdx, []);
    wordsByVerse.get(w.verseIdx)!.push(w);
  }

  const arabicAlign = alignmentFor(scene.arabicPosition);
  const arabicPosXY = posFor(scene, scene.arabicPosition);
  const translationAlign = alignmentFor(scene.translationPosition ?? "bottom-center");
  const translationPosXY = posFor(scene, scene.translationPosition ?? "bottom-center");
  const transliterationAlign = alignmentFor(scene.transliterationPosition ?? "bottom-center");
  const transliterationPosXY = posFor(scene, scene.transliterationPosition ?? "bottom-center");

  const arabicColor = cssColorToAssBgr(scene.arabicColor);
  const highlightColor = cssColorToAssBgr(scene.highlightColor);
  const translationColor = cssColorToAssBgr(scene.translationColor);
  const transliterationColor = cssColorToAssBgr(scene.transliterationColor);

  scene.verses.forEach((verse: RenderVerse, vi: number) => {
    const vWords = (wordsByVerse.get(vi) || []).sort((a, b) => a.startMs - b.startMs);
    if (vWords.length === 0) return;

    const fontName = verse.arabicFontFamily || scene.arabicFontFamily;
    const arStyle = ensureStyle("AR", fontName, scene.arabicSize, true, false);

    // One Dialogue line per word-timeslot; each shows the whole verse with
    // only that word colored as the highlight.
    for (let wi = 0; wi < vWords.length; wi++) {
      const slot = vWords[wi];
      const runs = verse.words.map((word, idx) => {
        const color = idx === wi ? highlightColor : arabicColor;
        return `{\\c${color}}${assEscape(word)}`;
      });
      const text = `{\\an${arabicAlign}\\pos(${arabicPosXY.x},${arabicPosXY.y})}` + runs.join(" ");
      events.push(
        `Dialogue: 0,${msToAssTime(slot.startMs)},${msToAssTime(slot.endMs)},${arStyle},,0,0,0,,${text}`
      );
    }

    // Translation / transliteration span the full verse duration.
    const verseStart = vWords[0].startMs;
    const verseEnd = vWords[vWords.length - 1].endMs;

    if (verse.translation) {
      const trStyle = ensureStyle("TR", "Inter", scene.translationSize, false, false);
      const text = `{\\an${translationAlign}\\pos(${translationPosXY.x},${translationPosXY.y})\\c${translationColor}}${assEscape(verse.translation)}`;
      events.push(`Dialogue: 0,${msToAssTime(verseStart)},${msToAssTime(verseEnd)},${trStyle},,0,0,0,,${text}`);
    }

    if (verse.transliteration) {
      const tlStyle = ensureStyle("TL", "Inter", scene.transliterationSize, false, false);
      const text = `{\\an${transliterationAlign}\\pos(${transliterationPosXY.x},${transliterationPosXY.y})\\c${transliterationColor}\\i1}${assEscape(verse.transliteration)}`;
      events.push(`Dialogue: 0,${msToAssTime(verseStart)},${msToAssTime(verseEnd)},${tlStyle},,0,0,0,,${text}`);
    }
  });

  const scriptInfo =
    `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\nYCbCr Matrix: TV.601\n`;

  const stylesSection = buildStylesSection(Array.from(styles.values()));

  const eventsHeader =
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text";
  const eventsSection = `[Events]\n${eventsHeader}\n${events.join("\n")}\n`;

  const assText = `${scriptInfo}\n${stylesSection}\n${eventsSection}`;
  return { assText };
}