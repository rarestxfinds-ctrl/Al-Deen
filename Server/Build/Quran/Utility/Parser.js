import * as fs from "fs";

export function parseRef(ref) {
  const [surah, rest] = ref.split(":");
  const [ayah, word] = rest.split(".");
  return { alSurah: Number(surah), alAyah: Number(ayah), alKalimah: Number(word) };
}

export function parsePageRange(rangeStr) {
  const [startStr, endStr] = rangeStr.split("-");
  return { start: parseRef(startStr), end: parseRef(endStr) };
}

export function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.warn(`[Warning] Error parsing JSON at: ${filePath}`);
  }
  return null;
}

export function extractVersesArray(rawSurahText) {
  if (Array.isArray(rawSurahText)) {
    return rawSurahText;
  } else if (rawSurahText && typeof rawSurahText === "object") {
    if (Array.isArray(rawSurahText.Ayah)) return rawSurahText.Ayah;
    if (Array.isArray(rawSurahText.text)) return rawSurahText.text;
    if (Array.isArray(rawSurahText.verses)) return rawSurahText.verses;

    const keys = Object.keys(rawSurahText)
      .filter((k) => !isNaN(parseInt(k)))
      .sort((a, b) => parseInt(a) - parseInt(b));
    if (keys.length > 0) {
      return keys.map((k) => rawSurahText[k]);
    }
  }
  return [];
}

export function extractVerseString(item) {
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (item && typeof item === "object") {
    if (typeof item.text === "string") return item.text;
    if (typeof item.Text === "string") return item.Text;
    if (typeof item.verse === "string") return item.verse;
    if (typeof item.translation === "string") return item.translation;
    if (typeof item.tafsir === "string") return item.tafsir;
  }
  return item ? String(item) : "";
}

export function splitIntoWords(text) {
  if (!text || typeof text !== "string") return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/);
}