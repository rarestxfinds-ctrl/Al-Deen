// Scripts/Build-Aid-Corpus.mjs
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Updated data directory path
const AID_DATA_DIR = path.join(ROOT, "Data", "Aid");
const OUTPUT_FILE = path.join(ROOT, "Corpus", "AidCorpus.json");

function formatNameFromId(id) {
  if (!id) return "";
  return id
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function buildAidCorpus() {
  console.log("🚀 Starting Aid Corpus Compiler...");
  console.log(`📂 Source: ${AID_DATA_DIR}`);

  // 1. Alphabet Data Compilation
  const alphabetRaw = safeReadJson(path.join(AID_DATA_DIR, "Alphabet", "Letter.json")) || [];
  const alphabet = alphabetRaw.map((l) => ({
    id: l.id || nanoid(),
    name: l.name || "",
    forms: l.forms || { isolated: "", initial: "", medial: "", final: "" },
    pronunciation: l.pronunciation || "",
    example: l.example || "",
    exampleTranslation: l.exampleTranslation || ""
  }));

  // 2. Tajweed Deep Tree Processing
  const tajweedDir = path.join(AID_DATA_DIR, "Tajweed");
  const tajweedCategories = [];

  if (fs.existsSync(tajweedDir)) {
    const topFolders = fs.readdirSync(tajweedDir).filter(f => fs.statSync(path.join(tajweedDir, f)).isDirectory());

    for (const folder of topFolders) {
      const folderPath = path.join(tajweedDir, folder);
      const elements = fs.readdirSync(folderPath);

      let parentDescription = "";
      const parentJson = safeReadJson(path.join(folderPath, "parent.json"));
      if (Array.isArray(parentJson) && typeof parentJson[0] === "string") {
        parentDescription = parentJson[0];
      }

      const subfoldersList = [];
      const subcategoriesList = [];
      let hasSubfolders = false;

      for (const element of elements) {
        const elementPath = path.join(folderPath, element);
        if (fs.statSync(elementPath).isDirectory()) {
          hasSubfolders = true;
          
          const innerFiles = fs.readdirSync(elementPath).filter(f => f.endsWith(".json"));
          let subfolderParentDesc = "";
          const subInnerParent = safeReadJson(path.join(elementPath, "parent.json"));
          if (Array.isArray(subInnerParent) && typeof subInnerParent[0] === "string") {
            subfolderParentDesc = subInnerParent[0];
          }

          const nestedSubcategories = [];
          for (const f of innerFiles) {
            if (f.toLowerCase() === "parent.json") continue;
            const fileData = safeReadJson(path.join(elementPath, f));
            if (!fileData) continue;

            const filename = f.replace(".json", "");
            nestedSubcategories.push(parseTajweedFile(filename, fileData));
          }

          const subBaseName = formatNameFromId(element);
          subfoldersList.push({
            id: element,
            name: subfolderParentDesc ? `${subBaseName} - ${subfolderParentDesc}` : subBaseName,
            subcategories: nestedSubcategories
          });
        } else if (element.endsWith(".json") && element.toLowerCase() !== "parent.json") {
          const fileData = safeReadJson(elementPath);
          if (fileData) {
            const filename = element.replace(".json", "");
            subcategoriesList.push(parseTajweedFile(filename, fileData));
          }
        }
      }

      const categoryBaseName = formatNameFromId(folder);
      const categoryDisplayName = parentDescription ? `${categoryBaseName} - ${parentDescription}` : categoryBaseName;

      tajweedCategories.push({
        id: folder,
        name: categoryDisplayName,
        description: hasSubfolders ? `${subfoldersList.length} sections` : `${subcategoriesList.length} rules`,
        icon: "BookOpen",
        color: "#8B5CF6",
        hasSubfolders,
        subfolders: subfoldersList,
        subcategories: subcategoriesList
      });
    }
  }

  function parseTajweedFile(filename, data) {
    let description = "";
    let rulesArray = [];

    if (Array.isArray(data) && data.length >= 2) {
      if (typeof data[1] === 'string' && Array.isArray(data[2])) {
        description = data[1];
        rulesArray = data[2];
      } else if (Array.isArray(data[1])) {
        description = data[0];
        rulesArray = data[1];
      }
    }

    const rules = rulesArray.map((rule) => ({
      letter: rule[0] || "",
      transliteration: rule[1] || "",
      description: rule[2] || "",
      example: rule[3] || "",
      exampleTranslation: rule[4] || "",
    }));

    return {
      id: filename,
      name: formatNameFromId(filename),
      description,
      rules
    };
  }

  // 3. Duas Collection Compilation
  const duaDir = path.join(AID_DATA_DIR, "Dua");
  const duas = [];
  if (fs.existsSync(duaDir)) {
    const files = fs.readdirSync(duaDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const data = safeReadJson(path.join(duaDir, file)) || [];
      const filename = file.replace(".json", "");
      
      const parsedDuas = data.map((item) => {
        if (!Array.isArray(item)) return { id: nanoid(), arabic: "", translation: "", reference: "" };
        if (item.length >= 5) {
          return {
            id: nanoid(),
            arabic: item[0],
            transliteration: item[1],
            translation: item[2],
            wbw: Array.isArray(item[3]) ? item[3] : undefined,
            reference: item[4],
          };
        }
        return {
          id: nanoid(),
          arabic: item[0] || "",
          translation: item[1] || "",
          reference: item[2] || "",
        };
      });

      duas.push({
        name: formatNameFromId(filename),
        duas: parsedDuas
      });
    }
  }

  // 4. Feelings Segment Compilation
  const feelingDir = path.join(AID_DATA_DIR, "Feeling");
  const feelings = [];
  if (fs.existsSync(feelingDir)) {
    const files = fs.readdirSync(feelingDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const arr = safeReadJson(path.join(feelingDir, file)) || [];
      const id = file.replace(".json", "");
      feelings.push({
        id,
        name: id,
        data: {
          verse: arr[0] || "",
          verseRef: arr[1] || "",
          hadith: arr[2] || "",
          hadithRef: arr[3] || "",
          note: arr[4] || ""
        }
      });
    }
  }

  // 5. Pillars Compilation
  const pillarsDir = path.join(AID_DATA_DIR, "Pillars");
  const pillarsList = [];
  if (fs.existsSync(pillarsDir)) {
    const files = fs.readdirSync(pillarsDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const arr = safeReadJson(path.join(pillarsDir, file)) || [];
      const id = file.replace(".json", "");
      const sections = (arr[3] || []).map((s) => ({
        heading: s[0] || "",
        body: s[1] || ""
      }));

      pillarsList.push({
        id,
        name: arr[0] || id,
        english: arr[1] || "",
        source: arr[2] || "",
        sections
      });
    }
  }
  const pillarsOrder = ["Shahadah", "Salah", "Zakat", "Sawm", "Hajj"];
  const pillars = [...pillarsList].sort((a, b) => pillarsOrder.indexOf(a.id) - pillarsOrder.indexOf(b.id));

  // 6. Names Compilation
  const namesDir = path.join(AID_DATA_DIR, "Names");
  const divineNames = [];
  if (fs.existsSync(namesDir)) {
    const files = fs.readdirSync(namesDir).filter(f => f.endsWith(".json"));
    let idx = 1;
    for (const file of files) {
      const dataArray = safeReadJson(path.join(namesDir, file)) || [];
      for (const item of dataArray) {
        divineNames.push({
          index: idx++,
          arabic: item[0] || "",
          english: item[1] || "",
          meaning: item[2] || ""
        });
      }
    }
  }

  // 7. Articles Collection Compilation
  const articlesDir = path.join(AID_DATA_DIR, "Articles");
  const articlesList = [];
  if (fs.existsSync(articlesDir)) {
    const files = fs.readdirSync(articlesDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const arr = safeReadJson(path.join(articlesDir, file)) || [];
      const id = file.replace(".json", "");
      articlesList.push({ id, name: arr[0] || id, source: arr[1] || "" });
    }
  }
  const articlesOrder = ["Allah", "Angels", "Books", "Messengers", "LastDay", "Qadar"];
  const articles = [...articlesList].sort((a, b) => articlesOrder.indexOf(a.id) - articlesOrder.indexOf(b.id));

  // 8. Prophets Collection Compilation
  const prophetsDir = path.join(AID_DATA_DIR, "Prophets");
  const prophetsList = [];
  if (fs.existsSync(prophetsDir)) {
    const files = fs.readdirSync(prophetsDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const arr = safeReadJson(path.join(prophetsDir, file)) || [];
      const id = file.replace(".json", "");
      const sections = (arr[1] || []).map((s) => ({
        heading: s[0] || "",
        body: s[1] || ""
      }));
      prophetsList.push({ id, title: arr[0] || `${id} (عليه السلام)`, sections });
    }
  }
  const prophetsOrder = [
    "Adam", "Idris", "Nuh", "Hud", "Salih", "Ibrahim", "Lut", "Ismail", "Ishaq",
    "Yaqub", "Yusuf", "Ayyub", "Shu'ayb", "Musa", "Harun", "Dhul-Kifl", "Dawud",
    "Sulayman", "Ilyas", "Al-Yasa", "Yunus", "Zakariya", "Yahya", "Isa", "Muhammad"
  ];
  const prophets = [...prophetsList].sort((a, b) => prophetsOrder.indexOf(a.id) - prophetsOrder.indexOf(b.id));

  // 9. Arabic Vocabulary Deep Mapping
  const arabicDir = path.join(AID_DATA_DIR, "Arabic");
  const arabicVocabulary = [];

  if (fs.existsSync(arabicDir)) {
    const scanVocabulary = (currentDir, segments) => {
      const files = fs.readdirSync(currentDir);
      
      for (const item of files) {
        const fullPath = path.join(currentDir, item);
        const isDir = fs.statSync(fullPath).isDirectory();

        if (isDir) {
          scanVocabulary(fullPath, [...segments, item]);
        } else if (item.endsWith(".json")) {
          const dataArray = safeReadJson(fullPath);
          if (!Array.isArray(dataArray) || dataArray.length < 5) continue;

          const fileWordId = item.replace(".json", "");
          
          const vocabIndex = segments.findIndex(s => s === "Vocabulary");
          if (vocabIndex === -1 || vocabIndex + 2 >= segments.length) continue;

          const mainCatName = segments[vocabIndex];       
          const catName = segments[vocabIndex + 1];       
          const subCatName = segments[vocabIndex + 2];    

          let mainCat = arabicVocabulary.find(v => v.id === mainCatName);
          if (!mainCat) {
            mainCat = { id: mainCatName, name: mainCatName, subcategories: [] };
            arabicVocabulary.push(mainCat);
          }

          let category = mainCat.subcategories.find((c) => c.id === catName);
          if (!category) {
            category = { id: catName, name: catName, subcategories: [] };
            mainCat.subcategories.push(category);
          }

          let subcategory = category.subcategories.find((s) => s.id === subCatName);
          if (!subcategory) {
            subcategory = { id: subCatName, name: subCatName, words: [] };
            category.subcategories.push(subcategory);
          }

          subcategory.words.push({
            id: fileWordId,
            english: fileWordId,
            arabic: dataArray[0],
            transliteration: dataArray[1],
            root: dataArray[2],
            arabicDefinition: dataArray[3],
            definition: dataArray[4]
          });
        }
      }
    };

    scanVocabulary(arabicDir, ["Arabic"]);
  }

  // Final Output
  const corpusPayload = {
    metadata: {
      compiledAt: new Date().toISOString(),
      version: "1.0.0"
    },
    alphabet,
    tajweedCategories,
    duas,
    feelings,
    pillars,
    divineNames,
    articles,
    prophets,
    arabicVocabulary
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(corpusPayload, null, 2), "utf-8");
  console.log(`✅ Corpus compiled successfully! Saved to -> ${OUTPUT_FILE}`);
}

buildAidCorpus();