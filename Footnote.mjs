import * as fs from "fs";
import * as path from "path";

const FOOTNOTE_DIR = path.join(
  process.cwd(),
  "Server",
  "Data",
  "Quran",
  "Surah",
  "Translation",
  "English",
  "Saheeh-International",
  "Footnote"
);

const TRANSLATION_ID = 20; // Saheeh International

async function fetchFootnoteText(footnoteId) {
  try {
    const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${footnoteId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.foot_note?.text?.replace(/<[^>]*>/g, "").trim() || null;
  } catch {
    return null;
  }
}

async function buildAllFootnotes() {
  if (!fs.existsSync(FOOTNOTE_DIR)) {
    fs.mkdirSync(FOOTNOTE_DIR, { recursive: true });
  }

  console.log("Starting footnote extraction for 114 Surahs...");

  for (let surahNum = 1; surahNum <= 114; surahNum++) {
    console.log(`Processing Surah ${surahNum}...`);
    const url = `https://api.quran.com/api/v4/quran/translations/${TRANSLATION_ID}?chapter_number=${surahNum}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const translations = data.translations || [];

      // Single flat array to collect all footnote strings in order
      const surahFootnotes = [];

      for (const item of translations) {
        const text = item.text || "";
        
        // Extract footnote IDs embedded in tags like <sup foot_note="1234">
        const matches = [...text.matchAll(/foot_note="?(\d+)"?/g)];
        const footnoteIds = matches.map((m) => parseInt(m[1], 10));

        // Fetch each footnote's text string directly into the flat array
        for (const fnId of footnoteIds) {
          const fnText = await fetchFootnoteText(fnId);
          if (fnText) {
            surahFootnotes.push(fnText);
          }
          // Small throttle to avoid hitting API rate limits
          await new Promise((r) => setTimeout(r, 50));
        }
      }

      const outputFile = path.join(FOOTNOTE_DIR, `${surahNum}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(surahFootnotes, null, 2), "utf-8");
      console.log(` -> Saved Surah ${surahNum} to ${surahNum}.json`);
    } catch (err) {
      console.error(`Error on Surah ${surahNum}:`, err.message);
    }
  }

  console.log("Done generating all footnote files.");
}

buildAllFootnotes();