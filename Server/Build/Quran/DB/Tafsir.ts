import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { TAFSIR_BASE_DIR, CORPUS_QURAN_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, extractVersesArray, extractVerseString } from "../Utility/Parser.js";

export function buildTafsirDatabases(): void {
  if (!fs.existsSync(TAFSIR_BASE_DIR)) return;

  function traverse(dir: string, relativePath: string): void {
    const entries: fs.Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check if the directory contains surah JSON files directly
    const isEditionFolder: boolean = entries.some(
      (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", ""), 10))
    );

    if (isEditionFolder) {
      const targetDbPath: string = path.join(CORPUS_QURAN_OUTPUT_DIR, "Tafsir", `${relativePath}.db`);

      if (!shouldRebuildDb(targetDbPath, dir)) {
        console.log(`[Skipped] Tafsir/${relativePath}.db is up to date.`);
        return;
      }

      const editionOutputDir: string = path.dirname(targetDbPath);
      if (!fs.existsSync(editionOutputDir)) {
        fs.mkdirSync(editionOutputDir, { recursive: true });
      }

      if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

      console.log(`Compiling Tafsir DB: ${relativePath}.db`);
      const db: Database.Database = new Database(targetDbPath);
      db.pragma("journal_mode = WAL");
      db.pragma("synchronous = NORMAL");

      // Standardized table name to Al_Ayah for consistency across corpus DBs
      db.exec(`
        CREATE TABLE IF NOT EXISTS Al_Ayah (
          Al_Surah INTEGER NOT NULL,
          Al_Ayah INTEGER NOT NULL,
          Text TEXT NOT NULL,
          PRIMARY KEY (Al_Surah, Al_Ayah)
        );
      `);

      const insertAlTafsir: Database.Statement = db.prepare(`INSERT INTO Al_Ayah (Al_Surah, Al_Ayah, Text) VALUES (?, ?, ?)`);

      const transaction = db.transaction(() => {
        for (let sId = 1; sId <= 114; sId++) {
          const jsonPath: string = path.join(dir, `${sId}.json`);
          const surahFolder: string = path.join(dir, `${sId}`);
          let surahData: unknown = null;

          if (fs.existsSync(jsonPath)) {
            surahData = readJsonFile(jsonPath);
          } else if (fs.existsSync(surahFolder) && fs.statSync(surahFolder).isDirectory()) {
            // Handle subfolder directory structure (e.g. /1/1.json, /1/2.json)
            const subEntries: string[] = fs.readdirSync(surahFolder);
            const collected: unknown[] = [];
            subEntries
              .filter((file) => file.endsWith(".json"))
              .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
              .forEach((file) => {
                const item = readJsonFile(path.join(surahFolder, file));
                if (item !== null && item !== undefined) {
                  collected.push(item);
                }
              });
            surahData = collected;
          }

          if (!surahData) continue;

          const itemsArray: unknown[] = extractVersesArray(surahData);
          itemsArray.forEach((item, vIdx) => {
            const text: string = extractVerseString(item);
            if (text && text.trim()) {
              insertAlTafsir.run(sId, vIdx + 1, text.trim());
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