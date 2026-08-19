import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolves to Server/
export const SERVER_ROOT: string = path.resolve(__dirname, "..", "..");

// Base Input & Output Directories
export const HADITH_DATA_DIR: string = path.join(SERVER_ROOT, "Data", "Hadith");
export const HADITH_OUTPUT_DIR: string = path.join(SERVER_ROOT, "Asset", "Corpus", "Hadith");

// Domain Specific Input Directories
export const HADITH_ARABIC_DATA_DIR: string = path.join(HADITH_DATA_DIR, "Arabic");
export const HADITH_TRANSLATION_DATA_DIR: string = path.join(HADITH_DATA_DIR, "Translation");
export const HADITH_TRANSLITERATION_DATA_DIR: string = path.join(HADITH_DATA_DIR, "Transliteration");

// Domain Specific Output Directories
export const HADITH_ARABIC_OUTPUT_DIR: string = path.join(HADITH_OUTPUT_DIR, "Arabic");
export const HADITH_TRANSLATION_OUTPUT_DIR: string = path.join(HADITH_OUTPUT_DIR, "Translation");
export const HADITH_TRANSLITERATION_OUTPUT_DIR: string = path.join(HADITH_OUTPUT_DIR, "Transliteration");