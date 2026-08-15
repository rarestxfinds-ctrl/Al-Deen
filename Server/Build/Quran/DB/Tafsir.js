import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { TAFSIR_BASE_DIR, CORPUS_QURAN_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, extractVersesArray, extractVerseString } from "../Utility/Parser.js";

export function buildTafsirDatabases() {
  if (!fs.existsSync(TAFSIR_BASE_DIR)) return;

  function traverse(dir, relativePath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const isEditionFolder = entries.some((e) => !isNaN(parseInt(e.name.replace(".json", ""))));

    if (isEditionFolder) {
      const targetDbPath = path.join(CORPUS_QURAN_OUTPUT_DIR, "Tafsir", `${relativePath}.db`);

      if (!shouldRebuildDb(targetDbPath, dir)) {
        console.log(`[Skipped] Tafsir/${relativePath}.db is up to date.`);
        return;
      }

      const editionOutputDir = path.dirname(targetDbPath);
      if (!fs.existsSync(editionOutputDir)) {
        fs.mkdirSync(editionOutputDir, { recursive: true });
      }

      if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

      console.log(`Compiling Tafsir DB: ${relativePath}.db`);
      const db = new Database(targetDbPath);
      db.pragma("journal_mode = WAL");
      db.pragma("synchronous = NORMAL");

      db.exec(`
        CREATE TABLE IF NOT EXISTS Al_Surah (
          Al_Surah INTEGER NOT NULL,
          Al_Ayah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Al_Surah, Al_Ayah)
        );
      `);

      const insertAlTafsir = db.prepare(`INSERT INTO Al_Surah (Al_Surah, Al_Ayah, Text) VALUES (?, ?, ?)`);

      const transaction = db.transaction(() => {
        for (let sId = 1; sId <= 114; sId++) {
          let surahData = readJsonFile(path.join(dir, `${sId}.json`));

          if (!surahData && fs.existsSync(path.join(dir, `${sId}`))) {
            const subEntries = fs.readdirSync(path.join(dir, `${sId}`));
            surahData = [];
            subEntries
              .sort((a, b) => parseInt(a) - parseInt(b))
              .forEach((file) => {
                if (file.endsWith(".json")) {
                  const item = readJsonFile(path.join(dir, `${sId}`, file));
                  if (item) surahData.push(item);
                }
              });
          }

          const itemsArray = extractVersesArray(surahData);
          itemsArray.forEach((item, vIdx) => {
            const text = extractVerseString(item);
            if (text) {
              insertAlTafsir.run(sId, vIdx + 1, text);
            }
          });
        }
      });

      transaction();
      db.close();
      console.log(` -> Compiled Tafsir DB ${relativePath}.db`);
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

  traverse(TAFSIR_BASE_DIR, "");
}