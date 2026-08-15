#!/usr/bin/env node
/**
 * Global Translation Mass Ingestion Engine (Quran.com API v4)
 * Pulls translations in batches of 57 and formats output files as flat arrays: ["verse1", "verse2"]
 * Replaces <sup foot_note=X>Y</sup> tags with standardized sequential "Footnote-#" strings.
 */
import fs from "node:fs/promises";
import path from "node:path";

const BATCH_SIZE = 57; 
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Helper: Sanitize paths cleanly to prevent runtime directory string execution breaks
function sanitizePathName(name) {
  return name.replace(/[^a-zA-Z0-9\-_ ]/g, "").trim().replace(/\s+/g, "-");
}

async function fetchSurahTranslationBatch(translationId, surahId) {
  // Ceiling set to 300 to pull the whole chapter in a single pass cleanly
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?translations=${translationId}&per_page=300`;

  try {
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FrameworkFinderIngestEngine/1.0'
      }
    });

    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.verses && Array.isArray(data.verses)) {
      let footnoteCounter = 1;

      return data.verses
        .sort((a, b) => a.verse_number - b.verse_number)
        .map(verse => {
          let cleanText = verse.translations?.[0]?.text || "";
          
          // Match all custom <sup> variations and swap them out for "Footnote-#" format sequentially
          cleanText = cleanText.replace(/<sup[^>]*>.*?<\/sup>/g, () => {
            return `Footnote-${footnoteCounter++}`;
          });

          return cleanText;
        });
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function main() {
  const catalogPath = path.resolve("Server/Data/Quran/Surah/Translation/Available-Translations.json");
  
  try {
    await fs.access(catalogPath);
  } catch {
    console.error(`❌ Missing resource file. Please generate ${catalogPath} first via your discovery script!`);
    process.exit(1);
  }

  const translations = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  console.log(`🚀 Master file resolved: Found ${translations.length} translations inside queue.`);
  console.log(`⚡ Execution Concurrency Limit: ${BATCH_SIZE} targets/batch loop\n`);

  // Outer loop processes individual books sequentially to keep directory creation stable
  for (let tIndex = 0; tIndex < translations.length; tIndex++) {
    const target = translations[tIndex];
    const cleanLang = target.language_name ? target.language_name.charAt(0).toUpperCase() + target.language_name.slice(1) : "Unknown";
    const cleanDirName = sanitizePathName(target.name || target.slug);
    
    const baseOutputDir = path.resolve(`Server/Data/Quran/Surah/Translation/${cleanLang}/${cleanDirName}`);
    await fs.mkdir(baseOutputDir, { recursive: true });

    console.log(`----------------------------------------------------------------`);
    console.log(`📚 BOOK [${tIndex + 1}/${translations.length}]: ${cleanDirName} (${cleanLang})`);
    console.log(`📁 Destination: ${baseOutputDir}`);
    console.log(`----------------------------------------------------------------`);

    // Process all 114 chapters in chunks of 57
    for (let currentSurah = 1; currentSurah <= 114; currentSurah += BATCH_SIZE) {
      const currentBatch = [];
      for (let offset = 0; offset < BATCH_SIZE && (currentSurah + offset) <= 114; offset++) {
        currentBatch.push(currentSurah + offset);
      }

      process.stdout.write(`  ➜ Fetching Surah Chapters [${currentBatch[0]}...${currentBatch[currentBatch.length - 1]}]... `);

      const results = await Promise.all(
        currentBatch.map(async (surahId) => {
          const content = await fetchSurahTranslationBatch(target.id, surahId);
          if (content) {
            const fileDest = path.join(baseOutputDir, `${surahId}.json`);
            await fs.writeFile(fileDest, JSON.stringify(content, null, 2), "utf8");
            return true;
          }
          return false;
        })
      );

      const successfulWrites = results.filter(Boolean).length;
      console.log(`Done (${successfulWrites}/${currentBatch.length} saved)`);

      // Gentle rest delay between batch sets to protect against edge proxy throttling
      await delay(250);
    }
    console.log(`✅ Completed Ingestion for ${cleanDirName}\n`);
  }

  console.log("🏁 GLOBAL DATA EXTRACTION COMPLETE!");
}

main().catch(console.error);