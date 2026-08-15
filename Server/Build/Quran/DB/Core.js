import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import {
  CORPUS_QURAN_OUTPUT_DIR,
  QURAN_DIR,
  META_DIR,
  SURAH_DIR,
  PRESENTATION_V1_DIR,
  PRESENTATION_V2_DIR,
} from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import {
  readJsonFile,
  parsePageRange,
  extractVersesArray,
  extractVerseString,
  splitIntoWords,
} from "../Utility/Parser.js";

function parseRangeString(rangeStr) {
  if (typeof rangeStr !== "string") return null;

  const parts = rangeStr.trim().split("-");
  if (parts.length !== 2) return null;

  const parseEndpoint = (endpoint) => {
    const [surahStr, verseWordStr] = endpoint.split(":");
    if (!surahStr || !verseWordStr) return null;

    const [ayahStr, wordStr] = verseWordStr.split(".");
    if (!ayahStr) return null;

    return {
      surah: parseInt(surahStr, 10),
      ayah: parseInt(ayahStr, 10),
      word: wordStr ? parseInt(wordStr, 10) : 1,
    };
  };

  const start = parseEndpoint(parts[0]);
  const end = parseEndpoint(parts[1]);

  if (!start || !end) return null;

  return {
    startSurah: start.surah,
    startAyah: start.ayah,
    startKalimah: start.word,
    endSurah: end.surah,
    endAyah: end.ayah,
    endKalimah: end.word,
  };
}

export function buildCoreDatabase() {
  if (!fs.existsSync(CORPUS_QURAN_OUTPUT_DIR)) {
    fs.mkdirSync(CORPUS_QURAN_OUTPUT_DIR, { recursive: true });
  }

  const coreDbFile = path.join(CORPUS_QURAN_OUTPUT_DIR, "Core.db");

  if (!shouldRebuildDb(coreDbFile, QURAN_DIR)) {
    console.log(`[Skipped] Core.db is up to date.`);
    return;
  }

  if (fs.existsSync(coreDbFile)) fs.unlinkSync(coreDbFile);

  console.log(`Building Core Database at: ${coreDbFile}`);
  const db = new Database(coreDbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS Al_Safhah (
      Al_Safhah INTEGER PRIMARY KEY,
      Start_Al_Surah INTEGER NOT NULL,
      Start_Al_Ayah INTEGER NOT NULL,
      Start_Al_Kalimah INTEGER NOT NULL,
      End_Al_Surah INTEGER NOT NULL,
      End_Al_Ayah INTEGER NOT NULL,
      End_Al_Kalimah INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Al_Juz (
      Al_Juz INTEGER PRIMARY KEY,
      Start_Al_Surah INTEGER NOT NULL,
      Start_Al_Ayah INTEGER NOT NULL,
      End_Al_Surah INTEGER NOT NULL,
      End_Al_Ayah INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Al_Hizb (
      Al_Hizb INTEGER PRIMARY KEY,
      Start_Al_Surah INTEGER NOT NULL,
      Start_Al_Ayah INTEGER NOT NULL,
      End_Al_Surah INTEGER NOT NULL,
      End_Al_Ayah INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Al_Surah (
      Al_Surah INTEGER PRIMARY KEY,
      Arabic TEXT NOT NULL,
      Translation TEXT NOT NULL,
      Transliteration TEXT NOT NULL,
      Revelation_Place TEXT,
      Revelation_Order INTEGER,
      Al_Ayah_Count INTEGER,
      Start_Al_Safhah INTEGER,
      End_Al_Safhah INTEGER,
      IndoPak_Marker TEXT,
      Layout TEXT
    );

    CREATE TABLE IF NOT EXISTS Al_Ayah (
      Al_Surah INTEGER NOT NULL,
      Al_Ayah INTEGER NOT NULL,
      Arabic TEXT NOT NULL,
      Arabic_V1 TEXT,
      Arabic_V2 TEXT,
      PRIMARY KEY (Al_Surah, Al_Ayah),
      FOREIGN KEY (Al_Surah) REFERENCES Al_Surah(Al_Surah)
    );

    CREATE TABLE IF NOT EXISTS Al_Kalimah (
      Al_Surah INTEGER NOT NULL,
      Al_Ayah INTEGER NOT NULL,
      Al_Kalimah INTEGER NOT NULL,
      Arabic TEXT NOT NULL,
      Arabic_V1 TEXT,
      Arabic_V2 TEXT,
      PRIMARY KEY (Al_Surah, Al_Ayah, Al_Kalimah),
      FOREIGN KEY (Al_Surah, Al_Ayah) REFERENCES Al_Ayah(Al_Surah, Al_Ayah)
    );
  `);

  const alSafhahRanges = readJsonFile(path.join(META_DIR, "Page.json")) || [];
  const parsedAlSafhah = alSafhahRanges.map((r, i) => ({ safhah: i + 1, ...parsePageRange(r) }));

  const alHizbData = readJsonFile(path.join(META_DIR, "Hizb.json")) || [];
  const alJuzData = readJsonFile(path.join(META_DIR, "Juz.json")) || [];

  const insertAlSafhah = db.prepare(`
    INSERT INTO Al_Safhah (Al_Safhah, Start_Al_Surah, Start_Al_Ayah, Start_Al_Kalimah, End_Al_Surah, End_Al_Ayah, End_Al_Kalimah)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAlJuz = db.prepare(`
    INSERT INTO Al_Juz (Al_Juz, Start_Al_Surah, Start_Al_Ayah, End_Al_Surah, End_Al_Ayah)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAlHizb = db.prepare(`
    INSERT INTO Al_Hizb (Al_Hizb, Start_Al_Surah, Start_Al_Ayah, End_Al_Surah, End_Al_Ayah)
    VALUES (?, ?, ?, ?, ?)
  `);

  function safhahRangeForAlSurah(surahId) {
    let first = null, last = null;
    for (const s of parsedAlSafhah) {
      if (s.start.alSurah <= surahId && surahId <= s.end.alSurah) {
        if (first === null) first = s.safhah;
        last = s.safhah;
      }
    }
    return [first, last];
  }

  const alAyahCounts = readJsonFile(path.join(META_DIR, "Surah", "Ayah.json")) || readJsonFile(path.join(META_DIR, "Surah", "Ayahs.json")) || [];
  const translations = readJsonFile(path.join(META_DIR, "Surah", "Translation.json")) || [];
  const transliterations = readJsonFile(path.join(META_DIR, "Surah", "Transliteration.json")) || [];
  const arabicNames = readJsonFile(path.join(META_DIR, "Surah", "Arabic.json")) || [];
  const places = readJsonFile(path.join(META_DIR, "Surah", "Place.json")) || readJsonFile(path.join(META_DIR, "Revelation", "Place.json")) || [];
  const orders = readJsonFile(path.join(META_DIR, "Surah", "Order.json")) || readJsonFile(path.join(META_DIR, "Revelation", "Order.json")) || [];
  const indoPakMarkers = readJsonFile(path.join(META_DIR, "Indo-Pak-Verse-Markers.json")) || [];

  const insertAlSurah = db.prepare(`
    INSERT INTO Al_Surah (
      Al_Surah, Arabic, Translation, Transliteration, Revelation_Place, Revelation_Order,
      Al_Ayah_Count, Start_Al_Safhah, End_Al_Safhah, IndoPak_Marker, Layout
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAlAyah = db.prepare(`
    INSERT INTO Al_Ayah (Al_Surah, Al_Ayah, Arabic, Arabic_V1, Arabic_V2)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAlKalimah = db.prepare(`
    INSERT INTO Al_Kalimah (Al_Surah, Al_Ayah, Al_Kalimah, Arabic, Arabic_V1, Arabic_V2)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let totalAlAyahCount = 0;
  let totalAlKalimahCount = 0;

  const transaction = db.transaction(() => {
    parsedAlSafhah.forEach((s) => {
      insertAlSafhah.run(s.safhah, s.start.alSurah, s.start.alAyah, s.start.alKalimah, s.end.alSurah, s.end.alAyah, s.end.alKalimah);
    });

    const extractRange = (item) => {
      if (typeof item === "string") {
        return parseRangeString(item);
      }
      if (!item || typeof item !== "object") return null;

      const startSurah = item.Start_Al_Surah ?? item.start_surah ?? item.startSurah ?? item.start?.alSurah ?? item.start?.surah;
      const startAyah = item.Start_Al_Ayah ?? item.start_ayah ?? item.startAyah ?? item.start?.alAyah ?? item.start?.ayah;
      const endSurah = item.End_Al_Surah ?? item.end_surah ?? item.endSurah ?? item.end?.alSurah ?? item.end?.surah;
      const endAyah = item.End_Al_Ayah ?? item.end_ayah ?? item.endAyah ?? item.end?.alAyah ?? item.end?.ayah;

      if (startSurah != null && startAyah != null && endSurah != null && endAyah != null) {
        return { startSurah, startAyah, endSurah, endAyah };
      }
      return null;
    };

    if (Array.isArray(alJuzData)) {
      let juzIndex = 1;
      alJuzData.forEach((juz) => {
        const parsed = extractRange(juz);
        if (parsed) {
          insertAlJuz.run(juzIndex++, parsed.startSurah, parsed.startAyah, parsed.endSurah, parsed.endAyah);
        }
      });
    }

    if (Array.isArray(alHizbData)) {
      let hizbIndex = 1;
      alHizbData.forEach((hizb) => {
        const parsed = extractRange(hizb);
        if (parsed) {
          insertAlHizb.run(hizbIndex++, parsed.startSurah, parsed.startAyah, parsed.endSurah, parsed.endAyah);
        }
      });
    }

    for (let idx = 0; idx < 114; idx++) {
      const id = idx + 1;

      let surahFile = path.join(SURAH_DIR, `${id}.json`);
      let rawSurahText = readJsonFile(surahFile);

      if (!rawSurahText) {
        surahFile = path.join(PRESENTATION_V2_DIR, `${id}.json`);
        rawSurahText = readJsonFile(surahFile);
      }

      const versesText = extractVersesArray(rawSurahText);

      const rawSurahTextV2 = readJsonFile(path.join(PRESENTATION_V2_DIR, `${id}.json`));
      const versesTextV2 = extractVersesArray(rawSurahTextV2);

      const rawSurahTextV1 = readJsonFile(path.join(PRESENTATION_V1_DIR, `${id}.json`));
      const versesTextV1 = extractVersesArray(rawSurahTextV1);

      const layoutData = readJsonFile(path.join(SURAH_DIR, "Layout", `${id}.json`));
      const [safhahStart, safhahEnd] = safhahRangeForAlSurah(id);

      insertAlSurah.run(
        id,
        arabicNames[idx] ?? "",
        translations[idx] ?? "",
        transliterations[idx] ?? "",
        places[idx] ?? "",
        orders[idx] ?? null,
        alAyahCounts[idx] ?? versesText.length,
        safhahStart,
        safhahEnd,
        JSON.stringify(indoPakMarkers[idx] || []),
        layoutData ? JSON.stringify(layoutData) : null
      );

      versesText.forEach((rawVerse, vIdx) => {
        const ayahNumber = vIdx + 1;
        const arabicText = extractVerseString(rawVerse);
        const arabicV1 = extractVerseString(versesTextV1[vIdx]);
        const arabicV2 = extractVerseString(versesTextV2[vIdx]);

        insertAlAyah.run(
          id,
          ayahNumber,
          arabicText,
          arabicV1 || null,
          arabicV2 || null
        );
        totalAlAyahCount++;

        const kalimahArabic = splitIntoWords(arabicText);

        const parseGlyphs = (rawVerseEntry, textStr, targetLength) => {
          if (Array.isArray(rawVerseEntry) && rawVerseEntry.length === targetLength) {
            return rawVerseEntry.map(String);
          }
          const words = splitIntoWords(textStr);
          if (words.length === targetLength) return words;

          const chars = Array.from(textStr || "");
          if (chars.length === targetLength) return chars;

          return words;
        };

        const kalimahV1 = parseGlyphs(versesTextV1[vIdx], arabicV1, kalimahArabic.length);
        const kalimahV2 = parseGlyphs(versesTextV2[vIdx], arabicV2, kalimahArabic.length);

        const maxKalimah = kalimahArabic.length;

        for (let kIdx = 0; kIdx < maxKalimah; kIdx++) {
          const kalimahPosition = kIdx + 1;
          const kArabic = kalimahArabic[kIdx] || "";
          const kArabicV1 = kalimahV1[kIdx] !== undefined ? String(kalimahV1[kIdx]) : null;
          const kArabicV2 = kalimahV2[kIdx] !== undefined ? String(kalimahV2[kIdx]) : null;

          insertAlKalimah.run(
            id,
            ayahNumber,
            kalimahPosition,
            kArabic,
            kArabicV1,
            kArabicV2
          );
          totalAlKalimahCount++;
        }
      });
    }
  });

  transaction();
  db.close();
  console.log(`Core.db built successfully: ${parsedAlSafhah.length} Al_Safhah, ${totalAlAyahCount} Al_Ayah entries, ${totalAlKalimahCount} Al_Kalimah entries.`);
}