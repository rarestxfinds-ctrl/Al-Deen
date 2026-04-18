// Top/Utility/Quran/Normalize-Arabic.ts
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F]/g, "")      // remove tashkeel
    .replace(/ٰ/g, "")                    // remove superscript alif (U+0670)
    .replace(/\s+/g, " ")
    .trim();
}