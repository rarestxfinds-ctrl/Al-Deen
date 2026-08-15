import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { TRANSLITERATION_BASE_DIR, CORPUS_QURAN_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, extractVersesArray, extractVerseString, splitIntoWords } from "../Utility/Parser.js";

export function buildTransliterationDatabases() {
  if (!fs.existsSync(TRANSLITERATION_BASE_DIR)) return;

  function traverse(dir, relativePath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const isEditionFolder = entries.some(
      (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", "")))
    );

    if (isEditionFolder) {
      const targetDbPath = path.join(CORPUS_QURAN_OUTPUT_DIR, "Transliteration", `${relativePath}.db`);

      if (!shouldRebuildDb(targetDbPath, dir)) {
        console.log(`[Skipped] Transliteration/${relativePath}.db is up to date.`);
        return;
      }

      const editionOutputDir = path.dirname(targetDbPath);
      if (!fs.existsSync(editionOutputDir)) {
        fs.mkdirSync(editionOutputDir, { recursive: true });
      }

      if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

      console.log(`Compiling Transliteration DB: ${relativePath}.db`);
      const db = new Database(targetDbPath);
      db.pragma("journal_mode = WAL");
      db.pragma("synchronous = NORMAL");

      // Removed Al_Surah; kept Al_Ayah and Al_Kalimah
      db.exec(`
        CREATE TABLE IF NOT EXISTS Al_Ayah (
          Al_Surah INTEGER NOT NULL,
          Al_Ayah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Al_Surah, Al_Ayah)
        );

        CREATE TABLE IF NOT EXISTS Al_Kalimah (
          Al_Surah INTEGER NOT NULL,
          Al_Ayah INTEGER NOT NULL,
          Al_Kalimah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Al_Surah, Al_Ayah, Al_Kalimah)
        );
      `);

      const insertAlAyah = db.prepare(`INSERT INTO Al_Ayah (Al_Surah, Al_Ayah, Text) VALUES (?, ?, ?)`);
      const insertAlKalimah = db.prepare(`INSERT INTO Al_Kalimah (Al_Surah, Al_Ayah, Al_Kalimah, Text) VALUES (?, ?, ?, ?)`);

      const transaction = db.transaction(() => {
        for (let sId = 1; sId <= 114; sId++) {
          const rawData = readJsonFile(path.join(dir, `${sId}.json`));
          const versesArray = extractVersesArray(rawData);

          versesArray.forEach((item, vIdx) => {
            const ayahNumber = vIdx + 1;
            const verseText = extractVerseString(item);

            if (verseText) {
              insertAlAyah.run(sId, ayahNumber, verseText);

              // Extract words by splitting on spaces / word boundary helper
              let kalimahList = [];
              if (item && typeof item === "object" && Array.isArray(item.words)) {
                kalimahList = item.words.map((w) => extractVerseString(w));
              } else if (Array.isArray(item)) {
                kalimahList = item.map((w) => extractVerseString(w));
              } else {
                kalimahList = splitIntoWords(verseText);
              }

              kalimahList.forEach((kalimahText, kIdx) => {
                const kalimahPosition = kIdx + 1;
                if (kalimahText && typeof kalimahText === "string") {
                  insertAlKalimah.run(sId, ayahNumber, kalimahPosition, kalimahText.trim());
                }
              });
            }
          });
        }
      });

      transaction();
      db.close();
      console.log(` -> Compiled Transliteration/${relativePath}.db with Al_Ayah and Al_Kalimah`);
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

  traverse(TRANSLITERATION_BASE_DIR, "");
}