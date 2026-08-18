import { ensureDataExists } from "./Utility/Downloader.js";
import { buildCoreDatabase } from "./DB/Core.js";
import { buildTranslationDatabases } from "./DB/Translation.js";
import { buildTransliterationDatabases } from "./DB/Transliteration.js";
import { buildTafsirDatabases } from "./DB/Tafsir.js";
import { buildInfoDatabases } from "./DB/Information.js";

async function runBuild() {
  const startTime = Date.now();
  console.log("Checking dataset requirements...");
  await ensureDataExists();

  console.log("\n--- Starting Modular Quran Corpus Build ---");

  buildCoreDatabase();
  buildTranslationDatabases();
  buildTransliterationDatabases();
  buildTafsirDatabases();
  buildInfoDatabases();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAll modular databases are up to date! (Completed in ${duration}s)`);
}

runBuild().catch((err) => {
  console.error("Error building Modular Quran Corpus:", err);
  process.exit(1);
});