import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { TRANSLATION_BASE_DIR, CORPUS_QURAN_OUTPUT_DIR } from "../Config.js";
import { shouldRebuildDb } from "../Utility/Cache.js";
import { readJsonFile, extractVersesArray, extractVerseString } from "../Utility/Parser.js";

// Directory matched directly to Server/Data/Quran/Surah/Translation/Word-By-Word
const WORD_BY_WORD_BASE_DIR: string = path.join(TRANSLATION_BASE_DIR, "Word-By-Word");

interface ProcessDatabaseOptions {
  hasAyah?: boolean;
}

export function buildTranslationDatabases(): void {
  if (!fs.existsSync(TRANSLATION_BASE_DIR)) return;

  const processedWordByWordPaths = new Set<string>();

  function findWordByWordDir(relativePath: string): string | null {
    if (!fs.existsSync(WORD_BY_WORD_BASE_DIR)) return null;

    // 1. Exact relative path match
    const exactMatch: string = path.join(WORD_BY_WORD_BASE_DIR, relativePath);
    if (fs.existsSync(exactMatch)) return exactMatch;

    // 2. Edition name match (e.g. "Saheeh-International")
    const editionName: string = path.basename(relativePath);

    function searchTree(dir: string): string | null {
      const entries: fs.Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath: string = path.join(dir, entry.name);
          if (entry.name === editionName) {
            return fullPath;
          }
          const nested: string | null = searchTree(fullPath);
          if (nested) return nested;
        }
      }
      return null;
    }

    return searchTree(WORD_BY_WORD_BASE_DIR);
  }

  function findFootnoteDir(dir: string): string | null {
    const fnDir: string = path.join(dir, "Footnote");
    if (fs.existsSync(fnDir) && fs.statSync(fnDir).isDirectory()) {
      return fnDir;
    }
    return null;
  }

  function traverse(dir: string, relativePath: string): void {
    // Skip Word-By-Word directory in primary pass to prevent duplicate compilation
    if (relativePath.startsWith("Word-By-Word")) return;

    const entries: fs.Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
    const isEditionFolder: boolean = entries.some(
      (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", ""), 10))
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

  function processDatabase(
    dir: string,
    relativePath: string,
    options: ProcessDatabaseOptions = { hasAyah: true },
    forcedWbwDir: string | null = null
  ): void {
    const targetDbPath: string = path.join(CORPUS_QURAN_OUTPUT_DIR, "Translation", `${relativePath}.db`);

    const wbwDir: string | null = forcedWbwDir || findWordByWordDir(relativePath);
    const footnoteDir: string | null = findFootnoteDir(dir);

    const hasKalimah: boolean = Boolean(wbwDir);
    const hasFootnote: boolean = Boolean(footnoteDir);

    if (wbwDir) {
      processedWordByWordPaths.add(path.resolve(wbwDir));
    }

    if (!shouldRebuildDb(targetDbPath, dir)) {
      console.log(`[Skipped] Translation/${relativePath}.db is up to date.`);
      return;
    }

    const editionOutputDir: string = path.dirname(targetDbPath);
    if (!fs.existsSync(editionOutputDir)) {
      fs.mkdirSync(editionOutputDir, { recursive: true });
    }

    if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

    console.log(`Compiling Translation DB: ${relativePath}.db`);
    const db: Database.Database = new Database(targetDbPath);
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

    const insertAyah: Database.Statement | null = options.hasAyah
      ? db.prepare(`INSERT INTO Ayah (Surah, Ayah, Text) VALUES (?, ?, ?)`)
      : null;

    const insertKalimah: Database.Statement | null = hasKalimah
      ? db.prepare(`INSERT INTO Kalimah (Surah, Ayah, Kalimah, Text) VALUES (?, ?, ?, ?)`)
      : null;

    const insertFootnote: Database.Statement | null = hasFootnote
      ? db.prepare(`INSERT INTO Footnote (Surah, Footnote, Text) VALUES (?, ?, ?)`)
      : null;

    const transaction = db.transaction(() => {
      for (let sId = 1; sId <= 114; sId++) {
        // 1. Insert Ayah
        if (options.hasAyah && insertAyah) {
          const rawData: unknown = readJsonFile(path.join(dir, `${sId}.json`));
          const versesArray: unknown[] = extractVersesArray(rawData);

          versesArray.forEach((item, vIdx) => {
            const ayahNumber = vIdx + 1;
            const verseText: string = extractVerseString(item);

            if (verseText) {
              insertAyah.run(sId, ayahNumber, verseText);
            }
          });
        }

        // 2. Insert Kalimah (Word by Word)
        if (hasKalimah && insertKalimah && wbwDir) {
          const wbwFile: string = path.join(wbwDir, `${sId}.json`);
          const rawWbwData: unknown = readJsonFile(wbwFile);

          if (Array.isArray(rawWbwData)) {
            rawWbwData.forEach((verseArray: unknown, vIdx: number) => {
              const ayahNumber = vIdx + 1;

              if (Array.isArray(verseArray)) {
                verseArray.forEach((wordText: unknown, kIdx: number) => {
                  if (wordText && typeof wordText === "string") {
                    insertKalimah.run(sId, ayahNumber, kIdx + 1, wordText.trim());
                  }
                });
              }
            });
          }
        }

        // 3. Insert Footnote without Ayah column
        if (hasFootnote && insertFootnote && footnoteDir) {
          const fnFile: string = path.join(footnoteDir, `${sId}.json`);
          const rawFnData: unknown = readJsonFile(fnFile);

          if (Array.isArray(rawFnData)) {
            let surahFootnoteCounter = 0;

            rawFnData.forEach((ayahFootnotes: unknown) => {
              if (Array.isArray(ayahFootnotes)) {
                ayahFootnotes.forEach((fnText: unknown) => {
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
    function traverseWbwStandalone(dir: string): void {
      const entries: fs.Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
      const isEditionFolder: boolean = entries.some(
        (e) => e.isFile() && e.name.endsWith(".json") && !isNaN(parseInt(e.name.replace(".json", ""), 10))
      );

      if (isEditionFolder) {
        const fullPath: string = path.resolve(dir);
        if (!processedWordByWordPaths.has(fullPath)) {
          const relPath: string = path.relative(TRANSLATION_BASE_DIR, dir);
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