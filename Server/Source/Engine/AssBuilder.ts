import type { RenderScene, RenderVerse, Timeline, TimelineWord, ScenePosition } from "./Types.js";

function dbg(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.debug("[AssBuilder]", ...args);
}

function cssColorToAssBgr(color: string, opacityOverride?: number): string {
  let r = 255, g = 255, b = 255, a = 0; 
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
  const totalCs = Math.max(0, Math.round(ms / 10)); 
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
  primaryColor: string;
  secondaryColor: string;
  bold: boolean;
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
    `Style: ${s.name},${s.fontName},${s.fontSize},${s.primaryColor},${s.secondaryColor},&H00000000,&H80000000,` +
    `${s.bold ? -1 : 0},0,0,0,100,100,0,0,1,0,0,5,10,10,10,1`
  );
  return `[V4+ Styles]\n${header}\n${lines.join("\n")}\n`;
}

export interface AssBuildResult {
  assText: string;
}

export async function buildAss(
  scene: RenderScene,
  timeline: Timeline,
  fontFamilyPaths?: Map<string, string>,
): Promise<AssBuildResult> {
  const { width, height } = scene;

  dbg(`buildAss: running in standard native engine timeline mode — verses=${scene.verses.length}`);

  const styles = new Map<string, StyleDef>();
  
  const arabicColor = cssColorToAssBgr(scene.arabicColor);
  const highlightColor = cssColorToAssBgr(scene.highlightColor);
  const translationColor = cssColorToAssBgr(scene.translationColor);
  const transliterationColor = cssColorToAssBgr(scene.transliterationColor);

  const ensureStyle = (tag: string, fontName: string, fontSize: number, bold: boolean): string => {
    const key = styleKey(fontName, fontSize, tag);
    if (!styles.has(key)) {
      styles.set(key, { 
        name: key, 
        fontName, 
        fontSize, 
        primaryColor: arabicColor,      // Unhighlighted color base
        secondaryColor: highlightColor,  // Karaoke active highlighted state color
        bold 
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

  const arabicAlign = alignmentFor(scene.arabicPosition ?? "center");
  const arabicPosXY = posFor(scene, scene.arabicPosition ?? "center");
  const translationAlign = alignmentFor(scene.translationPosition ?? "bottom-center");
  const translationPosXY = posFor(scene, scene.translationPosition ?? "bottom-center");
  const transliterationAlign = alignmentFor(scene.transliterationPosition ?? "bottom-center");
  const transliterationPosXY = posFor(scene, scene.transliterationPosition ?? "bottom-center");

  for (let vi = 0; vi < scene.verses.length; vi++) {
    const verse: RenderVerse = scene.verses[vi];
    const vWords = (wordsByVerse.get(vi) || []).sort((a, b) => a.startMs - b.startMs);

    if (vWords.length === 0) continue;

    const fontName = verse.arabicFontFamily || scene.arabicFontFamily;
    const arStyle = ensureStyle("AR", fontName, scene.arabicSize, false);

    const spokenWordsCount = vWords.filter(w => w.startMs !== w.endMs).length;
    const verseStart = vWords[0]?.startMs ?? 0;
    const verseEnd = vWords[spokenWordsCount - 1]?.endMs ?? 5840;

    // ---------------------------------------------------------------------------
    // BUILD CONTINUOUS KARAOKE HIGHLIGHT TIMELINES
    // ---------------------------------------------------------------------------
    let karaokeBodyText = "";
    
    for (let currentWordIdx = 0; currentWordIdx < verse.words.length; currentWordIdx++) {
      const wordText = verse.words[currentWordIdx];
      
      // If it's the decorative final Ayah number marker glyph
      if (currentWordIdx === verse.words.length - 1) {
        // Render it persistently as unhighlighted base color text by giving it zero timing weight
        karaokeBodyText += `{\\k0}${assEscape(wordText)}`;
        continue;
      }

      const activeSlot = vWords[currentWordIdx];
      if (!activeSlot) {
        karaokeBodyText += `{\\k0}${assEscape(wordText)} `;
        continue;
      }

      // ASS Karaoke tags use centiseconds (1cs = 10ms)
      const durationMs = activeSlot.endMs - activeSlot.startMs;
      const durationCs = Math.max(1, Math.round(durationMs / 10));

      // Append standard space tracking separators between internal words
      const trailingSpace = (currentWordIdx < verse.words.length - 2) ? " " : "";
      
      karaokeBodyText += `{\\k${durationCs}}${assEscape(wordText)}${trailingSpace}`;
    }

    // Output the entire combined Arabic dialogue row in one clean line string configuration
    const fullArabicLine = `{\\an${arabicAlign}\\pos(${arabicPosXY.x},${arabicPosXY.y})}${karaokeBodyText}`;
    events.push(`Dialogue: 0,${msToAssTime(verseStart)},${msToAssTime(verseEnd)},${arStyle},,0,0,0,,${fullArabicLine}`);

    // Translation / Transliteration Layout Blocks
    if (verse.translation) {
      const trStyle = ensureStyle("TR", "Inter", scene.translationSize, false);
      styles.get(trStyle)!.primaryColor = translationColor; // Keep standard single track coloring mapping
      const text = `{\\an${translationAlign}\\pos(${translationPosXY.x},${translationPosXY.y})}${assEscape(verse.translation)}`;
      events.push(`Dialogue: 0,${msToAssTime(verseStart)},${msToAssTime(verseEnd)},${trStyle},,0,0,0,,${text}`);
    }

    if (verse.transliteration) {
      const tlStyle = ensureStyle("TL", "Inter", scene.transliterationSize, false);
      styles.get(tlStyle)!.primaryColor = transliterationColor;
      const text = `{\\an${transliterationAlign}\\pos(${transliterationPosXY.x},${transliterationPosXY.y})\\i1}${assEscape(verse.transliteration)}`;
      events.push(`Dialogue: 0,${msToAssTime(verseStart)},${msToAssTime(verseEnd)},${tlStyle},,0,0,0,,${text}`);
    }
  }

  const scriptInfo = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\nYCbCr Matrix: TV.601\n`;
  const stylesSection = buildStylesSection(Array.from(styles.values()));
  const eventsSection = `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join("\n")}\n`;

  return { assText: `${scriptInfo}\n${stylesSection}\n${eventsSection}` };
}