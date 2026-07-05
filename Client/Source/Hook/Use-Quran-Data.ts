// @/Hook/Use-Quran-Data.ts
import { useQuery } from '@tanstack/react-query';
import { useApp, type QuranFontFamily } from '@/Context/App';

export type QuranFontType = "V1" | "V2" | "Standard";

export interface AssembledVerse {
  verseNumber: number;
  arabic: string;
  arabicV1?: string | null;
  arabicV2?: string | null;
  translation?: string;
  transliteration?: string;
  words: string[];
  wordsV1?: string[] | null;
  wordsV2?: string[] | null;
  wbwTranslation?: string[];
  wbwTranslationHover?: string[];
  wbwTranslationInline?: string[];
  wbwTransliteration?: string[];
  wbwTransliterationHover?: string[];
  wbwTransliterationInline?: string[];
}

export interface AssembledSurah {
  id: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  pages: [number, number];
  verses: AssembledVerse[];
}

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

// Safe dictionary to map application UI labels to actual backend keys
const BACKEND_IDENTIFIER_MAP: Record<string, string> = {
  "Direct": "en.transliteration", // Adjust this value to your backend's exact layout standard key
  "Standard": "en.transliteration",
  "Saheeh-International": "en.sahih",
  "None": "",
};

function mapFontToDataType(font: QuranFontFamily): QuranFontType {
  switch (font) {
    case "uthmani_v1": return "V1";
    case "uthmani_v2":
    case "uthmani_v4": return "V2";
    default: return "Standard";
  }
}

function normalizeParam(value: string | boolean | undefined): string | undefined {
  if (!value || value === "None") return undefined;
  if (typeof value === "string" && BACKEND_IDENTIFIER_MAP[value] !== undefined) {
    return BACKEND_IDENTIFIER_MAP[value] || undefined;
  }
  return String(value);
}

/**
 * Picks the arabic text + word array matching the active font variant.
 * Falls back to Standard if the requested variant isn't present on the verse
 * (e.g. backend didn't precompute it, or the source file was missing).
 */
function selectVariant(verse: AssembledVerse, fontType: QuranFontType): AssembledVerse {
  if (fontType === "V1" && verse.arabicV1 && verse.wordsV1) {
    return { ...verse, arabic: verse.arabicV1, words: verse.wordsV1 };
  }
  if (fontType === "V2" && verse.arabicV2 && verse.wordsV2) {
    return { ...verse, arabic: verse.arabicV2, words: verse.wordsV2 };
  }
  return verse;
}

export function useQuranData(surahNumber: number) {
  const {
    verseTranslation,
    hoverTranslation,
    inlineTranslation,
    quranFont,
    selectedTranslator,
    selectedAyahTransliterator,
    hoverTransliteration,
    inlineTransliteration,
  } = useApp();

  const fontType = mapFontToDataType(quranFont);

  // Normalize all states into valid engine database identifiers
  const translationSource = verseTranslation && selectedTranslator ? normalizeParam(selectedTranslator) : undefined;
  const wbwTranslationHover = normalizeParam(hoverTranslation);
  const wbwTranslationInline = normalizeParam(inlineTranslation);
  const transliterationStyle = normalizeParam(selectedAyahTransliterator);
  const wbwTransliterationHover = normalizeParam(hoverTransliteration);
  const wbwTransliterationInline = normalizeParam(inlineTransliteration);

  return useQuery<AssembledSurah, Error>({
    queryKey: [
      'surah',
      surahNumber,
      translationSource,
      wbwTranslationHover,
      wbwTranslationInline,
      fontType,
      transliterationStyle,
      wbwTransliterationHover,
      wbwTransliterationInline,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (translationSource) params.append("translation", translationSource);
      if (wbwTranslationHover) params.append("wbwTranslationHover", wbwTranslationHover);
      if (wbwTranslationInline) params.append("wbwTranslationInline", wbwTranslationInline);
      if (fontType) params.append("fontType", fontType);
      if (transliterationStyle) params.append("transliteration", transliterationStyle);
      if (wbwTransliterationHover) params.append("wbwTransliterationHover", wbwTransliterationHover);
      if (wbwTransliterationInline) params.append("wbwTransliterationInline", wbwTransliterationInline);

      const url = `${BACKEND_BASE_URL}/api/surah/${surahNumber}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch surah data context: ${response.statusText}`);
      }

      const data: AssembledSurah = await response.json();

      return {
        ...data,
        verses: data.verses.map((verse) => selectVariant(verse, fontType)),
      };
    },
    staleTime: 1000 * 60 * 60,      // 1 hour
    gcTime: 1000 * 60 * 60 * 24,    // 1 day
    retry: 2,
    refetchOnWindowFocus: false,
  });
}