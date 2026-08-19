import * as fs from "fs";
import * as path from "path";

const DATA_HADITH_DIR = path.resolve(
  process.cwd(),
  "Server",
  "Data",
  "Hadith"
);

const ARABIC_INTRO_DIR = path.join(
  DATA_HADITH_DIR,
  "Arabic",
  "Sahih",
  "Muslim",
  "Introduction"
);

const ENGLISH_INTRO_DIR = path.join(
  DATA_HADITH_DIR,
  "Translation",
  "English",
  "Sahih",
  "Muslim",
  "Introduction"
);

const AHMED_BASET_MUSLIM_INTRO_URL =
  "https://raw.githubusercontent.com/AhmedBaset/hadith-json/v1.2.0/db/by_chapter/the_9_books/muslim/introduction.json";

interface HadithPayload {
  id: number;
  chapterId: number;
  bookId: number;
  arabic: string;
  english: {
    narrator: string;
    text: string;
  };
}

interface ChapterPayload {
  hadiths?: HadithPayload[];
  data?: HadithPayload[];
  [key: string]: unknown;
}

function cleanString(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["']|["']$/g, "");
}

async function downloadMuslimIntroduction(): Promise<void> {
  console.log("Fetching Sahih Muslim Introduction from AhmedBaset v1.2.0...");

  try {
    const response = await fetch(AHMED_BASET_MUSLIM_INTRO_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as HadithPayload[] | ChapterPayload;

    let hadiths: HadithPayload[] = [];
    if (Array.isArray(json)) {
      hadiths = json;
    } else if (json && typeof json === "object") {
      if (Array.isArray(json.hadiths)) {
        hadiths = json.hadiths;
      } else if (Array.isArray(json.data)) {
        hadiths = json.data;
      } else {
        const foundArray = Object.values(json).find((val) => Array.isArray(val));
        if (foundArray) {
          hadiths = foundArray as HadithPayload[];
        }
      }
    }

    if (!hadiths || hadiths.length === 0) {
      throw new Error("No hadiths found in the response payload.");
    }

    if (!fs.existsSync(ARABIC_INTRO_DIR)) {
      fs.mkdirSync(ARABIC_INTRO_DIR, { recursive: true });
    }
    if (!fs.existsSync(ENGLISH_INTRO_DIR)) {
      fs.mkdirSync(ENGLISH_INTRO_DIR, { recursive: true });
    }

    let savedArabicCount = 0;
    let savedEnglishCount = 0;

    hadiths.forEach((h, idx) => {
      const fileNumber = idx + 1; // 1.json, 2.json...
      const cleanedArabic = cleanString(h.arabic);

      // 1. Save Arabic Array: [arabicText, idInBook, id]
      if (cleanedArabic) {
        const arabicFilePath = path.join(ARABIC_INTRO_DIR, `${fileNumber}.json`);
        const idInBook = fileNumber;
        const globalId = h.id ?? fileNumber;

        const arabicArray = [cleanedArabic, idInBook, globalId];

        fs.writeFileSync(
          arabicFilePath,
          JSON.stringify(arabicArray, null, 2),
          "utf-8"
        );
        savedArabicCount++;
      }

      // 2. Save English Translation Array: [narrator, text]
      if (h.english) {
        const narrator = cleanString(h.english.narrator);
        const text = cleanString(h.english.text);

        if (narrator || text) {
          const englishFilePath = path.join(ENGLISH_INTRO_DIR, `${fileNumber}.json`);
          const englishArray: string[] = [];

          if (narrator) englishArray.push(narrator);
          if (text) englishArray.push(text);

          fs.writeFileSync(
            englishFilePath,
            JSON.stringify(englishArray, null, 2),
            "utf-8"
          );
          savedEnglishCount++;
        }
      }
    });

    console.log(`\nSuccessfully processed Muslim Introduction!`);
    console.log(` - Saved Arabic arrays [text, idInBook, id]: ${savedArabicCount}`);
    console.log(` - Saved English arrays [narrator, text]: ${savedEnglishCount}`);
  } catch (error) {
    console.error("Failed to download or parse Introduction:", error);
    process.exit(1);
  }
}

downloadMuslimIntroduction();