import { ensureDataExists } from "./Utility/Downloader.js";
import { buildCoreDatabase } from "./DB/Core.js";
import { buildTranslationDatabases } from "./DB/Translation.js";
import { buildTransliterationDatabases } from "./DB/Transliteration.js";
import { buildTafsirDatabases } from "./DB/Tafsir.js";
import { buildInfoDatabases } from "./DB/Info.js";

async function runBuild() {
  console.log("Checking dataset requirements...");
  await ensureDataExists();

  console.log("\n--- Starting Modular Quran Corpus Build ---");

  buildCoreDatabase();
  buildTranslationDatabases();
  buildTransliterationDatabases();
  buildTafsirDatabases();
  buildInfoDatabases();

  console.log("\nAll modular databases are up to date!");
}

runBuild().catch((err) => {
  console.error("Error building Modular Quran Corpus:", err);
});