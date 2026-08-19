import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { HADITH_TRANSLITERATION_DATA_DIR, HADITH_TRANSLITERATION_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, cleanString } from "../Utility/Parser.js";

export function buildTransliterationDatabases(force: boolean = false): void {
  if (!fs.existsSync(HADITH_TRANSLITERATION_DATA_DIR)) return;

  // 1. Language Level (e.g., "Arabic")
  const languages = fs
    .readdirSync(HADITH_TRANSLITERATION_DATA_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "WBW");

  for (const langFolder of languages) {
    const langName = langFolder.name;
    const langPath = path.join(HADITH_TRANSLITERATION_DATA_DIR, langName);

    // 2. Category Level (e.g., "Sahih")
    const categories = fs
      .readdirSync(langPath, { withFileTypes: true })
      .filter((e) => e.isDirectory());

    for (const catFolder of categories) {
      const catName = catFolder.name;
      const catPath = path.join(langPath, catName);

      // 3. Collection Level (e.g., "Muslim")
      const collections = fs
        .readdirSync(catPath, { withFileTypes: true })
        .filter((e) => e.isDirectory());

      for (const colFolder of collections) {
        const colName = colFolder.name;
        const colPath = path.join(catPath, colName);

        const targetDbPath = path.join(
          HADITH_TRANSLITERATION_OUTPUT_DIR,
          langName,
          catName,
          `${colName}.db`
        );

        if (!shouldRebuildDb(targetDbPath, colPath, force)) {
          console.log(`[Skipped] Hadith/Transliteration/${langName}/${catName}/${colName}.db is up to date.`);
          continue;
        }

        const outputDir = path.dirname(targetDbPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

        console.log(`Compiling Hadith DB: Transliteration/${langName}/${catName}/${colName}.db`);
        const db = new Database(targetDbPath);
        db.pragma("journal_mode = WAL");
        db.pragma("synchronous = NORMAL");

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

        // 4. Chapter Level (e.g., "Introduction")
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
              const tokensData = readJsonFile(path.join(chapPath, file));

              if (Array.isArray(tokensData)) {
                // Construct full continuous text by joining WBW tokens
                const fullText = tokensData
                  .map((token) => cleanString(String(token)))
                  .join(" ");

                if (fullText) {
                  insertHadith.run(hadithId, fullText);
                }

                // Insert individual WBW tokens using the exact same file array
                tokensData.forEach((token: string, idx: number) => {
                  const cleanedToken = cleanString(String(token));
                  insertWbw.run(hadithId, idx, cleanedToken);
                });
              } else if (typeof tokensData === "string") {
                const cleanedText = cleanString(tokensData);
                insertHadith.run(hadithId, cleanedText);
                insertWbw.run(hadithId, 0, cleanedText);
              }
            }
          }
        });

        transaction();
        db.close();
        console.log(` -> Compiled Hadith/Transliteration/${langName}/${catName}/${colName}.db`);
      }
    }
  }
}