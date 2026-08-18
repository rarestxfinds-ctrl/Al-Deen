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

      db.exec(`
        CREATE TABLE IF NOT EXISTS Ayah (
          Surah INTEGER NOT NULL,
          Ayah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Surah, Ayah)
        );

        CREATE TABLE IF NOT EXISTS Kalimah (
          Surah INTEGER NOT NULL,
          Ayah INTEGER NOT NULL,
          Kalimah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Surah, Ayah, Kalimah)
        );
      `);

      const insertAyah = db.prepare(`INSERT INTO Ayah (Surah, Ayah, Text) VALUES (?, ?, ?)`);
      const insertKalimah = db.prepare(`INSERT INTO Kalimah (Surah, Ayah, Kalimah, Text) VALUES (?, ?, ?, ?)`);

      const transaction = db.transaction(() => {
        for (let sId = 1; sId <= 114; sId++) {
          const rawData = readJsonFile(path.join(dir, `${sId}.json`));
          const versesArray = extractVersesArray(rawData);

          versesArray.forEach((item, vIdx) => {
            const ayahNumber = vIdx + 1;
            let kalimahList = [];
            let verseText = "";

            if (Array.isArray(item)) {
              kalimahList = item.map((w) => extractVerseString(w).trim()).filter(Boolean);
              verseText = kalimahList.join(" ");
            } else if (item && typeof item === "object" && Array.isArray(item.words)) {
              kalimahList = item.words.map((w) => extractVerseString(w).trim()).filter(Boolean);
              verseText = kalimahList.join(" ");
            } else {
              verseText = extractVerseString(item);
              kalimahList = splitIntoWords(verseText);
            }

            if (verseText) {
              insertAyah.run(sId, ayahNumber, verseText);

              kalimahList.forEach((kalimahText, kIdx) => {
                const kalimahPosition = kIdx + 1;
                if (kalimahText && typeof kalimahText === "string") {
                  insertKalimah.run(sId, ayahNumber, kalimahPosition, kalimahText.trim());
                }
              });
            }
          });
        }
      });

      transaction();
      db.close();
      console.log(` -> Compiled Transliteration/${relativePath}.db with Ayah and Kalimah`);
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