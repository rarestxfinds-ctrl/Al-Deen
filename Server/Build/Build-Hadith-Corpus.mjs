import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); 

const DATA_DIR = path.join(ROOT, "Data", "Hadith");
const OUTPUT_FILE = path.resolve(ROOT, "..", "Client", "Public", "RAG", "HadithCorpus.json");

const collectionRegistry = [
  {
    id: "Sahih-Muslim",
    slug: "Sahih-Muslim",
    name: "Sahih Muslim",
    author: "Muslim",
    topFolder: "Sahih",
    authorFolder: "Muslim",
    description: "Sahih Muslim collection compiled by Imam Muslim.",
  }
];

function cleanString(str) {
  if (!str) return "";
  return str.trim().replace(/^["']|["']$/g, "");
}

function buildCorpus() {
  const finalizedCollections = [];
  let systemWideTotalHadiths = 0;

  for (const registry of collectionRegistry) {
    const chaptersList = [];
    let collectionHadithCount = 0;

    const sourceCollectionPath = path.join(DATA_DIR, "Source", registry.topFolder, registry.authorFolder);

    if (!fs.existsSync(sourceCollectionPath)) {
      continue;
    }

    const chapterFolders = fs.readdirSync(sourceCollectionPath).filter(file => {
      return fs.statSync(path.join(sourceCollectionPath, file)).isDirectory();
    });

    for (const chapFolder of chapterFolders) {
      const sourceChapterPath = path.join(sourceCollectionPath, chapFolder);
      const hadithFiles = fs.readdirSync(sourceChapterPath).filter(file => file.endsWith(".json"));
      
      const compiledHadiths = [];
      hadithFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

      hadithFiles.forEach((filename, globalIndex) => {
        const hadithId = path.basename(filename, ".json");
        const cleanNum = parseInt(hadithId, 10) || 0;
        let arabicText = "";

        const srcFilePath = path.join(sourceChapterPath, filename);
        try {
          const rawSrc = fs.readFileSync(srcFilePath, "utf-8");
          const parsedSrc = JSON.parse(rawSrc);
          if (Array.isArray(parsedSrc) && parsedSrc.length > 0) {
            arabicText = cleanString(parsedSrc[0]);
          } else if (typeof parsedSrc === "string") {
            arabicText = cleanString(parsedSrc);
          }
        } catch {
          // Silent catch for production cleanliness
        }

        compiledHadiths.push({
          i: systemWideTotalHadiths + globalIndex + 1,
          id: hadithId,
          num: cleanNum,
          ar: arabicText,
          na: "" 
        });
      });

      if (compiledHadiths.length > 0) {
        const startId = compiledHadiths[0].id;
        const endId = compiledHadiths[compiledHadiths.length - 1].id;
        const humanizedName = chapFolder.replace(/-/g, " ");

        chaptersList.push({
          id: chapFolder,
          name: humanizedName,
          count: compiledHadiths.length,
          range: `${startId}-${endId}`,
          hadiths: compiledHadiths
        });

        collectionHadithCount += compiledHadiths.length;
        systemWideTotalHadiths += compiledHadiths.length;
      }
    }

    finalizedCollections.push({
      ...registry,
      hadithCount: collectionHadithCount,
      chapters: chaptersList
    });
  }

  const corpusPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalCollections: finalizedCollections.length,
      totalHadiths: systemWideTotalHadiths
    },
    collections: finalizedCollections
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(corpusPayload, null, 2), "utf-8");
}

buildCorpus();