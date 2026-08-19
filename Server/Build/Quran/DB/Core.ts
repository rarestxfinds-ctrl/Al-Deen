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

interface Endpoint {
  surah: number;
  ayah: number;
  word: number;
}

interface FullRangeResult {
  startSurah: number;
  startAyah: number;
  startKalimah: number;
  endSurah: number;
  endAyah: number;
  endKalimah: number;
}

interface BasicRangeResult {
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

interface ParsedPage {
  page: number;
  start?: { alSurah?: number; surah?: number; alAyah?: number; ayah?: number; alKalimah?: number; word?: number };
  end?: { alSurah?: number; surah?: number; alAyah?: number; ayah?: number; alKalimah?: number; word?: number };
}

function parseRangeString(rangeStr: unknown): FullRangeResult | null {
  if (typeof rangeStr !== "string") return null;

  const parts = rangeStr.trim().split("-");
  if (parts.length !== 2) return null;

  const parseEndpoint = (endpoint: string): Endpoint | null => {
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

export function buildCoreDatabase(): void {
  if (!fs.existsSync(CORPUS_QURAN_OUTPUT_DIR)) {
    fs.mkdirSync(CORPUS_QURAN_OUTPUT_DIR, { recursive: true });
  }

  const coreDbFile: string = path.join(CORPUS_QURAN_OUTPUT_DIR, "Core.db");

  if (!shouldRebuildDb(coreDbFile, QURAN_DIR)) {
    console.log(`[Skipped] Core.db is up to date.`);
    return;
  }

  if (fs.existsSync(coreDbFile)) fs.unlinkSync(coreDbFile);

  console.log(`Building Core Database at: ${coreDbFile}`);
  const db: Database.Database = new Database(coreDbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS Page (
      Page INTEGER PRIMARY KEY,
      Start_Surah INTEGER NOT NULL,
      Start_Ayah INTEGER NOT NULL,
      Start_Kalimah INTEGER NOT NULL,
      End_Surah INTEGER NOT NULL,
      End_Ayah INTEGER NOT NULL,
      End_Kalimah INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Juz (
      Juz INTEGER PRIMARY KEY,
      Start_Surah INTEGER NOT NULL,
      Start_Ayah INTEGER NOT NULL,
      End_Surah INTEGER NOT NULL,
      End_Ayah INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Hizb (
      Hizb INTEGER PRIMARY KEY,
      Start_Surah INTEGER NOT NULL,
      Start_Ayah INTEGER NOT NULL,
      End_Surah INTEGER NOT NULL,
      End_Ayah INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Surah (
      Surah INTEGER PRIMARY KEY,
      Arabic TEXT NOT NULL,
      Translation TEXT NOT NULL,
      Transliteration TEXT NOT NULL,
      Revelation_Place TEXT,
      Revelation_Order INTEGER,
      Ayah_Count INTEGER,
      Start_Page INTEGER,
      End_Page INTEGER,
      Indo_Pak_Ayah_Ending TEXT,
      Layout TEXT
    );

    CREATE TABLE IF NOT EXISTS Ayah (
      Surah INTEGER NOT NULL,
      Ayah INTEGER NOT NULL,
      Arabic TEXT NOT NULL,
      Presentation_Form_A_Ligature_Based TEXT,
      Presentation_Form_A_Glyph_Based TEXT,
      PRIMARY KEY (Surah, Ayah),
      FOREIGN KEY (Surah) REFERENCES Surah(Surah)
    );

    CREATE TABLE IF NOT EXISTS Kalimah (
      Surah INTEGER NOT NULL,
      Ayah INTEGER NOT NULL,
      Kalimah INTEGER NOT NULL,
      Arabic TEXT NOT NULL,
      Presentation_Form_A_Ligature_Based TEXT,
      Presentation_Form_A_Glyph_Based TEXT,
      PRIMARY KEY (Surah, Ayah, Kalimah),
      FOREIGN KEY (Surah, Ayah) REFERENCES Ayah(Surah, Ayah)
    );
  `);

  const pageRanges: string[] = readJsonFile<string[]>(path.join(META_DIR, "Page.json")) || [];
  const parsedPages: ParsedPage[] = pageRanges.map((r, i) => ({ page: i + 1, ...parsePageRange(r) }));

  const hizbData: unknown[] = readJsonFile<unknown[]>(path.join(META_DIR, "Hizb.json")) || [];
  const juzData: unknown[] = readJsonFile<unknown[]>(path.join(META_DIR, "Juz.json")) || [];

  const insertPage: Database.Statement = db.prepare(`
    INSERT INTO Page (Page, Start_Surah, Start_Ayah, Start_Kalimah, End_Surah, End_Ayah, End_Kalimah)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJuz: Database.Statement = db.prepare(`
    INSERT INTO Juz (Juz, Start_Surah, Start_Ayah, End_Surah, End_Ayah)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertHizb: Database.Statement = db.prepare(`
    INSERT INTO Hizb (Hizb, Start_Surah, Start_Ayah, End_Surah, End_Ayah)
    VALUES (?, ?, ?, ?, ?)
  `);

  function pageRangeForSurah(surahId: number): [number | null, number | null] {
    let first: number | null = null;
    let last: number | null = null;
    for (const p of parsedPages) {
      const startS = p.start?.alSurah ?? p.start?.surah;
      const endS = p.end?.alSurah ?? p.end?.surah;
      if (startS !== undefined && endS !== undefined && startS <= surahId && surahId <= endS) {
        if (first === null) first = p.page;
        last = p.page;
      }
    }
    return [first, last];
  }

  const ayahCounts: number[] = readJsonFile<number[]>(path.join(META_DIR, "Surah", "Ayah.json")) || 
                              readJsonFile<number[]>(path.join(META_DIR, "Surah", "Ayahs.json")) || [];
  const translations: string[] = readJsonFile<string[]>(path.join(META_DIR, "Surah", "Translation.json")) || [];
  const transliterations: string[] = readJsonFile<string[]>(path.join(META_DIR, "Surah", "Transliteration.json")) || [];
  const arabicNames: string[] = readJsonFile<string[]>(path.join(META_DIR, "Surah", "Arabic.json")) || [];
  
  const places: string[] = readJsonFile<string[]>(path.join(META_DIR, "Surah", "Place.json")) || 
                          readJsonFile<string[]>(path.join(META_DIR, "Surah", "Revelation", "Place.json")) || [];
                 
  const orders: (number | null)[] = readJsonFile<(number | null)[]>(path.join(META_DIR, "Surah", "Order.json")) || 
                                   readJsonFile<(number | null)[]>(path.join(META_DIR, "Surah", "Revelation", "Order.json")) || [];
                 
  const indoPageAyahEndings: unknown[] = readJsonFile<unknown[]>(path.join(META_DIR, "Indo_Pak_Ayah_Ending.json")) || 
                                         readJsonFile<unknown[]>(path.join(META_DIR, "Indo-Page-Ayah-Ending.json")) || 
                                         readJsonFile<unknown[]>(path.join(META_DIR, "Indo-Pak-Verse-Markers.json")) || [];

  const insertSurah: Database.Statement = db.prepare(`
    INSERT INTO Surah (
      Surah, Arabic, Translation, Transliteration, Revelation_Place, Revelation_Order,
      Ayah_Count, Start_Page, End_Page, Indo_Pak_Ayah_Ending, Layout
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAyah: Database.Statement = db.prepare(`
    INSERT INTO Ayah (Surah, Ayah, Arabic, Presentation_Form_A_Ligature_Based, Presentation_Form_A_Glyph_Based)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertKalimah: Database.Statement = db.prepare(`
    INSERT INTO Kalimah (Surah, Ayah, Kalimah, Arabic, Presentation_Form_A_Ligature_Based, Presentation_Form_A_Glyph_Based)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let totalAyahCount = 0;
  let totalKalimahCount = 0;

  const transaction = db.transaction(() => {
    parsedPages.forEach((p) => {
      const startSurah = p.start?.alSurah ?? p.start?.surah ?? 0;
      const startAyah = p.start?.alAyah ?? p.start?.ayah ?? 0;
      const startKalimah = p.start?.alKalimah ?? p.start?.word ?? 1;
      const endSurah = p.end?.alSurah ?? p.end?.surah ?? 0;
      const endAyah = p.end?.alAyah ?? p.end?.ayah ?? 0;
      const endKalimah = p.end?.alKalimah ?? p.end?.word ?? 1;

      insertPage.run(p.page, startSurah, startAyah, startKalimah, endSurah, endAyah, endKalimah);
    });

    const extractRange = (item: unknown): BasicRangeResult | null => {
      if (typeof item === "string") {
        return parseRangeString(item);
      }
      if (!item || typeof item !== "object") return null;

      const obj = item as Record<string, any>;
      const startSurah = obj.Start_Surah ?? obj.Start_Al_Surah ?? obj.start_surah ?? obj.startSurah ?? obj.start?.alSurah ?? obj.start?.surah;
      const startAyah = obj.Start_Ayah ?? obj.Start_Al_Ayah ?? obj.start_ayah ?? obj.startAyah ?? obj.start?.alAyah ?? obj.start?.ayah;
      const endSurah = obj.End_Surah ?? obj.End_Al_Surah ?? obj.end_surah ?? obj.endSurah ?? obj.end?.alSurah ?? obj.end?.surah;
      const endAyah = obj.End_Ayah ?? obj.End_Al_Ayah ?? obj.end_ayah ?? obj.endAyah ?? obj.end?.alAyah ?? obj.end?.ayah;

      if (startSurah != null && startAyah != null && endSurah != null && endAyah != null) {
        return { startSurah, startAyah, endSurah, endAyah };
      }
      return null;
    };

    if (Array.isArray(juzData)) {
      let juzIndex = 1;
      juzData.forEach((juz) => {
        const parsed = extractRange(juz);
        if (parsed) {
          insertJuz.run(juzIndex++, parsed.startSurah, parsed.startAyah, parsed.endSurah, parsed.endAyah);
        }
      });
    }

    if (Array.isArray(hizbData)) {
      let hizbIndex = 1;
      hizbData.forEach((hizb) => {
        const parsed = extractRange(hizb);
        if (parsed) {
          insertHizb.run(hizbIndex++, parsed.startSurah, parsed.startAyah, parsed.endSurah, parsed.endAyah);
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
      const [pageStart, pageEnd] = pageRangeForSurah(id);

      insertSurah.run(
        id,
        arabicNames[idx] ?? "",
        translations[idx] ?? "",
        transliterations[idx] ?? "",
        places[idx] ?? "",
        orders[idx] ?? null,
        ayahCounts[idx] ?? versesText.length,
        pageStart,
        pageEnd,
        JSON.stringify(indoPageAyahEndings[idx] || []),
        layoutData ? JSON.stringify(layoutData) : null
      );

      versesText.forEach((rawVerse, vIdx) => {
        const ayahNumber = vIdx + 1;
        const arabicText = extractVerseString(rawVerse);
        const presentationA = extractVerseString(versesTextV1[vIdx]);
        const presentationB = extractVerseString(versesTextV2[vIdx]);

        insertAyah.run(
          id,
          ayahNumber,
          arabicText,
          presentationA || null,
          presentationB || null
        );
        totalAyahCount++;

        const kalimahArabic = splitIntoWords(arabicText);

        const parseGlyphs = (rawVerseEntry: unknown, textStr: string, targetLength: number): string[] => {
          if (Array.isArray(rawVerseEntry) && rawVerseEntry.length === targetLength) {
            return rawVerseEntry.map(String);
          }
          const words = splitIntoWords(textStr);
          if (words.length === targetLength) return words;

          const chars = Array.from(textStr || "");
          if (chars.length === targetLength) return chars;

          return words;
        };

        const kalimahV1 = parseGlyphs(versesTextV1[vIdx], presentationA, kalimahArabic.length);
        const kalimahV2 = parseGlyphs(versesTextV2[vIdx], presentationB, kalimahArabic.length);

        const maxKalimah = kalimahArabic.length;

        for (let kIdx = 0; kIdx < maxKalimah; kIdx++) {
          const kalimahPosition = kIdx + 1;
          const kArabic = kalimahArabic[kIdx] || "";
          const kPresentationA = kalimahV1[kIdx] !== undefined ? String(kalimahV1[kIdx]) : null;
          const kPresentationB = kalimahV2[kIdx] !== undefined ? String(kalimahV2[kIdx]) : null;

          insertKalimah.run(
            id,
            ayahNumber,
            kalimahPosition,
            kArabic,
            kPresentationA,
            kPresentationB
          );
          totalKalimahCount++;
        }
      });
    }
  });

  transaction();
  db.close();
  console.log(`Core.db built successfully: ${parsedPages.length} Page, ${totalAyahCount} Ayah entries, ${totalKalimahCount} Kalimah entries.`);
}