import { ensureHadithDataExists } from "./Utility/Download.js";
import { buildArabicHadithDatabases } from "./DB/Arabic.js";
import { buildTranslationDatabases } from "./DB/Translation.js";
import { buildTransliterationDatabases } from "./DB/Transliteration.js";

async function runBuild(): Promise<void> {
  const isForce = process.argv.includes("--force") || process.argv.includes("-f");

  const startTime = Date.now();
  console.log("Checking Hadith dataset requirements...");
  await ensureHadithDataExists();

  console.log(`\n--- Starting Modular Hadith Corpus Build ${isForce ? "(FORCED)" : ""} ---`);

  // 1. Build Arabic SQLite Databases
  buildArabicHadithDatabases(isForce);

  // 2. Build Translation SQLite Databases (Main text + WBW)
  buildTranslationDatabases(isForce);

  // 3. Build Transliteration SQLite Databases (Full text + WBW)
  buildTransliterationDatabases(isForce);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAll Hadith databases are up to date! (Completed in ${duration}s)`);
}

runBuild().catch((err: unknown) => {
  console.error("Error building Modular Hadith Corpus:", err);
  process.exit(1);
});