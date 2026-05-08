import ayahs from "@/Bottom/Data/Quran/Meta/Ayahs.json";
import Surah_Translation from "@/Bottom/Data/Quran/Meta/Surah/Translation.json";
import Surah_Transliteration from "@/Bottom/Data/Quran/Meta/Surah/Transliteration.json";
import pageMap from "@/Bottom/Data/Quran/Meta/Page.json";
import juzMap from "@/Bottom/Data/Quran/Meta/Juz.json";
import hizbMap from "@/Bottom/Data/Quran/Meta/Hizb.json";
import place from "@/Bottom/Data/Quran/Meta/Revelation/Place.json";
import order from "@/Bottom/Data/Quran/Meta/Revelation/Order.json";

export type QuranFontType = "Standard" | "V1" | "V2";

export type SurahData = string[];

export type VerseTransliterationData = string[]; // one string per verse
export type TranslationData = string[];

export type KbkData = string[][];

export type SurahLayout = string[][];

// In @/Bottom/API/Quran.ts
export interface AssembledVerse {
  verseNumber: number;
  arabic: string;
  words: string[];
  translation?: string;                        // verse-level
  transliteration?: string;                    // verse-level
  wbwTransliterationHover?: string[];          // hover word-by-word transliteration
  wbwTransliterationInline?: string[];         // inline word-by-word transliteration
  wbwTranslationHover?: string[];              // hover word-by-word translation
  wbwTranslationInline?: string[];             // inline word-by-word translation
}

export interface AssembledSurah {
  id: number;
  verses: AssembledVerse[];
  lines?: string[][];
}

export interface SurahMeta {
  id: number;
  name: string;
  surahFontName: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
  revelationOrder: number;
  pages: [number, number];
  juz: number;
}

export interface JuzInfo {
  juzNumber: number;
  surahs: { id: number }[];
}

export interface PageSegment {
  surah: number;
  startVerse: number;
  startWord: number;
  endVerse: number;
  endWord: number;
}

export type TranslationSource = string;

// ============= Build surahList =============
// First, build a map of which surahs appear on which pages
const surahPageMap: Map<number, { minPage: number; maxPage: number }> = new Map();

if (Array.isArray(pageMap) && pageMap.length > 0) {
  for (let pageNum = 1; pageNum <= pageMap.length; pageNum++) {
    const segments = getPageSegments(pageNum);
    if (!segments) continue;
    
    for (const segment of segments) {
      const surahId = segment.surah;
      if (!surahPageMap.has(surahId)) {
        surahPageMap.set(surahId, { minPage: pageNum, maxPage: pageNum });
      } else {
        const current = surahPageMap.get(surahId)!;
        surahPageMap.set(surahId, {
          minPage: Math.min(current.minPage, pageNum),
          maxPage: Math.max(current.maxPage, pageNum),
        });
      }
    }
  }
}

// Then build surahList using the map
export const surahList: SurahMeta[] = (Array.isArray(ayahs) ? ayahs : []).map((ayahCount, idx) => {
  const id = idx + 1;
  const englishNameTranslation = Array.isArray(Surah_Translation) && Surah_Translation[id - 1] ? Surah_Translation[id - 1] : "";
  const englishNameTransliteration = Array.isArray(Surah_Transliteration) && Surah_Transliteration[id - 1] ? Surah_Transliteration[id - 1] : "";
  const fontName = id.toString().padStart(3, '0');
  const pageRange = surahPageMap.get(id) || { minPage: 1, maxPage: 604 };
  const revelationType = Array.isArray(place) && place[id - 1] ? (place[id - 1] as "Meccan" | "Medinan") : "Meccan";
  const revelationOrder = Array.isArray(order) && order[id - 1] ? order[id - 1] : id;
  const juz = 1;

  const arabicName = "";
  return {
    id,
    name: arabicName,
    surahFontName: fontName,
    englishName: "",
    englishNameTransliteration,
    englishNameTranslation,
    numberOfAyahs: ayahCount,
    revelationType,
    revelationOrder,
    pages: [pageRange.minPage, pageRange.maxPage],
    juz,
  };
});

// ============= Page Map Parser =============
export function getPageSegments(pageNumber: number): PageSegment[] | null {
  if (!pageMap || !Array.isArray(pageMap)) {
    console.error("Page map not loaded properly");
    return null;
  }

  if (pageNumber < 1 || pageNumber > pageMap.length) {
    console.warn(`Page ${pageNumber} not found. Total pages: ${pageMap.length}`);
    return null;
  }
  
  const pageData = pageMap[pageNumber - 1];
  if (!pageData) {
    console.warn(`No data for page ${pageNumber}`);
    return null;
  }
  
  const segments = pageData.split('|');
  
  const result: PageSegment[] = [];
  
  for (const segment of segments) {
    const [start, end] = segment.split('-');
    
    if (!start || !end) {
      console.error(`Invalid segment format: ${segment}`);
      continue;
    }
    
    const startParts = start.split('.');
    if (startParts.length !== 2) {
      console.error(`Invalid start format: ${start}`);
      continue;
    }
    
    const [startSurahVerse, startWord] = startParts;
    const [startSurah, startVerse] = startSurahVerse.split(':');
    
    const endParts = end.split('.');
    if (endParts.length !== 2) {
      console.error(`Invalid end format: ${end}`);
      continue;
    }
    
    const [endSurahVerse, endWord] = endParts;
    const [endSurah, endVerse] = endSurahVerse.split(':');
    
    result.push({
      surah: parseInt(startSurah),
      startVerse: parseInt(startVerse),
      startWord: parseInt(startWord),
      endVerse: parseInt(endVerse),
      endWord: parseInt(endWord),
    });
  }
  
  return result.length > 0 ? result : null;
}

// ============= Juz Map Parser =============
export function getJuzSegments(juzNumber: number): PageSegment[] | null {
  if (!juzMap || !Array.isArray(juzMap)) {
    console.error("Juz map not loaded properly");
    return null;
  }

  if (juzNumber < 1 || juzNumber > juzMap.length) {
    console.warn(`Juz ${juzNumber} not found. Total juz: ${juzMap.length}`);
    return null;
  }
  
  const juzData = juzMap[juzNumber - 1];
  if (!juzData) {
    console.warn(`No data for juz ${juzNumber}`);
    return null;
  }
  
  const segments = juzData.split('|');
  
  const result: PageSegment[] = [];
  
  for (const segment of segments) {
    const [start, end] = segment.split('-');
    
    if (!start || !end) {
      console.error(`Invalid segment format: ${segment}`);
      continue;
    }
    
    const startParts = start.split('.');
    if (startParts.length !== 2) {
      console.error(`Invalid start format: ${start}`);
      continue;
    }
    
    const [startSurahVerse, startWord] = startParts;
    const [startSurah, startVerse] = startSurahVerse.split(':');
    
    const endParts = end.split('.');
    if (endParts.length !== 2) {
      console.error(`Invalid end format: ${end}`);
      continue;
    }
    
    const [endSurahVerse, endWord] = endParts;
    const [endSurah, endVerse] = endSurahVerse.split(':');
    
    result.push({
      surah: parseInt(startSurah),
      startVerse: parseInt(startVerse),
      startWord: parseInt(startWord),
      endVerse: parseInt(endVerse),
      endWord: parseInt(endWord),
    });
  }
  
  return result.length > 0 ? result : null;
}

// ============= Hizb Map Parser =============
export function getHizbSegments(hizbNumber: number): PageSegment[] | null {
  if (!hizbMap || !Array.isArray(hizbMap)) {
    console.error("Hizb map not loaded properly");
    return null;
  }

  if (hizbNumber < 1 || hizbNumber > hizbMap.length) {
    console.warn(`Hizb ${hizbNumber} not found. Total hizb: ${hizbMap.length}`);
    return null;
  }
  
  const hizbData = hizbMap[hizbNumber - 1];
  if (!hizbData) {
    console.warn(`No data for hizb ${hizbNumber}`);
    return null;
  }
  
  const segments = hizbData.split('|');
  
  const result: PageSegment[] = [];
  
  for (const segment of segments) {
    const [start, end] = segment.split('-');
    
    if (!start || !end) {
      console.error(`Invalid segment format: ${segment}`);
      continue;
    }
    
    const startParts = start.split('.');
    if (startParts.length !== 2) {
      console.error(`Invalid start format: ${start}`);
      continue;
    }
    
    const [startSurahVerse, startWord] = startParts;
    const [startSurah, startVerse] = startSurahVerse.split(':');
    
    const endParts = end.split('.');
    if (endParts.length !== 2) {
      console.error(`Invalid end format: ${end}`);
      continue;
    }
    
    const [endSurahVerse, endWord] = endParts;
    const [endSurah, endVerse] = endSurahVerse.split(':');
    
    result.push({
      surah: parseInt(startSurah),
      startVerse: parseInt(startVerse),
      startWord: parseInt(startWord),
      endVerse: parseInt(endVerse),
      endWord: parseInt(endWord),
    });
  }
  
  return result.length > 0 ? result : null;
}

// ============= Build juzData from Juz.json (for backward compatibility) =============
const juzStartMap: number[] = Array.isArray(juzMap) ? juzMap.map(() => 1) : [];
const juzGroups: { [key: number]: number[] } = {};
for (let i = 0; i < juzStartMap.length; i++) {
  const juz = juzStartMap[i];
  if (!juzGroups[juz]) juzGroups[juz] = [];
  juzGroups[juz].push(i + 1);
}
export const juzData: JuzInfo[] = Object.entries(juzGroups).map(([juz, surahIds]) => ({
  juzNumber: parseInt(juz),
  surahs: surahIds.map(id => ({ id })),
}));

// ============= Revelation order array (for backward compatibility) =============
export const revelationOrder: number[] = Array.isArray(order) ? order : [];
export type TransliterationData = string[][]; // word-by-word per verse

// ============= Cache =============
const cache = {
  surah:            new Map<string, SurahData>(),
  translation:      new Map<string, TranslationData>(),
  transliteration:  new Map<string, VerseTransliterationData>(), // verse-level
  wbwTransliteration: new Map<string, TransliterationData>(),    // word-by-word
  WBW:              new Map<string, KbkData>(),
  layout:           new Map<number, SurahLayout | null>(),
  timestamps:       new Map<string, string[][] | string[] | null>(),
}; 
// Add with other glob modules
const transliterationModules = import.meta.glob(
  '@/Bottom/Data/Quran/Surah/Transliteration/*/*.json',
  { import: 'default', eager: false }
);
// ============= Glob Modules =============
const surahAudioModules = import.meta.glob(
  '@/Bottom/Data/Quran/Qiraat/*/Surah/*/Audio.mp3',
  { query: '?url', import: 'default', eager: false }
);
const pageAudioModules = import.meta.glob(
  '@/Bottom/Data/Quran/Qiraat/*/Page/*/Audio.mp3',
  { query: '?url', import: 'default', eager: false }
);
const ayahAudioModules = import.meta.glob(
  '@/Bottom/Data/Quran/Qiraat/*/Surah/*/Ayah/*/Audio.mp3',
  { query: '?url', import: 'default', eager: false }
);
const wordAudioModules = import.meta.glob(
  '@/Bottom/Data/Quran/Qiraat/Tafsir_Center/Surah/*/Ayah/*/Kalima/*/Audio.mp3',
  { query: '?url', import: 'default', eager: false }
);
const surahTimestampModules = import.meta.glob(
  '@/Bottom/Data/Quran/Qiraat/*/Surah/*/Timestamp.json',
  { import: 'default', eager: false }
);
const ayahTimestampModules = import.meta.glob(
  '@/Bottom/Data/Quran/Qiraat/*/Surah/*/Ayah/*/Timestamp.json',
  { import: 'default', eager: false }
);

// ============= Audio key helper =============
function resolveGlobBase(
  modules: Record<string, unknown>,
  marker: string,
): string {
  const anyKey = Object.keys(modules)[0];
  if (!anyKey) return "";
  const idx = anyKey.indexOf(marker);
  return idx !== -1 ? anyKey.slice(0, idx) : "";
}

const surahAudioBase = resolveGlobBase(surahAudioModules, "/Bottom/Data/Quran/Qiraat/");
const pageAudioBase = resolveGlobBase(pageAudioModules, "/Bottom/Data/Quran/Qiraat/");
const ayahAudioBase = resolveGlobBase(ayahAudioModules, "/Bottom/Data/Quran/Qiraat/");
const wordAudioBase = resolveGlobBase(wordAudioModules, "/Bottom/Data/Quran/Qiraat/");
const surahTimestampBase = resolveGlobBase(surahTimestampModules, "/Bottom/Data/Quran/Qiraat/");
const ayahTimestampBase = resolveGlobBase(ayahTimestampModules, "/Bottom/Data/Quran/Qiraat/");

// ============= Loaders =============
async function loadSurah(surahId: number, fontType: QuranFontType = "Standard"): Promise<SurahData> {
  const key = `${fontType}-${surahId}`;
  if (cache.surah.has(key)) return cache.surah.get(key)!;

  let data: any;
  switch (fontType) {
    case "V1":
      data = await import(`@/Bottom/Data/Quran/Surah/Presentation-Form/B/${surahId}.json`);
      break;
    case "V2":
      data = await import(`@/Bottom/Data/Quran/Surah/Presentation-Form/A/${surahId}.json`);
      break;
    default:
      data = await import(`@/Bottom/Data/Quran/Surah/${surahId}.json`);
      break;
  }
  
  // Extract the array from default export if needed
  const raw = data.default ?? data;
  
  // Handle both old and new formats
  let result: string[];
  if (Array.isArray(raw)) {
    result = raw;
  } else if (raw && typeof raw === 'object' && 'Ayah' in raw && Array.isArray(raw.Ayah)) {
    result = raw.Ayah;
  } else {
    console.error(`Invalid surah format for ${surahId}:`, raw);
    result = [];
  }
  
  cache.surah.set(key, result);
  return result;
}

async function loadTranslation(surahId: number, source: TranslationSource): Promise<TranslationData | null> {
  const key = `${source}-${surahId}`;
  if (cache.translation.has(key)) return cache.translation.get(key)!;
  try {
    const module = await import(`@/Bottom/Data/Quran/Surah/Translation/${source}/${surahId}.json`);
    const data: TranslationData = module.default ?? module;
    // data is now directly the array of strings
    cache.translation.set(key, data);
    return data;
  } catch {
    return null;
  }
}
async function loadTransliteration(
  surahId: number,
  style: string
): Promise<VerseTransliterationData | null> {
  const key = `${style}-${surahId}`;
  if (cache.transliteration.has(key)) return cache.transliteration.get(key)!;
  try {
    const module = await import(`@/Bottom/Data/Quran/Surah/Transliteration/${style}/${surahId}.json`);
    const data: VerseTransliterationData = module.default ?? module;
    cache.transliteration.set(key, data);
    return data;
  } catch {
    return null;
  }
}
async function loadKbk(surahId: number): Promise<KbkData | null> {
  const key = `WBW-${surahId}`;
  if (cache.WBW.has(key)) return cache.WBW.get(key)!;
  try {
    const module = await import(`@/Bottom/Data/Quran/Surah/Translation/WBW/${surahId}.json`);
    const data: KbkData = module.default ?? module;
    cache.WBW.set(key, data);
    return data;
  } catch {
    return null;
  }
}
async function loadWbwTransliteration(
  surahId: number,
  style: string
): Promise<TransliterationData | null> {
  const key = `wbw-${style}-${surahId}`;
  if (cache.wbwTransliteration.has(key)) return cache.wbwTransliteration.get(key)!;
  try {
    const module = await import(`@/Bottom/Data/Quran/Surah/Transliteration/WBW/${style}/${surahId}.json`);
    const data: TransliterationData = module.default ?? module;
    cache.wbwTransliteration.set(key, data);
    return data;
  } catch {
    return null;
  }
}

async function loadWbwTranslation(surahId: number, translator: string): Promise<KbkData | null> {
  const key = `wbw-${translator}-${surahId}`;
  if (cache.WBW.has(key)) return cache.WBW.get(key)!;
  try {
    const module = await import(`@/Bottom/Data/Quran/Surah/Translation/WBW/${translator}/${surahId}.json`);
    const data: KbkData = module.default ?? module;
    cache.WBW.set(key, data);
    return data;
  } catch {
    return null;
  }
}
async function loadLayout(surahId: number): Promise<SurahLayout | null> {
  if (cache.layout.has(surahId)) return cache.layout.get(surahId)!;
  try {
    const module = await import(`@/Bottom/Data/Quran/Surah/Layout/${surahId}.json`);
    const raw = module.default ?? module;
    const data: SurahLayout = Array.isArray(raw) ? raw : null;
    cache.layout.set(surahId, data);
    return data;
  } catch {
    cache.layout.set(surahId, null);
    return null;
  }
}

// ============= Audio =============
export async function getSurahAudioUrl(surahId: number, reciter: string): Promise<string | null> {
  const key = `${surahAudioBase}/Bottom/Data/Quran/Qiraat/${reciter}/Surah/${surahId}/Audio.mp3`;
  const mod = surahAudioModules[key];
  if (!mod) return null;
  return (await (mod as () => Promise<string>)());
}

export async function getPageAudioUrl(pageNumber: number, reciter: string): Promise<string | null> {
  const key = `${pageAudioBase}/Bottom/Data/Quran/Qiraat/${reciter}/Page/${pageNumber}/Audio.mp3`;
  const mod = pageAudioModules[key];
  if (!mod) return null;
  return (await (mod as () => Promise<string>)());
}

export async function getAyahAudioUrl(surahId: number, ayahNumber: number, reciter: string): Promise<string | null> {
  const key = `${ayahAudioBase}/Bottom/Data/Quran/Qiraat/${reciter}/Surah/${surahId}/Ayah/${ayahNumber}/Audio.mp3`;
  const mod = ayahAudioModules[key];
  if (!mod) return null;
  return (await (mod as () => Promise<string>)());
}

export async function getWordAudioUrl(surahId: number, ayahNumber: number, kalimaNumber: number): Promise<string | null> {
  const key = `${wordAudioBase}/Bottom/Data/Quran/Qiraat/Tafsir_Center/Surah/${surahId}/Ayah/${ayahNumber}/Kalima/${kalimaNumber}/Audio.mp3`;
  const mod = wordAudioModules[key];
  if (!mod) return null;
  return (await (mod as () => Promise<string>)());
}

// ============= Timestamp Loaders =============
export async function getSurahTimestamps(surahId: number, reciter: string): Promise<string[][] | null> {
  const cacheKey = `${reciter}-surah-${surahId}`;
  if (cache.timestamps.has(cacheKey)) return cache.timestamps.get(cacheKey) as string[][] | null;
  try {
    const key = `${surahTimestampBase}/Bottom/Data/Quran/Qiraat/${reciter}/Surah/${surahId}/Timestamp.json`;
    const mod = surahTimestampModules[key];
    if (!mod) {
      cache.timestamps.set(cacheKey, null);
      return null;
    }
    const data = (await (mod as () => Promise<string[][]>))() as string[][];
    cache.timestamps.set(cacheKey, data);
    return data;
  } catch {
    cache.timestamps.set(cacheKey, null);
    return null;
  }
}

export async function getAyahTimestamps(surahId: number, ayahNumber: number, reciter: string): Promise<string[] | null> {
  const cacheKey = `${reciter}-surah-${surahId}-ayah-${ayahNumber}`;
  if (cache.timestamps.has(cacheKey)) return cache.timestamps.get(cacheKey) as string[] | null;
  try {
    const key = `${ayahTimestampBase}/Bottom/Data/Quran/Qiraat/${reciter}/Surah/${surahId}/Ayah/${ayahNumber}/Timestamp.json`;
    const mod = ayahTimestampModules[key];
    if (!mod) {
      cache.timestamps.set(cacheKey, null);
      return null;
    }
    const data = (await (mod as () => Promise<string[]>))() as string[];
    cache.timestamps.set(cacheKey, data);
    return data;
  } catch {
    cache.timestamps.set(cacheKey, null);
    return null;
  }
}

// ============= Main API =============
// In @/Bottom/API/Quran (Quran.ts)
export async function getSurah(
  surahId: number,
  options: {
    translation?: TranslationSource;
    wbwTranslationHover?: string;
    wbwTranslationInline?: string;
    fontType?: QuranFontType;
    transliteration?: string;                  // verse-level
    wbwTransliterationHover?: string;          // word-by-word
    wbwTransliterationInline?: string;         // word-by-word
  } = {}
): Promise<AssembledSurah> {
  const fontType = options.fontType ?? "Standard";

  const [
    surahData,
    translationData,
    transliterationData,               // verse-level
    wbwTransliterationHoverData,       // word-by-word
    wbwTransliterationInlineData,      // word-by-word
    wbwTranslationHoverData,
    wbwTranslationInlineData,
    layoutData,
  ] = await Promise.all([
    loadSurah(surahId, fontType),
    options.translation ? loadTranslation(surahId, options.translation) : Promise.resolve(null),
    options.transliteration ? loadTransliteration(surahId, options.transliteration) : Promise.resolve(null),
    options.wbwTransliterationHover ? loadWbwTransliteration(surahId, options.wbwTransliterationHover) : Promise.resolve(null),
    options.wbwTransliterationInline ? loadWbwTransliteration(surahId, options.wbwTransliterationInline) : Promise.resolve(null),
    options.wbwTranslationHover ? loadWbwTranslation(surahId, options.wbwTranslationHover) : Promise.resolve(null),
    options.wbwTranslationInline ? loadWbwTranslation(surahId, options.wbwTranslationInline) : Promise.resolve(null),
    loadLayout(surahId),
  ]);

  const verses: AssembledVerse[] = surahData.map((arabic, index) => {
    const verseIndex = index;
    return {
      verseNumber: index + 1,
      arabic,
      words: fontType === "V1" ? arabic.split("") : arabic.split(" "),
      ...(translationData && { translation: translationData[index] }),
      ...(transliterationData && { transliteration: transliterationData[index] }),
      ...(wbwTransliterationHoverData && wbwTransliterationHoverData[verseIndex] && {
        wbwTransliterationHover: wbwTransliterationHoverData[verseIndex],
      }),
      ...(wbwTransliterationInlineData && wbwTransliterationInlineData[verseIndex] && {
        wbwTransliterationInline: wbwTransliterationInlineData[verseIndex],
      }),
      ...(wbwTranslationHoverData && wbwTranslationHoverData[index] && {
        wbwTranslationHover: wbwTranslationHoverData[index],
      }),
      ...(wbwTranslationInlineData && wbwTranslationInlineData[index] && {
        wbwTranslationInline: wbwTranslationInlineData[index],
      }),
    };
  });

  return { id: surahId, verses, lines: layoutData ?? undefined };
}

export async function getVerse(
  surahId: number,
  verseNumber: number,
  options: {
    translation?: TranslationSource;
    wbw?: boolean;
    fontType?: QuranFontType;
  } = {}
): Promise<AssembledVerse | null> {
  const surah = await getSurah(surahId, options);
  return surah.verses[verseNumber - 1] ?? null;
}

export function getSurahMeta(surahId: number): SurahMeta | null {
  return surahList.find((s) => s.id === surahId) ?? null;
}
// Add these exports at the bottom of Quran.ts

export const getJuzCount = (): number => {
  return Array.isArray(juzMap) ? juzMap.length : 0;
};

export const getHizbCount = (): number => {
  return Array.isArray(hizbMap) ? hizbMap.length : 0;
};

export const getPageCount = (): number => {
  return Array.isArray(pageMap) ? pageMap.length : 0;
};
export function getJuzInfo(juzNumber: number): JuzInfo | null {
  return juzData.find((j) => j.juzNumber === juzNumber) ?? null;
}

export function getSurahsByRevelationOrder(): SurahMeta[] {
  return [...surahList].sort((a, b) => a.revelationOrder - b.revelationOrder);
}