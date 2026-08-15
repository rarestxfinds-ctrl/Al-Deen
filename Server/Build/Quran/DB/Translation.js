import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { TRANSLATION_BASE_DIR, CORPUS_QURAN_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, extractVersesArray, extractVerseString } from "../Utility/Parser.js";

const KALIMA_BASE_DIR = path.join(TRANSLATION_BASE_DIR, "Kalima-Bi-Kalima");

export function buildTranslationDatabases() {
  if (!fs.existsSync(TRANSLATION_BASE_DIR)) return;

  // Track absolute paths of Kalima directories that get merged into standard translations
  const processedKalimaPaths = new Set();

  function findKalimaDir(relativePath) {
    if (!fs.existsSync(KALIMA_BASE_DIR)) return null;

    // 1. Exact relative path match (e.g., Kalima-Bi-Kalima/English/Saheeh-International)
    const exactMatch = path.join(KALIMA_BASE_DIR, relativePath);
    if (fs.existsSync(exactMatch)) return exactMatch;

    // 2. Folder name match across subdirectories (e.g., Kalima-Bi-Kalima/*/Saheeh-International)
    const editionName = path.basename(relativePath);
    
    function searchKalimaTree(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          if (entry.name === editionName) {
            return fullPath;
          }
          const nested = searchKalimaTree(fullPath);
          if (nested) return nested;
        }
      }
      return null;
    }

    return searchKalimaTree(KALIMA_BASE_DIR);
  }

  function traverse(dir, relativePath) {
    if (relativePath.startsWith("Kalima-Bi-Kalima")) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const isEditionFolder = entries.some(
      (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", "")))
    );

    if (isEditionFolder) {
      processDatabase(dir, relativePath, { hasAyah: true });
    } else {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          traverse(
            path.join(dir, entry.name),
            relativePath ? `${relativePath}/${entry.name}` : entry.name
          );
        }
      }
    }
  }

  function processDatabase(dir, relativePath, options = { hasAyah: true }, forcedKalimaDir = null) {
    const targetDbPath = path.join(CORPUS_QURAN_OUTPUT_DIR, "Translation", `${relativePath}.db`);

    // Locate matching Kalima directory if available
    const kalimaDir = forcedKalimaDir || findKalimaDir(relativePath);
    const hasKalima = Boolean(kalimaDir);

    if (kalimaDir) {
      processedKalimaPaths.add(path.resolve(kalimaDir));
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
        CREATE TABLE IF NOT EXISTS Al_Ayah (
          Al_Surah INTEGER NOT NULL,
          Al_Ayah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Al_Surah, Al_Ayah)
        );
      `);
    }

    if (hasKalima) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS Al_Kalimah (
          Al_Surah INTEGER NOT NULL,
          Al_Ayah INTEGER NOT NULL,
          Al_Kalimah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Al_Surah, Al_Ayah, Al_Kalimah)
        );
      `);
    }

    const insertAlAyah = options.hasAyah
      ? db.prepare(`INSERT INTO Al_Ayah (Al_Surah, Al_Ayah, Text) VALUES (?, ?, ?)`)
      : null;

    const insertAlKalimah = hasKalima
      ? db.prepare(`INSERT INTO Al_Kalimah (Al_Surah, Al_Ayah, Al_Kalimah, Text) VALUES (?, ?, ?, ?)`)
      : null;

    const transaction = db.transaction(() => {
      for (let sId = 1; sId <= 114; sId++) {
        // 1. Insert Al_Ayah
        if (options.hasAyah) {
          const rawData = readJsonFile(path.join(dir, `${sId}.json`));
          const versesArray = extractVersesArray(rawData);

          versesArray.forEach((item, vIdx) => {
            const ayahNumber = vIdx + 1;
            const verseText = extractVerseString(item);

            if (verseText) {
              insertAlAyah.run(sId, ayahNumber, verseText);
            }
          });
        }

        // 2. Insert Al_Kalimah
        if (hasKalima) {
          const kalimaFile = path.join(kalimaDir, `${sId}.json`);
          const rawKalimaData = readJsonFile(kalimaFile);

          if (Array.isArray(rawKalimaData)) {
            rawKalimaData.forEach((verseArray, vIdx) => {
              const ayahNumber = vIdx + 1;

              if (Array.isArray(verseArray)) {
                verseArray.forEach((wordText, kIdx) => {
                  if (wordText && typeof wordText === "string") {
                    insertAlKalimah.run(sId, ayahNumber, kIdx + 1, wordText.trim());
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

  // 1. Process standard translations (Merges Saheeh-International from Kalima-Bi-Kalima/English/)
  traverse(TRANSLATION_BASE_DIR, "");

  // 2. Process unmatched Kalima-Bi-Kalima paths (Creates Translation/Kalima-Bi-Kalima/English/Direct.db)
  if (fs.existsSync(KALIMA_BASE_DIR)) {
    function traverseKalimaStandalone(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const isEditionFolder = entries.some(
        (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", "")))
      );

      if (isEditionFolder) {
        const fullPath = path.resolve(dir);
        if (!processedKalimaPaths.has(fullPath)) {
          // Output path preserves Kalima-Bi-Kalima subfolders (e.g. Kalima-Bi-Kalima/English/Direct)
          const relPath = path.relative(TRANSLATION_BASE_DIR, dir);
          processDatabase(dir, relPath, { hasAyah: false }, dir);
        }
      } else {
        for (const entry of entries) {
          if (entry.isDirectory()) {
            traverseKalimaStandalone(path.join(dir, entry.name));
          }
        }
      }
    }

    traverseKalimaStandalone(KALIMA_BASE_DIR);
  }
}