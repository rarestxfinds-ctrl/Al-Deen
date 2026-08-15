import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); 

const META_DIR = path.join(ROOT, "Data", "Quran", "Meta");
const SURAH_DIR = path.join(ROOT, "Data", "Quran", "Surah");
const PRESENTATION_V2_DIR = path.join(SURAH_DIR, "Presentation-Form", "A"); // v2
const PRESENTATION_V1_DIR = path.join(SURAH_DIR, "Presentation-Form", "B"); // v1
const OUTPUT_FILE = path.resolve(ROOT, "..", "Server", "Corpus", "Quran.json");

function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    // Silent catch for stable build streams
  }
  return null;
}

function extractVersesArray(rawSurahText) {
  if (Array.isArray(rawSurahText)) {
    return rawSurahText;
  } else if (rawSurahText && typeof rawSurahText === 'object' && Array.isArray(rawSurahText.Ayah)) {
    return rawSurahText.Ayah;
  }
  return [];
}

function splitMergedTextByReference(referenceWords, mergedText) {
  if (!mergedText || typeof mergedText !== "string") return null;
  if (!referenceWords || referenceWords.length === 0) return [mergedText];

  const mergedChars = Array.from(mergedText);
  const totalMergedLen = mergedChars.length;
  const totalRefLen = referenceWords.reduce((sum, w) => sum + Array.from(w).length, 0);

  if (totalRefLen === 0) return [mergedText];

  const result = [];
  let idx = 0;
  let used = 0;

  for (let i = 0; i < referenceWords.length; i++) {
    const isLast = i === referenceWords.length - 1;
    let count;

    if (isLast) {
      count = totalMergedLen - used;
    } else {
      const refLen = Array.from(referenceWords[i]).length;
      count = Math.round((refLen / totalRefLen) * totalMergedLen);
      count = Math.max(1, count);
      count = Math.min(count, totalMergedLen - used - (referenceWords.length - i - 1));
    }

    result.push(mergedChars.slice(idx, idx + count).join(""));
    idx += count;
    used += count;
  }

  return result;
}

function buildQuranCorpus() {
  const ayahs = readJsonFile(path.join(META_DIR, "Ayahs.json")) || [];
  const translations = readJsonFile(path.join(META_DIR, "Surah", "Translation.json")) || [];
  const transliterations = readJsonFile(path.join(META_DIR, "Surah", "Transliteration.json")) || [];
  const places = readJsonFile(path.join(META_DIR, "Revelation", "Place.json")) || [];
  const orders = readJsonFile(path.join(META_DIR, "Revelation", "Order.json")) || [];
  const pageMap = readJsonFile(path.join(META_DIR, "Page.json")) || [];
  // 🌟 Indo-Pak verse marker metadata (assumed: array indexed by surah, each an array of per-verse marker values)
  const indoPakMarkers = readJsonFile(path.join(META_DIR, "Indo-Pak-Verse-Markers.json")) || [];

  const compiledSurahs = [];
  const surahPageBounds = new Map();

  if (Array.isArray(pageMap)) {
    pageMap.forEach((pageData, index) => {
      const pageNum = index + 1;
      if (!pageData || typeof pageData !== "string") return;

      const segments = pageData.split('|');
      for (const segment of segments) {
        const [start] = segment.split('-');
        if (!start) continue;
        const [surahVerse] = start.split('.');
        const [surahIdStr] = surahVerse.split(':');
        const surahId = parseInt(surahIdStr, 10);

        if (!isNaN(surahId)) {
          if (!surahPageBounds.has(surahId)) {
            surahPageBounds.set(surahId, { min: pageNum, max: pageNum });
          } else {
            const current = surahPageBounds.get(surahId);
            surahPageBounds.set(surahId, {
              min: Math.min(current.min, pageNum),
              max: Math.max(current.max, pageNum),
            });
          }
        }
      }
    });
  }

  for (let idx = 0; idx < 114; idx++) {
    const id = idx + 1;
    const ayahCount = ayahs[idx] || 0;
    const bounds = surahPageBounds.get(id) || { min: 1, max: 604 };

    const rawSurahText = readJsonFile(path.join(SURAH_DIR, `${id}.json`));
    const versesText = extractVersesArray(rawSurahText);

    const rawSurahTextV2 = readJsonFile(path.join(PRESENTATION_V2_DIR, `${id}.json`));
    const versesTextV2 = extractVersesArray(rawSurahTextV2);

    const rawSurahTextV1 = readJsonFile(path.join(PRESENTATION_V1_DIR, `${id}.json`));
    const versesTextV1 = extractVersesArray(rawSurahTextV1);

    const layoutData = readJsonFile(path.join(SURAH_DIR, "Layout", `${id}.json`)) || null;

    // 🌟 per-surah marker array (assumed shape: array of values, one per verse)
    const surahIndoPakMarkers = Array.isArray(indoPakMarkers[idx]) ? indoPakMarkers[idx] : [];

    compiledSurahs.push({
      id,
      name: "",
      surahFontName: id.toString().padStart(3, '0'),
      englishNameTransliteration: transliterations[idx] || "",
      englishNameTranslation: translations[idx] || "",
      numberOfAyahs: ayahCount,
      revelationType: places[idx] || "Meccan",
      revelationOrder: orders[idx] || id,
      pages: [bounds.min, bounds.max],
      verses: versesText.map((arabic, vIdx) => {
        const words = arabic.split(" ");
        const arabicV1 = versesTextV1[vIdx] ?? null;
        const arabicV2 = versesTextV2[vIdx] ?? null;
        return {
          verseNumber: vIdx + 1,
          arabic,
          words,
          arabicV1,
          wordsV1: arabicV1 ? splitMergedTextByReference(words, arabicV1) : null,
          arabicV2,
          wordsV2: arabicV2 ? arabicV2.split(" ") : null,
          indoPakMarker: surahIndoPakMarkers[vIdx] ?? null, // 🌟 new
        };
      }),
      lines: layoutData
    });
  }

  const corpusPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalSurahs: compiledSurahs.length,
      totalAyahs: ayahs.reduce((a, b) => a + b, 0)
    },
    surahs: compiledSurahs
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(corpusPayload, null, 2), "utf-8");
  console.log(`Quran Corpus successfully precompiled to: ${OUTPUT_FILE}`);
}

buildQuranCorpus();