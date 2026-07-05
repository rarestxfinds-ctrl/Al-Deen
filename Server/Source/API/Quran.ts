import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AssembledVerse {
  verseNumber: number;
  arabic: string;
  words: string[];
  arabicV1?: string | null;
  wordsV1?: string[] | null;
  arabicV2?: string | null;
  wordsV2?: string[] | null;
  indoPakMarker?: string | number | null; // 🌟 new
}

export interface AssembledSurah {
  id: number;
  name: string;
  surahFontName: string;
  englishNameTransliteration: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
  revelationOrder: number;
  pages: [number, number];
  verses: AssembledVerse[];
  lines?: string[][];
}

let cachedQuranCorpus: {
  metadata: any;
  surahs: AssembledSurah[];
} | null = null;

export async function getQuranCorpus() {
  if (cachedQuranCorpus) {
    return cachedQuranCorpus;
  }

  try {
    const filePath = path.resolve(__dirname, "..", "..", "Asset", "Corpus", "Quran.json");
    const rawData = await fs.readFile(filePath, "utf-8");
    cachedQuranCorpus = JSON.parse(rawData);
    return cachedQuranCorpus;
  } catch (error) {
    console.error("Error loading Quran asset database from disk storage:", error);
    throw new Error("Failed to load precompiled Quran corpus pipeline.");
  }
}

export async function getServerSurahMeta(surahId: number): Promise<AssembledSurah | null> {
  const corpus = await getQuranCorpus();
  return corpus?.surahs.find((s) => s.id === surahId) ?? null;
}