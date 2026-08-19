// Client/Web/Component/Quran/Layout/Page/PageView.tsx
import React, { useMemo, useState, useRef } from "react";
import { useApp } from "@Web/Context/App";
import { PageCard } from "./PageCard";
import type { PageViewProps, ResolvedWord, BasmalahWord, PageAyahs } from "./Types";
import { getArabicField, pickArabicText } from "../Utils";
import { useQuery } from "@tanstack/react-query";
import { Fetch_Surah_Details, Fetch_Page_Sections_Corpus, Fetch_Pages } from "@/Library/Quran-API";
import type { Surah_Details, Page_Sections, Word_Entry } from "@/Library/Quran-API";
import type { Surah_Metadata, Ayah, Page } from "@/Library/Quran-Types";

const RAW_SCRIPT_FIELD_MAP: Record<string, string> = {
  Arabic_V1: "Presentation_Form_A_Ligature_Based",
  Arabic_V2: "Presentation_Form_A_Glyph_Based",
};

// NOTE: field names are lowercase (glyph/translation/transliteration) to match
// the BismillahWord props consumed by Client/Web/Component/Quran/Bismillah.tsx.
// Previously these were capitalized (Glyph/Translation/Transliteration), which
// meant `word.glyph` etc. resolved to `undefined` inside Bismillah and rendered
// as invisible text. Keep this shape in sync with BasmalahWord in ./Types.
const STANDARD_BASMALAH_WORDS: BasmalahWord[] = [
  { glyph: "بِسْمِ", translation: "In the name of", transliteration: "Bismi" },
  { glyph: "ٱللَّهِ", translation: "Allah", transliteration: "Allahi" },
  { glyph: "ٱلرَّحْمَٰنِ", translation: "the Entirely Merciful", transliteration: "ar-Rahmani" },
  { glyph: "ٱلرَّحِيمِ", translation: "the Especially Merciful", transliteration: "ar-Rahim" },
];

function pickRawArabicText(
  item: Ayah | Word_Entry,
  field: ReturnType<typeof getArabicField>
): string {
  const rawField = RAW_SCRIPT_FIELD_MAP[field] ?? field;
  return pickArabicText(item as any, rawField as any);
}

function parsePageSections(section?: any): { surah: number; startVerse: number; endVerse: number }[] | null {
  if (!section) return null;

  if (typeof section === "object") {
    if (Array.isArray(section)) {
      return section.map((entry: any) => ({
        surah: entry.surah ?? entry["Surah"],
        startVerse: entry.startVerse ?? entry["Start_Ayah"],
        endVerse: entry.endVerse ?? entry["End_Ayah"],
      }));
    }
    if (section["Surah"] !== undefined) {
      return [{
        surah: section["Surah"],
        startVerse: section["Start_Ayah"],
        endVerse: section["End_Ayah"],
      }];
    }
  }

  if (typeof section === "string") {
    const chunks = section.split("|");
    const result: { surah: number; startVerse: number; endVerse: number }[] = [];

    for (const chunk of chunks) {
      const [start, end] = chunk.split("-");
      if (!start || !end) continue;

      const [startSurahAyah] = start.split(".");
      const [startSurah, startAyah] = startSurahAyah.split(":");

      const [endSurahAyah] = end.split(".");
      const [endSurah, endAyah] = endSurahAyah.split(":");

      if (!startSurah || !startAyah || !endSurah || !endAyah) continue;

      result.push({
        surah: parseInt(startSurah, 10),
        startVerse: parseInt(startAyah, 10),
        endVerse: parseInt(endAyah, 10),
      });
    }

    return result.length > 0 ? result : null;
  }

  return null;
}

function getWordTranslationEdition(row: any): string | undefined {
  return row?.["Translator"] ?? row?.["id"];
}
function getWordTranslationText(row: any): string | undefined {
  return row?.["Text"] ?? row?.["translation"];
}
function getWordTransliterationEdition(row: any): string | undefined {
  return row?.["Provider"] ?? row?.["id"];
}
function getWordTransliterationText(row: any): string | undefined {
  return row?.["Text"] ?? row?.["transliteration"];
}

function buildWordTextMap(
  rows: any[] | undefined,
  getEdition: (row: any) => string | undefined,
  getText: (row: any) => string | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows || []) {
    const edition = getEdition(row);
    const ayah = row?.["Ayah"];
    const wordIndex = row?.["Kalimah"];
    const text = getText(row);
    if (!edition || ayah === undefined || wordIndex === undefined || text === undefined) continue;
    map.set(`${edition}:${ayah}:${wordIndex}`, text);
  }
  return map;
}

function normalizeEdition(edition: string | boolean | undefined | null): string | null {
  return typeof edition === "string" && edition !== "None" && edition !== "" ? edition : null;
}

type WordReference = { ayah: number; word: number };

function parseMushafLayout(layout: any): WordReference[][] | null {
  if (!layout) return null;

  if (typeof layout === "string") {
    try {
      return parseMushafLayout(JSON.parse(layout));
    } catch {
      return null;
    }
  }

  if (!Array.isArray(layout)) return null;

  const lines: WordReference[][] = [];
  for (const line of layout) {
    if (!Array.isArray(line)) return null;

    const refs: WordReference[] = [];
    for (const ref of line) {
      if (typeof ref !== "string") continue;
      const [ayahStr, wordStr] = ref.split(":");
      const ayah = parseInt(ayahStr, 10);
      const word = parseInt(wordStr, 10);
      if (Number.isNaN(ayah) || Number.isNaN(word)) continue;
      refs.push({ ayah, word });
    }

    if (refs.length > 0) lines.push(refs);
  }

  return lines.length > 0 ? lines : null;
}

function sliceLinesForPage(
  allLines: WordReference[][],
  rawPage: Page | null | undefined,
  pageVerses: Ayah[]
): WordReference[][] | null {
  if (!pageVerses || pageVerses.length === 0) return null;

  const pageAyahNumbers = new Set(pageVerses.map((v) => v.Ayah));
  const startAyah = rawPage?.Start_Ayah ?? Math.min(...Array.from(pageAyahNumbers));
  const endAyah = rawPage?.End_Ayah ?? Math.max(...Array.from(pageAyahNumbers));

  const result: WordReference[][] = [];

  for (const line of allLines) {
    const belongsToPage = line.some((ref) => {
      if (pageAyahNumbers.has(ref.ayah)) return true;
      if (ref.ayah >= startAyah && ref.ayah <= endAyah) return true;
      return false;
    });

    if (belongsToPage) {
      result.push(line);
    }
  }

  return result.length > 0 ? result : null;
}

function buildWordFromReference(
  ref: WordReference,
  wordMap: Map<string, Word_Entry>,
  verseMap: Map<number, Ayah>,
  lastWordIndexPerVerse: Map<number, number>,
  field: ReturnType<typeof getArabicField>
): ResolvedWord | null {
  const word = wordMap.get(`${ref.ayah}:${ref.word}`);
  if (!word) return null;

  const globalWordIndex = word["Kalimah"];
  const verse = verseMap.get(ref.ayah) ?? null;
  const isVerseEnd = lastWordIndexPerVerse.get(ref.ayah) === globalWordIndex;

  return {
    Glyph: pickRawArabicText(word, field),
    Ayah: verse as any,
    WordIndex: globalWordIndex - 1,
    IsVerseEnd: isVerseEnd,
    IsVerseMarker: false,
    AyahNumber: ref.ayah,
  };
}

// Surah 1, Ayah 1 (Al-Fatihah 1:1) IS the Basmalah — the single source of
// truth for the Arabic text, translation, and transliteration shown atop
// every other surah's first page. We always fetch Surah 1 independently of
// whichever surah is currently being viewed, and never substitute the
// current surah's own ayah 0/1 in its place.
const FATIHAH_SURAH_NUMBER = 1;

export function PageView({
  Surah,
  Show_Arabic_Text: ShowArabicText = true,
  Hover_Translation: HoverTranslation,
  Inline_Translation: InlineTranslation,
  Inline_Transliteration: InlineTransliteration,
  FontClass,
  ArabicFontSize,
  Transliteration_Font_Size: TransliterationFontSize,
  Show_Transliteration: ShowTransliteration,
  Ayah_Refs: ExternalAyahRefs,
  WordSpacing = "1.8px",
  HideVerses = false,
  HideVerseMarkers = false,
  PageFooter,
}: PageViewProps) {
  const { quranFont } = useApp();
  const [hoveredAyah, setHoveredAyah] = useState<number | null>(null);

  const fallbackAyahRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const AyahRefs = ExternalAyahRefs ?? fallbackAyahRefs;

  // Respect exactly what the parent (Surah/Index.tsx) passed down through
  // props — HoverTranslation / InlineTranslation / InlineTransliteration
  // already originate from that same component's own useApp() call
  // (hoverTranslation, inlineTranslation, inlineTransliteration). Silently
  // overriding them here with a separate `settings` object from useApp()
  // ignores the parent's actual selection whenever the two sources drift
  // out of sync — which is the "hardcoded, ignores parent" bug being fixed.
  const translationEdition = normalizeEdition(InlineTranslation) || normalizeEdition(HoverTranslation);
  const transliterationEdition = normalizeEdition(InlineTransliteration);

  const requestedTranslationEditions = useMemo(
    () => Array.from(new Set([translationEdition].filter((x): x is string => !!x))),
    [translationEdition]
  );

  const requestedTransliterationEditions = useMemo(
    () => Array.from(new Set([transliterationEdition].filter((x): x is string => !!x))),
    [transliterationEdition]
  );

  const surahNumber = (Surah as any)["Surah"] ?? (Surah as any).id;

  const { data: surahDetails, isLoading: isSurahLoading } = useQuery<Surah_Details>({
    queryKey: [
      "surahDetails",
      surahNumber,
      requestedTranslationEditions.join(","),
      requestedTransliterationEditions.join(","),
    ],
    queryFn: () =>
      Fetch_Surah_Details(surahNumber, [], [], requestedTranslationEditions, requestedTransliterationEditions),
    staleTime: 1000 * 60 * 30,
  });

  // Always fetch Surah 1 separately so the Basmalah can be extracted from its
  // real ayah data (correct script/diacritics per the active Quran font,
  // word-by-word glyphs for tap-to-play audio) regardless of which surah is
  // currently on screen. This is intentionally independent of `surahDetails`
  // above — do not reuse `verses` from the current surah for this.
  const { data: fatihahDetails, isLoading: isFatihahLoading } = useQuery<Surah_Details>({
    queryKey: [
      "surahDetails",
      FATIHAH_SURAH_NUMBER,
      requestedTranslationEditions.join(","),
      requestedTransliterationEditions.join(","),
    ],
    queryFn: () =>
      Fetch_Surah_Details(
        FATIHAH_SURAH_NUMBER,
        [],
        [],
        requestedTranslationEditions,
        requestedTransliterationEditions
      ),
    staleTime: 1000 * 60 * 30,
    enabled: ShowArabicText,
  });

  const { data: pageSections, isLoading: isPageSectionsLoading } = useQuery<Page_Sections>({
    queryKey: ["pageSectionsCorpus"],
    queryFn: Fetch_Page_Sections_Corpus,
    staleTime: 1000 * 60 * 60,
  });

  const { data: rawPages } = useQuery<Page[]>({
    queryKey: ["pageList"],
    queryFn: Fetch_Pages,
    staleTime: 1000 * 60 * 60,
  });

  const rawPageMap = useMemo(() => {
    const map = new Map<number, Page>();
    const list: Page[] = Array.isArray(rawPages)
      ? rawPages
      : Array.isArray((rawPages as any)?.Pages)
      ? (rawPages as any).Pages
      : [];
    list.forEach((page) => {
      if (page.Page !== undefined && page.Page !== null) map.set(page.Page, page);
    });
    return map;
  }, [rawPages]);

  const isIndoPakFont = quranFont === "indopak";
  const isUthmaniV4Font = quranFont === "uthmani_v4";
  const arabicField = useMemo(() => getArabicField(quranFont), [quranFont]);

  const activeSurah: Surah_Metadata | null = surahDetails?.["Surah"] || null;
  const verses: Ayah[] = surahDetails?.["Ayah"] || [];
  const words: Word_Entry[] = surahDetails?.["Words"] || [];

  const mushafLayout = activeSurah?.["Layout"] ?? null;

  // Surah 1, Ayah 1 IS the Basmalah — this is the single source of truth for
  // its Arabic text, translation, and transliteration, used on the first
  // page of every surah except Al-Fatihah and At-Tawbah. No ambiguity, no
  // ayah-0 guessing: always Surah 1, always Ayah 1.
  const fatihahWords: Word_Entry[] = fatihahDetails?.["Words"] || [];

  // Real per-word translation/transliteration maps for Surah 1, built the
  // exact same way as the current surah's maps below (wordTranslationMap /
  // wordTransliterationMap) — so the Basmalah respects whatever translation
  // edition and inline/hover settings are active, instead of hardcoded text.
  const fatihahWordTranslationMap = useMemo(
    () => buildWordTextMap(fatihahDetails?.["Word_Translations"], getWordTranslationEdition, getWordTranslationText),
    [fatihahDetails]
  );

  const fatihahWordTransliterationMap = useMemo(
    () => buildWordTextMap(fatihahDetails?.["Word_Transliterations"], getWordTransliterationEdition, getWordTransliterationText),
    [fatihahDetails]
  );

  const basmalahWords: BasmalahWord[] = useMemo(() => {
    if (!ShowArabicText) return [];
    if (!fatihahDetails) return [];

    const basmalahAyahWords = fatihahWords
  .filter((w) => w["Ayah"] === 1)
  .sort((a, b) => a["Kalimah"] - b["Kalimah"])
  // The Bismillah phrase is exactly 4 words. Some word datasets store the
  // ayah-end verse-marker glyph as an extra Kalimah entry on 1:1 (e.g.
  // Kalimah 5) — that's not part of the Bismillah text itself and must be
  // dropped here, otherwise it gets rendered as a 5th "word" in the basmalah.
  .slice(0, 4);

    // No word-level data for 1:1 — fall back to the fully-static, known-good
    // text rather than render nothing.
    if (basmalahAyahWords.length === 0) return STANDARD_BASMALAH_WORDS;

    const firstIndex = basmalahAyahWords[0]["Kalimah"];

    return basmalahAyahWords.map((word) => {
      const relativeIndex = word["Kalimah"] - firstIndex + 1;

      // Plain unicode glyph (not the raw ligature field): the ligature
      // fields only render correctly paired with a page-specific custom
      // font, but the Basmalah is displayed using whichever page is
      // currently on screen — not the page Surah 1 actually lives on.
      const glyph = pickArabicText(word as any, arabicField as any) || "";

      const translation = translationEdition
        ? fatihahWordTranslationMap.get(`${translationEdition}:1:${relativeIndex}`)
        : undefined;
      const transliteration = transliterationEdition
        ? fatihahWordTransliterationMap.get(`${transliterationEdition}:1:${relativeIndex}`)
        : undefined;

      return { glyph, translation, transliteration };
    });
  }, [
    ShowArabicText,
    fatihahDetails,
    fatihahWords,
    fatihahWordTranslationMap,
    fatihahWordTransliterationMap,
    translationEdition,
    transliterationEdition,
    arabicField,
  ]);

  const verseMarkerOverrides = useMemo(() => {
    if (!isIndoPakFont || !verses.length) return [];
    return [] as string[];
  }, [isIndoPakFont, verses]);

  const getPageFontFamily = (pageNumber: number): string => {
    switch (quranFont) {
      case "indopak": return "IndoPak";
      case "uthmani": return "Uthmani";
      case "uthmani_v1": return `Uthmani-V1-${pageNumber}`;
      case "uthmani_v2": return `Uthmani-V2-${pageNumber}`;
      case "uthmani_v4": return `Uthmani-V4-${pageNumber}`;
      default: return "Uthmani";
    }
  };

  // Surah 1, Ayah 1 (the Basmalah) physically sits on mushaf page 1. For
  // glyph-based fonts (uthmani_v1/v2/v4), each mushaf page ships its own
  // custom font file with page-specific ligature mappings — reusing the
  // CURRENTLY DISPLAYED page's font family (e.g. "Uthmani-V4-51") to render
  // page-1-specific glyph codepoints produces wrong/garbled shapes. The
  // Basmalah must always be rendered with page 1's font, no matter which
  // surah or page is on screen.
  const BASMALAH_MUSHAF_PAGE = 1;
  const basmalahFontFamily = useMemo(
    () => getPageFontFamily(BASMALAH_MUSHAF_PAGE),
    [quranFont]
  );

  const wordTranslationMap = useMemo(
    () => buildWordTextMap(surahDetails?.["Word_Translations"], getWordTranslationEdition, getWordTranslationText),
    [surahDetails]
  );

  const wordTransliterationMap = useMemo(
    () => buildWordTextMap(surahDetails?.["Word_Transliterations"], getWordTransliterationEdition, getWordTransliterationText),
    [surahDetails]
  );

  const pages = useMemo(() => {
    if (!activeSurah || !verses.length) return [];

    const startPage = activeSurah.Start_Page;
    const endPage = activeSurah.End_Page;

    const result: { pageNumber: number; verses: Ayah[]; rawPage: Page | null }[] = [];

    const verseMap = new Map<number, Ayah>();
    for (const verse of verses) verseMap.set(verse.Ayah, verse);

    if (!pageSections || !startPage || !endPage) {
      return [{ pageNumber: 1, verses, rawPage: rawPageMap.get(1) || null }];
    }

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
      const sectionsForPage = (pageSections as any)[pageNumber] || null;
      const parsedSections = parsePageSections(sectionsForPage);
      const rawPageForThisPage = rawPageMap.get(pageNumber) || null;

      if (!parsedSections) {
        result.push({ pageNumber, verses, rawPage: rawPageForThisPage });
        continue;
      }

      const surahSection = parsedSections.find((seg) => seg.surah === activeSurah.Surah);
      if (!surahSection) continue;

      const pageVerses: Ayah[] = [];
      for (let ayahNumber = surahSection.startVerse; ayahNumber <= surahSection.endVerse; ayahNumber++) {
        const verse = verseMap.get(ayahNumber);
        if (verse) pageVerses.push(verse);
      }

      if (pageVerses.length > 0) {
        result.push({ pageNumber, verses: pageVerses, rawPage: rawPageForThisPage });
      }
    }

    if (result.length === 0) {
      return [{ pageNumber: startPage || 1, verses, rawPage: rawPageMap.get(startPage || 1) || null }];
    }

    return result;
  }, [activeSurah, verses, pageSections, rawPageMap]);

  const { wordMap, verseMapWithWbw, lastWordIndexPerVerse } = useMemo(() => {
    const firstWordIndexPerVerse = new Map<number, number>();
    for (const word of words) {
      const ayahNumber = word["Ayah"];
      const wordIndex = word["Kalimah"];
      const currentLowest = firstWordIndexPerVerse.get(ayahNumber);
      if (currentLowest === undefined || wordIndex < currentLowest) {
        firstWordIndexPerVerse.set(ayahNumber, wordIndex);
      }
    }

    const wordMap = new Map<string, Word_Entry>();
    for (const word of words) {
      const ayahNumber = word["Ayah"];
      const firstIndex = firstWordIndexPerVerse.get(ayahNumber);
      if (firstIndex === undefined) continue;
      const relativeIndex = word["Kalimah"] - firstIndex + 1;
      wordMap.set(`${ayahNumber}:${relativeIndex}`, word);
    }

    const lastWordIndexPerVerse = new Map<number, number>();
    for (const word of words) {
      const ayahNumber = word["Ayah"];
      const wordIndex = word["Kalimah"];
      const currentHighest = lastWordIndexPerVerse.get(ayahNumber);
      if (currentHighest === undefined || wordIndex > currentHighest) {
        lastWordIndexPerVerse.set(ayahNumber, wordIndex);
      }
    }

    const buildWordArrayForVerse = (
      ayahNumber: number,
      textMap: Map<string, string>,
      edition: string | null
    ): string[] | undefined => {
      if (!edition) return undefined;
      const firstIndex = firstWordIndexPerVerse.get(ayahNumber);
      const lastIndex = lastWordIndexPerVerse.get(ayahNumber);
      if (firstIndex === undefined || lastIndex === undefined) return undefined;

      const result: string[] = [];
      for (let globalWordIndex = firstIndex; globalWordIndex <= lastIndex; globalWordIndex++) {
        const relativeIndex = globalWordIndex - firstIndex + 1;
        result[globalWordIndex - 1] = textMap.get(`${edition}:${ayahNumber}:${relativeIndex}`) ?? "";
      }
      return result;
    };

    const verseMapWithWbw = new Map<number, Ayah>();
    for (const verse of verses) {
      const ayahNumber = verse.Ayah;
      const wbwTranslation = buildWordArrayForVerse(ayahNumber, wordTranslationMap, translationEdition);
      const wbwTransliteration = buildWordArrayForVerse(ayahNumber, wordTransliterationMap, transliterationEdition);

      verseMapWithWbw.set(ayahNumber, { ...verse, wbwTranslation, wbwTransliteration } as any);
    }

    return { wordMap, verseMapWithWbw, lastWordIndexPerVerse };
  }, [words, verses, wordTranslationMap, wordTransliterationMap, translationEdition, transliterationEdition]);

  const layoutLineReferences = useMemo(() => parseMushafLayout(mushafLayout), [mushafLayout]);

  const resolvedLines = useMemo<ResolvedWord[][]>(() => {
    if (!words.length) return [];

    const lineMap = new Map<number, Word_Entry[]>();
    for (const word of words) {
      const lineNumber = (word as any)["Line"] ?? 1;
      if (!lineMap.has(lineNumber)) lineMap.set(lineNumber, []);
      lineMap.get(lineNumber)!.push(word);
    }

    const lines: ResolvedWord[][] = [];

    Array.from(lineMap.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([_, lineWords]) => {
        const line: ResolvedWord[] = lineWords.map((word) => {
          const ayahNumber = word["Ayah"];
          const verse = verseMapWithWbw.get(ayahNumber) ?? null;
          const isVerseEnd = lastWordIndexPerVerse.get(ayahNumber) === word["Kalimah"];

          return {
            Glyph: pickRawArabicText(word, arabicField),
            Ayah: verse,
            WordIndex: word["Kalimah"] - 1,
            IsVerseEnd: isVerseEnd,
            IsVerseMarker: false,
            AyahNumber: ayahNumber,
          };
        });

        lines.push(line);
      });

    return lines;
  }, [words, verseMapWithWbw, lastWordIndexPerVerse, arabicField]);

  const resolvedLinesPerPage = useMemo(() => {
    if (pages.length === 1 && pages[0].verses.length === verses.length) {
      return [resolvedLines];
    }

    return pages.map((page) => {
      const ayahNumbers = new Set(page.verses.map((v) => v.Ayah));
      const filtered = resolvedLines.filter((line) =>
        line.some((word) =>
          word.Ayah !== null
            ? ayahNumbers.has(word.Ayah.Ayah)
            : word.AyahNumber
            ? ayahNumbers.has(word.AyahNumber)
            : false
        )
      );
      return filtered.length > 0 ? filtered : resolvedLines;
    });
  }, [pages, resolvedLines, verses]);

  const linesForAllPages = useMemo(() => {
    return pages.map((page, pageIndex) => {
      if (layoutLineReferences) {
        const linesForThisPage = sliceLinesForPage(layoutLineReferences, page.rawPage, page.verses);

        if (linesForThisPage) {
          const convertedLines = linesForThisPage
            .map((line) =>
              line
                .map((ref) => buildWordFromReference(ref, wordMap, verseMapWithWbw, lastWordIndexPerVerse, arabicField))
                .filter((w): w is ResolvedWord => w !== null)
            )
            .filter((line) => line.length > 0);

          if (convertedLines.length > 0) return convertedLines;
        }
      }

      return resolvedLinesPerPage[pageIndex] || resolvedLines;
    });
  }, [pages, layoutLineReferences, wordMap, verseMapWithWbw, lastWordIndexPerVerse, arabicField, resolvedLinesPerPage, resolvedLines]);

  const isLoading = isSurahLoading || isPageSectionsLoading;

  if (isLoading || !activeSurah) {
    return (
      <div className="w-full space-y-4 p-8 text-center animate-pulse">
        <div className="h-12 bg-muted rounded-xl w-3/4 mx-auto" />
        <div className="h-40 bg-muted rounded-2xl w-full" />
      </div>
    );
  }

  const surahId = activeSurah.Surah;
  const shouldShowBasmalah = surahId !== 1 && surahId !== 9 && ShowArabicText;

  return (
    <div id="quran-container" className="space-y-4">
      {pages.map((page, pageIndex) => {
        const pageFontFamily = getPageFontFamily(page.pageNumber);
        const showBasmalahOnThisPage = pageIndex === 0 && shouldShowBasmalah;
        const containerClass = pageIndex === 0 ? "rounded-t-none rounded-b-[48px] mb-2" : "rounded-[48px] mb-2";
        const linesToRender = linesForAllPages[pageIndex] || resolvedLines;

        const pageData: PageAyahs = {
          pageNumber: page.pageNumber,
          Ayah: page.verses as any,
        };

        return (
          <PageCard
            key={page.pageNumber}
            PageData={pageData}
            RawPageData={page.rawPage}
            PageIndex={pageIndex}
            SurahNumber={surahId}
            ResolvedLines={linesToRender}
            ContainerClass={containerClass}
            ShowArabicText={ShowArabicText}
            ShowTransliteration={ShowTransliteration}
            ShowBasmalahOnPage={showBasmalahOnThisPage}
            BasmalahWords={basmalahWords}
            PageFontFamily={pageFontFamily}
            BasmalahPageFontFamily={basmalahFontFamily}
            FontClass={FontClass}
            ArabicFontSize={ArabicFontSize}
            WordSpacing={WordSpacing}
            AyahRefs={AyahRefs}
            HighlightedAyah={hoveredAyah}
            setHighlightedAyah={setHoveredAyah}
            TransliterationFontSize={TransliterationFontSize}
            HoverTranslation={HoverTranslation}
            InlineTranslation={InlineTranslation}
            InlineTransliteration={InlineTransliteration}
            HideVerses={HideVerses}
            HideVerseMarkers={HideVerseMarkers}
            IsIndoPakFont={isIndoPakFont}
            VerseMarkerOverrides={verseMarkerOverrides}
            IsUthmaniV4Font={isUthmaniV4Font}
            PageFooter={PageFooter}
            Layout={mushafLayout as any}
          />
        );
      })}
    </div>
  );
}