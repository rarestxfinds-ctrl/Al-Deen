import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const FORCE_REBUILD = process.argv.includes("--force");

export const SERVER_ROOT = path.resolve(__dirname, "..", "..");
export const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..", "..");

export const GITHUB_USER = "hyrenum";
export const GITHUB_REPO = "ios-joyful-revamp";
export const RELEASE_TAG = "1.0.0";
export const ARCHIVE_NAME = "quran_data.tar.gz";

export const RELEASE_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${ARCHIVE_NAME}`;

export const DATA_DIR = path.join(SERVER_ROOT, "Data");
export const QURAN_DIR = path.join(DATA_DIR, "Quran");
export const META_DIR = path.join(QURAN_DIR, "Meta");
export const SURAH_DIR = path.join(QURAN_DIR, "Surah");

export const TRANSLATION_BASE_DIR = path.join(SURAH_DIR, "Translation");
export const TRANSLITERATION_BASE_DIR = path.join(SURAH_DIR, "Transliteration");
export const TAFSIR_BASE_DIR = path.join(SURAH_DIR, "Tafsir");
export const INFO_BASE_DIR = path.join(SURAH_DIR, "Information");

export const PRESENTATION_V2_DIR = path.join(SURAH_DIR, "Presentation-Form-A", "Glyph-Based");
export const PRESENTATION_V1_DIR = path.join(SURAH_DIR, "Presentation-Form-A", "Ligature-Based");

export const CORPUS_QURAN_OUTPUT_DIR = path.resolve(SERVER_ROOT, "Asset", "Corpus", "Quran");