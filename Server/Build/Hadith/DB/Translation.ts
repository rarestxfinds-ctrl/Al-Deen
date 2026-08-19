import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { HADITH_TRANSLATION_DATA_DIR, HADITH_TRANSLATION_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, cleanString } from "../Utility/Parser.js";

export function buildTranslationDatabases(force: boolean = false): void {
  if (!fs.existsSync(HADITH_TRANSLATION_DATA_DIR)) return;

  const languages = fs
    .readdirSync(HADITH_TRANSLATION_DATA_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "WBW");

  for (const langFolder of languages) {
    const langName = langFolder.name;
    const langPath = path.join(HADITH_TRANSLATION_DATA_DIR, langName);

    const categories = fs
      .readdirSync(langPath, { withFileTypes: true })
      .filter((e) => e.isDirectory());

    for (const catFolder of categories) {
      const catName = catFolder.name;
      const catPath = path.join(langPath, catName);

      const collections = fs
        .readdirSync(catPath, { withFileTypes: true })
        .filter((e) => e.isDirectory());

      for (const colFolder of collections) {
        const colName = colFolder.name;
        const colPath = path.join(catPath, colName);

        const targetDbPath = path.join(
          HADITH_TRANSLATION_OUTPUT_DIR,
          langName,
          catName,
          `${colName}.db`
        );

        if (!shouldRebuildDb(targetDbPath, colPath, force)) {
          console.log(`[Skipped] Hadith/Translation/${langName}/${catName}/${colName}.db is up to date.`);
          continue;
        }

        const outputDir = path.dirname(targetDbPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

        console.log(`Compiling Hadith DB: Translation/${langName}/${catName}/${colName}.db`);
        const db = new Database(targetDbPath);
        db.pragma("journal_mode = WAL");
        db.pragma("synchronous = NORMAL");

        // Table definition matching updated uppercase schema
        db.exec(`
          CREATE TABLE IF NOT EXISTS Hadith (
            ID INTEGER PRIMARY KEY,
            Text TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS WBW (
            ID INTEGER NOT NULL,
            Token_Index INTEGER NOT NULL,
            Text TEXT NOT NULL,
            PRIMARY KEY (ID, Token_Index),
            FOREIGN KEY (ID) REFERENCES Hadith(ID)
          );
        `);

        const insertHadith = db.prepare("INSERT INTO Hadith (ID, Text) VALUES (?, ?)");
        const insertWbw = db.prepare("INSERT INTO WBW (ID, Token_Index, Text) VALUES (?, ?, ?)");

        const chapters = fs
          .readdirSync(colPath, { withFileTypes: true })
          .filter((e) => e.isDirectory());

        const transaction = db.transaction(() => {
          for (const chap of chapters) {
            const chapPath = path.join(colPath, chap.name);
            const files = fs
              .readdirSync(chapPath)
              .filter((f) => f.endsWith(".json"));

            for (const file of files) {
              const hadithId = Number(path.basename(file, ".json"));
              const mainData = readJsonFile(path.join(chapPath, file));

              // 1. Process Main Translation Text (Joins array into plain text string without brackets)
              let fullText = "";
              if (Array.isArray(mainData)) {
                fullText = mainData.map((item) => cleanString(String(item))).join("\n\n");
              } else if (typeof mainData === "string") {
                fullText = cleanString(mainData);
              }

              if (fullText) {
                insertHadith.run(hadithId, fullText);
              }

              // 2. Process Word-By-Word (WBW) Translation
              const wbwFilePath = path.join(
                HADITH_TRANSLATION_DATA_DIR,
                "WBW",
                langName,
                catName,
                colName,
                chap.name,
                file
              );

              if (fs.existsSync(wbwFilePath)) {
                const wbwData = readJsonFile(wbwFilePath);
                if (Array.isArray(wbwData)) {
                  wbwData.forEach((token: string, idx: number) => {
                    insertWbw.run(hadithId, idx, cleanString(String(token)));
                  });
                }
              }
            }
          }
        });

        transaction();
        db.close();
        console.log(` -> Compiled Hadith/Translation/${langName}/${catName}/${colName}.db`);
      }
    }
  }
}