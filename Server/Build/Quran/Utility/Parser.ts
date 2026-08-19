import * as fs from "fs";

export interface Ref {
  alSurah: number;
  alAyah: number;
  alKalimah: number;
}

export interface PageRange {
  start: Ref;
  end: Ref;
}

export function parseRef(ref: string): Ref {
  const [surah, rest] = ref.split(":");
  const [ayah, word] = rest.split(".");
  return { alSurah: Number(surah), alAyah: Number(ayah), alKalimah: Number(word) };
}

export function parsePageRange(rangeStr: string): PageRange {
  const [startStr, endStr] = rangeStr.split("-");
  return { start: parseRef(startStr), end: parseRef(endStr) };
}

export function readJsonFile<T = unknown>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
    }
  } catch (e) {
    console.warn(`[Warning] Error parsing JSON at: ${filePath}`);
  }
  return null;
}

export function extractVersesArray(rawSurahText: unknown): unknown[] {
  if (Array.isArray(rawSurahText)) {
    return rawSurahText;
  } else if (rawSurahText && typeof rawSurahText === "object") {
    const obj = rawSurahText as Record<string, unknown>;
    if (Array.isArray(obj.Ayah)) return obj.Ayah;
    if (Array.isArray(obj.text)) return obj.text;
    if (Array.isArray(obj.verses)) return obj.verses;

    const keys = Object.keys(obj)
      .filter((k) => !isNaN(parseInt(k, 10)))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (keys.length > 0) {
      return keys.map((k) => obj[k]);
    }
  }
  return [];
}

export function extractVerseString(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "number") return String(item);
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.Text === "string") return obj.Text;
    if (typeof obj.verse === "string") return obj.verse;
    if (typeof obj.translation === "string") return obj.translation;
    if (typeof obj.tafsir === "string") return obj.tafsir;
  }
  return item ? String(item) : "";
}

export function splitIntoWords(text: string | null | undefined): string[] {
  if (!text || typeof text !== "string") return [];
  const trimmed: string = text.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/);
}