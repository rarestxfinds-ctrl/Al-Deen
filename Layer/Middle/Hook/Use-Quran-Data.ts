// Middle/Hook/Use-Quran-Data.ts
import { useQuery } from '@tanstack/react-query';
import { getSurah, type AssembledSurah, type QuranFontType } from '@/Bottom/API/Quran';
import { useApp, type QuranFontFamily } from '@/Middle/Context/App';

function mapFontToDataType(font: QuranFontFamily): QuranFontType {
  switch (font) {
    case "uthmani_v1": return "V1";
    case "uthmani_v2":
    case "uthmani_v4": return "V2";
    default: return "Standard";
  }
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
  const needsVerseTranslation = verseTranslation;

  // Verse-level translation (full ayah)
  const translationSource = needsVerseTranslation && selectedTranslator
    ? selectedTranslator
    : undefined;

  // Word‑by‑word translation – separate for hover and inline
  const wbwTranslationHover = hoverTranslation !== "None" ? hoverTranslation : undefined;
  const wbwTranslationInline = inlineTranslation !== "None" ? inlineTranslation : undefined;

  // Verse‑level transliteration (full ayah)
  const transliterationStyle = selectedAyahTransliterator !== "None"
    ? selectedAyahTransliterator
    : undefined;

  // Word‑by‑word transliteration – separate for hover and inline
  const wbwTransliterationHover = hoverTransliteration !== "None" ? hoverTransliteration : undefined;
  const wbwTransliterationInline = inlineTransliteration !== "None" ? inlineTransliteration : undefined;

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
      return await getSurah(surahNumber, {
        translation: translationSource,
        wbwTranslationHover,
        wbwTranslationInline,
        fontType,
        transliteration: transliterationStyle,
        wbwTransliterationHover,
        wbwTransliterationInline,
      });
    },
    staleTime: 1000 * 60 * 60,      // 1 hour
    gcTime: 1000 * 60 * 60 * 24,    // 1 day
    retry: 2,
    refetchOnWindowFocus: false,
  });
}