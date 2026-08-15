import fs from "fs";
import path from "path";
import https from "https";

const OUTPUT_DIR_V1 = "./Server/Al-Bayanat/Al-Quran/As-Suwar/Ashkal-Al-Ard/B";
const OUTPUT_DIR_V2 = "./Server/Al-Bayanat/Al-Quran/As-Suwar/Ashkal-Al-Ard/A";
const OUTPUT_DIR_UTHMANI = "./Server/Al-Bayanat/Al-Quran/As-Suwar";

function clearDirectory(dirPath, onlyJson = false) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const curPath = path.join(dirPath, file);
      const isDir = fs.lstatSync(curPath).isDirectory();

      if (onlyJson) {
        if (!isDir && path.extname(curPath).toLowerCase() === ".json") {
          fs.unlinkSync(curPath);
        }
      } else {
        if (isDir) {
          clearDirectory(curPath, false);
          fs.rmdirSync(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      }
    }
    console.log(`Cleared target files in ${dirPath}`);
  } else {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function fetchQuranData(surahNumber, endpoint, dataKey, removeSpaces = false) {
  const url = `https://api.quran.com/api/v4/${endpoint}?chapter_number=${surahNumber}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            const items = parsed.verses || parsed.quran;
            if (!items) {
              return reject(new Error(`No data array found for Surah ${surahNumber} (${endpoint})`));
            }
            const results = items.map((v) => {
              let text = v[dataKey] || "";
              if (removeSpaces) {
                text = text.replace(/\s+/g, "");
              }
              return text;
            });
            resolve(results);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

async function downloadAllSurahs() {
  console.log("Clearing existing JSON files in V1, V2, and directly in As-Suwar...");
  clearDirectory(OUTPUT_DIR_V1, true);
  clearDirectory(OUTPUT_DIR_V2, true);
  
  if (fs.existsSync(OUTPUT_DIR_UTHMANI)) {
    const files = fs.readdirSync(OUTPUT_DIR_UTHMANI);
    for (const file of files) {
      const curPath = path.join(OUTPUT_DIR_UTHMANI, file);
      if (!fs.lstatSync(curPath).isDirectory() && path.extname(curPath).toLowerCase() === ".json") {
        fs.unlinkSync(curPath);
      }
    }
    console.log(`Cleared JSON files directly in ${OUTPUT_DIR_UTHMANI}`);
  } else {
    fs.mkdirSync(OUTPUT_DIR_UTHMANI, { recursive: true });
  }

  console.log(`\nStarting retrieval of code_v1 files (without spaces)...`);
  for (let i = 1; i <= 114; i++) {
    try {
      const ayahs = await fetchQuranData(i, `quran/verses/code_v1`, "code_v1", true);
      const filePath = path.join(OUTPUT_DIR_V1, `${i}.json`);

      fs.writeFileSync(filePath, JSON.stringify(ayahs, null, 2), "utf-8");
      console.log(`[V1] [${i}/114] Saved Surah ${i} -> ${filePath}`);
    } catch (err) {
      console.error(`[Error V1] Failed to process Surah ${i}:`, err.message);
    }
  }

  console.log(`\nStarting retrieval of code_v2 files (without spaces)...`);
  for (let i = 1; i <= 114; i++) {
    try {
      const ayahs = await fetchQuranData(i, `quran/verses/code_v2`, "code_v2", true);
      const filePath = path.join(OUTPUT_DIR_V2, `${i}.json`);

      fs.writeFileSync(filePath, JSON.stringify(ayahs, null, 2), "utf-8");
      console.log(`[V2] [${i}/114] Saved Surah ${i} -> ${filePath}`);
    } catch (err) {
      console.error(`[Error V2] Failed to process Surah ${i}:`, err.message);
    }
  }

  console.log(`\nStarting retrieval of Uthmani files directly into As-Suwar...`);
  for (let i = 1; i <= 114; i++) {
    try {
      const ayahs = await fetchQuranData(i, `quran/uthmani`, "text_uthmani", false);
      const filePath = path.join(OUTPUT_DIR_UTHMANI, `${i}.json`);

      fs.writeFileSync(filePath, JSON.stringify(ayahs, null, 2), "utf-8");
      console.log(`[Uthmani] [${i}/114] Saved Surah ${i} -> ${filePath}`);
    } catch (err) {
      console.error(`[Error Uthmani] Failed to process Surah ${i}:`, err.message);
    }
  }

  console.log(`\nCompleted downloading all V1, V2, and Uthmani surah files successfully.`);
}

downloadAllSurahs();