#!/usr/bin/env node
/**
 * Production Script: Dynamically parses and processes the remaining 9 major Hadith collections
 * Progress Tracking Format: amountAlreadydone/#TotalThatNeedstoBeDone
 */
import fs from "node:fs/promises";
import path from "node:path";

// Array setup processing all other available collections (Bukhari removed)
const COLLECTIONS = [
  { dirName: "Muslim", prefix: "muslim", series: "Sahih" },
  { dirName: "Abu-Dawud", prefix: "abudawud", series: "Sunan" },
  { dirName: "at-Tirmidhi", prefix: "tirmidhi", series: "Jami" },
  { dirName: "an-Nasai", prefix: "nasai", series: "Sunan" },
  { dirName: "Ibn-Majah", prefix: "ibnmajah", series: "Sunan" },
  { dirName: "Muwatta-Malik", prefix: "malik", series: "Muwatta" },
  { dirName: "Al-Nawawi", prefix: "nawawi", series: "Arbain" },
  { dirName: "Hadith-Qudsi", prefix: "qudsi", series: "Qudsi" },
  { dirName: "Mishkat-al-Masabih", prefix: "dehlawi", series: "Mishkat" }
];

const LANGS = ["ar", "bn", "en", "fr", "id", "ru", "tr", "ur"];

const LANG_NAME_MAP = {
  ar: "Arabic",
  bn: "Bengali",
  en: "English",
  fr: "French",
  id: "Indonesian",
  ru: "Russian",
  tr: "Turkish",
  ur: "Urdu"
};

const BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const BASE_ROOT = path.resolve("Server/Data/Hadith");

const slug = (s) =>
  s
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// Text Scrubbers
const cleanBengali = (text) => text.replace(/^[\s\S]*?\]\s*/, "").trim();
const cleanRussian = (text) => text.replace(/\\n/g, " ").replace(/—\s+/g, "").replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
const cleanTurkish = (text) => text.replace(/(Tekrar:|Diğer Tahric:)[\s\S]*$/, "").trim();

async function fetchJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function writeDataFile(category, subFolder, series, bookDirName, chapterSlug, hNum, data) {
  const targetFolder = path.join(BASE_ROOT, category, subFolder, series, bookDirName, chapterSlug);
  await fs.mkdir(targetFolder, { recursive: true });
  await fs.writeFile(
    path.join(targetFolder, `${hNum}.json`),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

async function processCollection(book) {
  const responses = await Promise.all(
    LANGS.map((lang) => fetchJSON(`${BASE}/${lang === "ar" ? "ara" : lang === "en" ? "eng" : lang}-${book.prefix}.json`))
  );

  const dataMaps = {};
  let baseArabicEd = null;
  let baseEnglishEd = null;

  LANGS.forEach((lang, index) => {
    const res = responses[index];
    if (!res) {
      dataMaps[lang] = new Map();
      return;
    }
    if (lang === "ar") baseArabicEd = res;
    if (lang === "en") baseEnglishEd = res;
    
    dataMaps[lang] = new Map(res.hadiths.map((h) => [h.hadithnumber, h]));
  });

  if (!baseArabicEd || !baseEnglishEd) {
    return;
  }

  const chapters = new Map(
    baseEnglishEd.metadata.sections ? Object.entries(baseEnglishEd.metadata.sections) : []
  );

  const totalToProcess = baseArabicEd.hadiths.length;
  let written = 0;

  for (const h of baseArabicEd.hadiths) {
    const hNum = h.hadithnumber;
    const enH = dataMaps.en.get(hNum);
    const chapterId = String(enH?.reference?.book ?? "0");
    const chapterSlug = slug(chapters.get(chapterId) || `Chapter-${chapterId}`);

    // --- 1. Transliteration (Arabic ONLY) ---
    await writeDataFile("Transliteration", "Arabic", book.series, book.dirName, chapterSlug, hNum, "");

    // --- 2. Translation & KBK (All target languages) ---
    for (const lang of LANGS) {
      let text = (dataMaps[lang].get(hNum)?.text || "").trim();
      
      if (lang === "bn") text = cleanBengali(text);
      if (lang === "ru") text = cleanRussian(text);
      if (lang === "tr") text = cleanTurkish(text);

      const folderName = LANG_NAME_MAP[lang];

      await writeDataFile("Translation", folderName, book.series, book.dirName, chapterSlug, hNum, text);
      await writeDataFile("KBK", folderName, book.series, book.dirName, chapterSlug, hNum, "");
    }

    written++;
    console.log(`${written}/${totalToProcess}`);
  }
}

async function main() {
  for (const book of COLLECTIONS) {
    await processCollection(book);
  }
}

main().catch((e) => {
  process.exit(1);
});