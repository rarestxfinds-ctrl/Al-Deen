import * as path from "path";
import { fileURLToPath } from "url";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

export const FORCE_REBUILD: boolean = process.argv.includes("--force");

export const SERVER_ROOT: string = path.resolve(__dirname, "..", "..");
export const WORKSPACE_ROOT: string = path.resolve(__dirname, "..", "..", "..");

export const GITHUB_USER: string = "hyrenum";
export const GITHUB_REPO: string = "ios-joyful-revamp";
export const RELEASE_TAG: string = "1.0.0";
export const ARCHIVE_NAME: string = "quran_data.tar.gz";

export const RELEASE_URL: string = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${ARCHIVE_NAME}`;

export const DATA_DIR: string = path.join(SERVER_ROOT, "Data");
export const QURAN_DIR: string = path.join(DATA_DIR, "Quran");
export const META_DIR: string = path.join(QURAN_DIR, "Meta");
export const SURAH_DIR: string = path.join(QURAN_DIR, "Surah");

export const TRANSLATION_BASE_DIR: string = path.join(SURAH_DIR, "Translation");
export const TRANSLITERATION_BASE_DIR: string = path.join(SURAH_DIR, "Transliteration");
export const TAFSIR_BASE_DIR: string = path.join(SURAH_DIR, "Tafsir");
export const INFO_BASE_DIR: string = path.join(SURAH_DIR, "Information");

export const PRESENTATION_V2_DIR: string = path.join(SURAH_DIR, "Presentation-Form-A", "Glyph-Based");
export const PRESENTATION_V1_DIR: string = path.join(SURAH_DIR, "Presentation-Form-A", "Ligature-Based");

export const CORPUS_QURAN_OUTPUT_DIR: string = path.resolve(SERVER_ROOT, "Asset", "Corpus", "Quran");