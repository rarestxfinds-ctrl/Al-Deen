// test-payload.ts
import { 
  Fetch_Surah, 
  Fetch_Surah_Translation, 
  Fetch_Surah_Transliteration 
} from "./Server/Source/API/Quran.ts"; // Adjust relative path as needed

console.log("\n==============================================");
console.log("1. TESTING Fetch_Surah(1) [Static Core Structure]");
console.log("==============================================");
const Static_Data = Fetch_Surah(1, "Standard");
if (Static_Data) {
  console.log("Keys in payload:", Object.keys(Static_Data));
  console.log("Sample Surah:", Static_Data.Surah);
  console.log("Sample Ayah[0]:", Static_Data.Ayah[0]);
  console.log("Sample Kalimah[0]:", Static_Data.Kalimah[0]);
  console.log("Sample Page[0]:", Static_Data.Page[0]);
}

console.log("\n==============================================");
console.log("2. TESTING Fetch_Surah_Translation(1, ['English.Saheeh-International'], false)");
console.log("==============================================");
const Translation_Data = Fetch_Surah_Translation(1, ["English.Saheeh-International"], false);
console.log("Keys in payload:", Object.keys(Translation_Data));
console.log("Sample Translation[0]:", Translation_Data.Translation?.[0]);
console.log("Sample Footnote[0]:", Translation_Data.Footnote?.[0]);

console.log("\n==============================================");
console.log("3. TESTING Fetch_Surah_Translation(1, ['English.Saheeh-International'], true) [With WBW]");
console.log("==============================================");
const Translation_WBW_Data = Fetch_Surah_Translation(1, ["English.Saheeh-International"], true);
console.log("Keys in payload:", Object.keys(Translation_WBW_Data));
console.log("Sample WBW_Translation[0]:", Translation_WBW_Data.WBW_Translation?.[0]);

console.log("\n==============================================");
console.log("4. TESTING Fetch_Surah_Transliteration(1, ['Standard'], true)");
console.log("==============================================");
const Transliteration_Data = Fetch_Surah_Transliteration(1, ["Standard"], true);
console.log("Keys in payload:", Object.keys(Transliteration_Data));
console.log("Sample Transliteration[0]:", Transliteration_Data.Transliteration?.[0]);
console.log("Sample WBW_Transliteration[0]:", Transliteration_Data.WBW_Transliteration?.[0]);