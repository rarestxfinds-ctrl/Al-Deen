import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { HADITH_ARABIC_DATA_DIR, HADITH_ARABIC_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, cleanString } from "../Utility/Parser.js";

interface NarrationRecord {
  id: number;
  inChapterId: number;
  text: string;
}

interface ChapterRecord {
  chapterId: number;
  name: string;
  narrations: NarrationRecord[];
}

export function buildArabicHadithDatabases(force: boolean = false): void {
  if (!fs.existsSync(HADITH_ARABIC_DATA_DIR)) return;

  const topFolders = fs
    .readdirSync(HADITH_ARABIC_DATA_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  for (const topFolderEntry of topFolders) {
    const topFolderName = topFolderEntry.name;
    const topFolderPath = path.join(HADITH_ARABIC_DATA_DIR, topFolderName);

    const authorFolders = fs
      .readdirSync(topFolderPath, { withFileTypes: true })
      .filter((e) => e.isDirectory());

    for (const authorFolderEntry of authorFolders) {
      const authorName = authorFolderEntry.name;
      const authorFolderPath = path.join(topFolderPath, authorName);

      const targetDbPath = path.join(
        HADITH_ARABIC_OUTPUT_DIR,
        topFolderName,
        `${authorName}.db`
      );

      if (!shouldRebuildDb(targetDbPath, authorFolderPath, force)) {
        console.log(`[Skipped] Hadith/Arabic/${topFolderName}/${authorName}.db is up to date.`);
        continue;
      }

      const outputDir = path.dirname(targetDbPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

      console.log(`Compiling Hadith DB: Arabic/${topFolderName}/${authorName}.db`);
      const db = new Database(targetDbPath);
      db.pragma("journal_mode = WAL");
      db.pragma("synchronous = NORMAL");

      // Updated Tables: Chapter & Narration
      db.exec(`
        CREATE TABLE IF NOT EXISTS Chapter (
          ID INTEGER PRIMARY KEY,
          Hadith_Count INTEGER NOT NULL,
          Name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS Narration (
          Chapter_ID INTEGER NOT NULL,
          ID INTEGER PRIMARY KEY,
          In_Chapter_ID INTEGER NOT NULL,
          Text TEXT NOT NULL,
          FOREIGN KEY (Chapter_ID) REFERENCES Chapter(ID)
        );
      `);

      const insertChapter = db.prepare(
        `INSERT INTO Chapter (ID, Hadith_Count, Name) VALUES (?, ?, ?)`
      );
      const insertNarration = db.prepare(
        `INSERT INTO Narration (Chapter_ID, ID, In_Chapter_ID, Text) VALUES (?, ?, ?, ?)`
      );

      const entries = fs.readdirSync(authorFolderPath, { withFileTypes: true });
      const chaptersList: ChapterRecord[] = [];

      entries.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      );

      let chapterIdCounter = 1;

      for (const entry of entries) {
        const entryPath = path.join(authorFolderPath, entry.name);
        const compiledNarrations: NarrationRecord[] = [];

        if (entry.isDirectory()) {
          const hadithFiles = fs
            .readdirSync(entryPath)
            .filter((f) => f.endsWith(".json"));

          hadithFiles.sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
          );

          hadithFiles.forEach((filename, idx) => {
            const fileIdStr = path.basename(filename, ".json");
            const rawData = readJsonFile(path.join(entryPath, filename));

            let arabicText = "";
            let inChapterId = idx + 1;
            let globalId = Number(fileIdStr) || idx + 1;

            if (Array.isArray(rawData)) {
              if (typeof rawData[0] === "string") arabicText = cleanString(rawData[0]);
              if (typeof rawData[1] === "number") inChapterId = rawData[1];
              if (typeof rawData[2] === "number") globalId = rawData[2];
            } else if (typeof rawData === "string") {
              arabicText = cleanString(rawData);
            }

            if (arabicText) {
              compiledNarrations.push({
                id: globalId,
                inChapterId,
                text: arabicText,
              });
            }
          });

          if (compiledNarrations.length > 0) {
            chaptersList.push({
              chapterId: chapterIdCounter++,
              name: entry.name.replace(/-/g, " "),
              narrations: compiledNarrations,
            });
          }
        }
      }

      // Execute Transaction
      const transaction = db.transaction(() => {
        for (const chap of chaptersList) {
          insertChapter.run(chap.chapterId, chap.narrations.length, chap.name);
          for (const n of chap.narrations) {
            insertNarration.run(chap.chapterId, n.id, n.inChapterId, n.text);
          }
        }
      });

      transaction();
      db.close();
      console.log(
        ` -> Compiled Hadith/Arabic/${topFolderName}/${authorName}.db (${chaptersList.length} chapters)`
      );
    }
  }
}