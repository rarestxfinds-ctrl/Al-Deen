import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { INFO_BASE_DIR, CORPUS_QURAN_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, extractVerseString } from "../Utility/Parser.js";

export function buildInfoDatabases() {
  if (!fs.existsSync(INFO_BASE_DIR)) return;

  const entries = fs.readdirSync(INFO_BASE_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const authorDir = path.join(INFO_BASE_DIR, entry.name);
      const targetDbPath = path.join(CORPUS_QURAN_OUTPUT_DIR, "Info", `${entry.name}.db`);

      if (!shouldRebuildDb(targetDbPath, authorDir)) {
        console.log(`[Skipped] Info/${entry.name}.db is up to date.`);
        continue;
      }

      const infoOutputDir = path.dirname(targetDbPath);
      if (!fs.existsSync(infoOutputDir)) {
        fs.mkdirSync(infoOutputDir, { recursive: true });
      }

      if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

      console.log(`Compiling Info DB: ${entry.name}.db`);
      const db = new Database(targetDbPath);
      db.pragma("journal_mode = WAL");
      db.pragma("synchronous = NORMAL");

      db.exec(`
        CREATE TABLE IF NOT EXISTS Info (
          Al_Surah INTEGER PRIMARY KEY,
          Text TEXT NOT NULL
        );
      `);

      const insertAlInfo = db.prepare(`INSERT INTO Info (Al_Surah, Text) VALUES (?, ?)`);

      const transaction = db.transaction(() => {
        for (let sId = 1; sId <= 114; sId++) {
          const infoData = readJsonFile(path.join(authorDir, `${sId}.json`));
          const infoText = Array.isArray(infoData) ? infoData[0] : extractVerseString(infoData);

          if (infoText) {
            insertAlInfo.run(sId, infoText);
          }
        }
      });

      transaction();
      db.close();
      console.log(` -> Compiled Info DB ${entry.name}.db`);
    }
  }
}