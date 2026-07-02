// ====================== Types ======================
export type Corner = "tl" | "tr" | "bl" | "br";
export type RenderFont = "uthmani" | "indopak" | "uthmani_v1" | "uthmani_v2" | "uthmani_v4";
export type Position =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export const POSITIONS: { id: Position; label: string }[] = [
  { id: "top-left",      label: "Top Left" },
  { id: "top-center",    label: "Top Center" },
  { id: "top-right",     label: "Top Right" },
  { id: "center-left",   label: "Center Left" },
  { id: "center",        label: "Center" },
  { id: "center-right",  label: "Center Right" },
  { id: "bottom-left",   label: "Bottom Left" },
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right",  label: "Bottom Right" },
];

export function posClasses(p: Position): string {
  const v = p.startsWith("top-") ? "items-start" : p.startsWith("bottom-") ? "items-end" : "items-center";
  const h = p.endsWith("-left") ? "justify-start text-left"
        : p.endsWith("-right") ? "justify-end text-right"
        : "justify-center text-center";
  return `${v} ${h}`;
}

export interface Config {
  resolution: "1080p" | "720p" | "vertical";
  width: number;
  height: number;
  exportFormat: "webm" | "mp4";

  reciter: string;
  surahId: number;
  ayahStart: number;
  ayahEnd: number;

  bgKind: "color" | "image" | "video";
  bgColor: string;
  bgUrl: string;
  /** Actual File for bgUrl when it's a local blob: preview URL. Required to
   *  upload real bytes to the render server, since blob: URLs are only
   *  resolvable inside the tab that created them. */
  bgFile?: File | null;

  // Container (the inner card around the content)
  containerBgKind: "color" | "image";
  containerBg: string;
  containerBgUrl: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;

  arabicColor: string;
  translationColor: string;
  transliterationColor: string;
  highlightColor: string;
  autoContrast: boolean;

  // Positioning
  arabicPosition: Position;
  translationPosition: Position;
  transliterationPosition: Position;

  // Overlays
  showLines: boolean;
  linesCount: number;
  showWatermark: boolean;
  watermarkText: string;

  logoUrl: string;
  logoCorner: Corner;

  addIntro: boolean;
  introUrl: string;
  addOutro: boolean;
  outroUrl: string;

  // Embed-only
  audioPlayback: boolean;
  showTafsir: boolean;
  showCopy: boolean;
  showShare: boolean;
  hoverTooltip: boolean;
}

export const RECITERS = ["Mishary Rashid Alafasy", "Sa'd al-Ghamdi", "Maher al-Muaiqly"];
export const FONTS: { id: RenderFont; label: string }[] = [
  { id: "uthmani", label: "Uthmani (Hafs)" },
  { id: "indopak", label: "IndoPak" },
  { id: "uthmani_v1", label: "King Fahad Complex V1" },
  { id: "uthmani_v2", label: "King Fahad Complex V2" },
  { id: "uthmani_v4", label: "King Fahad Complex V4" },
];
export const TRANSLATIONS = ["None", "Direct", "Saheeh-International"];
export const TRANSLITERATIONS = ["None", "Standard"];
export const RESOLUTIONS: Record<Config["resolution"], { w: number; h: number; label: string }> = {
  "1080p": { w: 1920, h: 1080, label: "1080p (16:9)" },
  "720p": { w: 1280, h: 720, label: "720p (16:9)" },
  vertical: { w: 1080, h: 1920, label: "Vertical (9:16)" },
};

export function fontToType(f: RenderFont): QuranFontType {
  if (f === "uthmani_v1") return "V1";
  if (f === "uthmani_v2" || f === "uthmani_v4") return "V2";
  return "Standard";
}
export function fontClass(f: RenderFont): string {
  switch (f) {
    case "indopak":    return "font-indopak";
    case "uthmani_v1": return "font-uthmani_v1";
    case "uthmani_v2": return "font-uthmani_v2";
    case "uthmani_v4": return "font-uthmani_v4";
    default:           return "font-uthmani";
  }
}
/** Return per-page font family name (e.g. "Uthmani-V2-3") for KFC variants. */
export function pageFontFamily(font: RenderFont, surahId: number, verseNumber: number): string | undefined {
  if (font === "uthmani_v1" || font === "uthmani_v2" || font === "uthmani_v4") {
    const version = font === "uthmani_v1" ? "1" : font === "uthmani_v2" ? "2" : "4";
    // Walk pages until we find this verse's segment.
    for (let pageNum = 1; pageNum <= 604; pageNum++) {
      const segs = getPageSegments(pageNum);
      if (!segs) continue;
      const s = segs.find((x) => x.surah === surahId);
      if (s && verseNumber >= s.startVerse && verseNumber <= s.endVerse) {
        return `Uthmani-V${version}-${pageNum}`;
      }
    }
    return `Uthmani-V${version}`;
  }
  if (font === "indopak") return "IndoPak";
  return "Uthmani";
}

// ---- Color helpers ----
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const h = (x: number) => x.toString(16).padStart(2, "0");
  return `#${h(Math.round(r))}${h(Math.round(g))}${h(Math.round(b))}`;
}
function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a: string, b: string): number {
  const L1 = relLuminance(hexToRgb(a));
  const L2 = relLuminance(hexToRgb(b));
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
export function ensureReadable(color: string, bg: string, minRatio = 3.5): string {
  try {
    if (contrastRatio(color, bg) >= minRatio) return color;
    const bgLum = relLuminance(hexToRgb(bg));
    const target: [number, number, number] = bgLum > 0.5 ? [0, 0, 0] : [255, 255, 255];
    let [r, g, b] = hexToRgb(color);
    for (let t = 0.1; t <= 1; t += 0.1) {
      const nr = r + (target[0] - r) * t;
      const ng = g + (target[1] - g) * t;
      const nb = b + (target[2] - b) * t;
      const cand = rgbToHex(nr, ng, nb);
      if (contrastRatio(cand, bg) >= minRatio) return cand;
    }
    return rgbToHex(target[0], target[1], target[2]);
  } catch {
    return color;
  }
}

export interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  surahId: number;
  ayahNumber?: number;
  mode?: "render" | "embed";
}
// ====================== Embed preview (Verse-Card style) ======================
export function buildEmbedPreviewDoc(
  cfg: Config & Record<string, any>,
  verses: any[], // changed to any[] or AssembledVerse[] depending on your imports there
  cols: { arabicCol: string; translationCol: string; transliterationCol: string; highlightCol: string },
  extraTr: Record<string, string[]>,
  extraTl: Record<string, string[]>,
): string {
  const containerBg = cfg.containerBgKind === "image" && cfg.containerBgUrl
    ? `center/cover no-repeat url("${cfg.containerBgUrl}")`
    : cfg.containerBg;
  const border = `${cfg.borderWidth}px solid ${cfg.borderColor}`;

  const cardFor = (v: any): string => {
    const arabicWords = v.words.map((w: string) => `<span>${escapeHtml(w)}</span>`).join(cfg.font === "uthmani_v1" ? "" : " ");
    const actions: string[] = [];
    if (cfg.audioPlayback) actions.push(btn("▶ Play"));
    if (cfg.showTafsir)    actions.push(btn("Tafsir"));
    if (cfg.showCopy)      actions.push(btn("Copy"));
    if (cfg.showShare)     actions.push(btn("Share"));

    const trBlocks = cfg.translations.filter((t) => t !== "None").map((src) =>
      `<div class="tr" style="color:${cols.translationCol};font-size:${cfg.translationSize}px">${escapeHtml(extraTr[src]?.[v.verseNumber - 1] ?? "")}</div>`
    ).join("");
    const tlBlocks = cfg.transliterations.filter((t) => t !== "None").map((src) =>
      `<div class="tl" style="color:${cols.transliterationCol};font-size:${cfg.transliterationSize}px">${escapeHtml(extraTl[src]?.[v.verseNumber - 1] ?? "")}</div>`
    ).join("");
    const wbw = cfg.showWBW
      ? `<div class="wbw" dir="rtl">${v.words.map((w: string) => `<span>${escapeHtml(w)}</span>`).join("")}</div>`
      : "";

    return `<div class="card" style="background:${containerBg};border:${border};border-radius:${cfg.borderRadius}px">
      <div class="head"><span class="badge">${cfg.surahId}:${v.verseNumber}</span><div class="acts">${actions.join("")}</div></div>
      <div class="ar" dir="rtl" style="color:${cols.arabicCol};font-size:${cfg.arabicSize}px">${arabicWords}</div>
      ${wbw}
      ${tlBlocks}
      ${trBlocks}
    </div>`;
  };

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,sans-serif;background:transparent;padding:14px;display:flex;flex-direction:column;gap:14px}
  .card{padding:18px 20px;display:flex;flex-direction:column;gap:10px}
  .head{display:flex;justify-content:space-between;align-items:center}
  .badge{font-size:12px;color:#666;background:rgba(0,0,0,.05);padding:2px 8px;border-radius:999px}
  .acts{display:flex;gap:6px;flex-wrap:wrap}
  .ar{line-height:2;text-align:right}
  .wbw{display:flex;flex-wrap:wrap;gap:6px;font-size:12px;color:#666;justify-content:flex-end}
  .tl{font-style:italic;text-align:left}
  .tr{text-align:left;line-height:1.5}
</style></head><body>
  ${verses.map(cardFor).join("")}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function btn(label: string): string {
  return `<button style="border:1px solid #ddd;background:#fff;border-radius:999px;padding:4px 10px;font-size:12px;cursor:pointer">${label}</button>`;
}