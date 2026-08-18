import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { TRANSLATION_BASE_DIR, CORPUS_QURAN_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, extractVersesArray, extractVerseString } from "../Utility/Parser.js";

// Directory matched directly to Server/Data/Quran/Surah/Translation/Word-By-Word
const WORD_BY_WORD_BASE_DIR = path.join(TRANSLATION_BASE_DIR, "Word-By-Word");

export function buildTranslationDatabases() {
  if (!fs.existsSync(TRANSLATION_BASE_DIR)) return;

  const processedWordByWordPaths = new Set();

  function findWordByWordDir(relativePath) {
    if (!fs.existsSync(WORD_BY_WORD_BASE_DIR)) return null;

    // 1. Exact relative path match
    const exactMatch = path.join(WORD_BY_WORD_BASE_DIR, relativePath);
    if (fs.existsSync(exactMatch)) return exactMatch;

    // 2. Edition name match (e.g. "Saheeh-International")
    const editionName = path.basename(relativePath);

    function searchTree(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          if (entry.name === editionName) {
            return fullPath;
          }
          const nested = searchTree(fullPath);
          if (nested) return nested;
        }
      }
      return null;
    }

    return searchTree(WORD_BY_WORD_BASE_DIR);
  }

  function findFootnoteDir(dir) {
    const fnDir = path.join(dir, "Footnote");
    if (fs.existsSync(fnDir) && fs.statSync(fnDir).isDirectory()) {
      return fnDir;
    }
    return null;
  }

  function traverse(dir, relativePath) {
    // Skip Word-By-Word directory in primary pass to prevent duplicate compilation
    if (relativePath.startsWith("Word-By-Word")) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const isEditionFolder = entries.some(
      (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", "")))
    );

    if (isEditionFolder) {
      processDatabase(dir, relativePath, { hasAyah: true });
    } else {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Avoid traversing into nested utility/metadata folders as separate editions
          if (entry.name === "Footnote" || entry.name === "Word-By-Word") {
            continue;
          }
          traverse(
            path.join(dir, entry.name),
            relativePath ? `${relativePath}/${entry.name}` : entry.name
          );
        }
      }
    }
  }

  function processDatabase(dir, relativePath, options = { hasAyah: true }, forcedWbwDir = null) {
    const targetDbPath = path.join(CORPUS_QURAN_OUTPUT_DIR, "Translation", `${relativePath}.db`);

    const wbwDir = forcedWbwDir || findWordByWordDir(relativePath);
    const footnoteDir = findFootnoteDir(dir);

    const hasKalimah = Boolean(wbwDir);
    const hasFootnote = Boolean(footnoteDir);

    if (wbwDir) {
      processedWordByWordPaths.add(path.resolve(wbwDir));
    }

    if (!shouldRebuildDb(targetDbPath, dir)) {
      console.log(`[Skipped] Translation/${relativePath}.db is up to date.`);
      return;
    }

    const editionOutputDir = path.dirname(targetDbPath);
    if (!fs.existsSync(editionOutputDir)) {
      fs.mkdirSync(editionOutputDir, { recursive: true });
    }

    if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

    console.log(`Compiling Translation DB: ${relativePath}.db`);
    const db = new Database(targetDbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");

    if (options.hasAyah) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS Ayah (
          Surah INTEGER NOT NULL,
          Ayah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Surah, Ayah)
        );
      `);
    }

    if (hasKalimah) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS Kalimah (
          Surah INTEGER NOT NULL,
          Ayah INTEGER NOT NULL,
          Kalimah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Surah, Ayah, Kalimah)
        );
      `);
    }

    if (hasFootnote) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS Footnote (
          Surah INTEGER NOT NULL,
          Footnote INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Surah, Footnote)
        );
      `);
    }

    const insertAyah = options.hasAyah
      ? db.prepare(`INSERT INTO Ayah (Surah, Ayah, Text) VALUES (?, ?, ?)`)
      : null;

    const insertKalimah = hasKalimah
      ? db.prepare(`INSERT INTO Kalimah (Surah, Ayah, Kalimah, Text) VALUES (?, ?, ?, ?)`)
      : null;

    const insertFootnote = hasFootnote
      ? db.prepare(`INSERT INTO Footnote (Surah, Footnote, Text) VALUES (?, ?, ?)`)
      : null;

    const transaction = db.transaction(() => {
      for (let sId = 1; sId <= 114; sId++) {
        // 1. Insert Ayah
        if (options.hasAyah) {
          const rawData = readJsonFile(path.join(dir, `${sId}.json`));
          const versesArray = extractVersesArray(rawData);

          versesArray.forEach((item, vIdx) => {
            const ayahNumber = vIdx + 1;
            const verseText = extractVerseString(item);

            if (verseText) {
              insertAyah.run(sId, ayahNumber, verseText);
            }
          });
        }

        // 2. Insert Kalimah (Word by Word)
        if (hasKalimah) {
          const wbwFile = path.join(wbwDir, `${sId}.json`);
          const rawWbwData = readJsonFile(wbwFile);

          if (Array.isArray(rawWbwData)) {
            rawWbwData.forEach((verseArray, vIdx) => {
              const ayahNumber = vIdx + 1;

              if (Array.isArray(verseArray)) {
                verseArray.forEach((wordText, kIdx) => {
                  if (wordText && typeof wordText === "string") {
                    insertKalimah.run(sId, ayahNumber, kIdx + 1, wordText.trim());
                  }
                });
              }
            });
          }
        }

        // 3. Insert Footnote without Ayah column
        if (hasFootnote) {
          const fnFile = path.join(footnoteDir, `${sId}.json`);
          const rawFnData = readJsonFile(fnFile);

          if (Array.isArray(rawFnData)) {
            let surahFootnoteCounter = 0;

            rawFnData.forEach((ayahFootnotes) => {
              if (Array.isArray(ayahFootnotes)) {
                ayahFootnotes.forEach((fnText) => {
                  if (fnText && typeof fnText === "string" && fnText.trim()) {
                    surahFootnoteCounter++;
                    insertFootnote.run(sId, surahFootnoteCounter, fnText.trim());
                  }
                });
              }
            });
          }
        }
      }
    });

    transaction();
    db.close();
    console.log(` -> Compiled tables into Translation/${relativePath}.db`);
  }

  // 1. Process standard translations
  traverse(TRANSLATION_BASE_DIR, "");

  // 2. Process standalone Word-By-Word editions (e.g., Word-By-Word/English/Direct)
  if (fs.existsSync(WORD_BY_WORD_BASE_DIR)) {
    function traverseWbwStandalone(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const isEditionFolder = entries.some(
        (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", "")))
      );

      if (isEditionFolder) {
        const fullPath = path.resolve(dir);
        if (!processedWordByWordPaths.has(fullPath)) {
          const relPath = path.relative(TRANSLATION_BASE_DIR, dir);
          processDatabase(dir, relPath, { hasAyah: false }, dir);
        }
      } else {
        for (const entry of entries) {
          if (entry.isDirectory()) {
            traverseWbwStandalone(path.join(dir, entry.name));
          }
        }
      }
    }

    traverseWbwStandalone(WORD_BY_WORD_BASE_DIR);
  }
}