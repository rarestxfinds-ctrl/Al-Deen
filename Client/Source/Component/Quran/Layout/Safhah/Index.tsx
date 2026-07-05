import React, { useMemo, useState } from "react";
import { useApp } from "@/Context/App";
import { PageLines } from "./Main";
import type { PageViewProps, ResolvedWord } from "./Types";
import { Container } from "@/Component/UI/Container";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Network Fetch Client Handler
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

// ============================================================================
// Asynchronous Client-Side Page Segment Parser
// ============================================================================
function parseClientPageSegments(pageMapEntry: string | undefined): any[] | null {
  if (!pageMapEntry) return null;

  const segments = pageMapEntry.split('|');
  const result: any[] = [];

  for (const segment of segments) {
    const [start, end] = segment.split('-');
    if (!start || !end) continue;

    const [startSurahVerse, startWord] = start.split('.');
    const [startSurah, startVerse] = startSurahVerse.split(':');

    const [endSurahVerse, endWord] = end.split('.');
    const [endSurah, endVerse] = endSurahVerse.split(':');

    result.push({
      surah: parseInt(startSurah, 10),
      startVerse: parseInt(startVerse, 10),
      startWord: parseInt(startWord, 10),
      endVerse: parseInt(endVerse, 10),
      endWord: parseInt(endWord, 10),
    });
  }

  return result.length > 0 ? result : null;
}

// ============================================================================
// Font variant resolution: pick the right arabic/words pair per verse
// based on the active Quran font, falling back to Standard if the
// requested variant isn't present on the verse data.
// ============================================================================
type FontVariant = "V1" | "V2" | "Standard";

function resolveVariant(quranFont: string): FontVariant {
  switch (quranFont) {
    case "uthmani_v1": return "V1";
    case "uthmani_v2":
    case "uthmani_v4": return "V2";
    default: return "Standard";
  }
}

function getVerseWords(verse: any, variant: FontVariant): string[] {
  if (variant === "V1" && Array.isArray(verse?.wordsV1)) return verse.wordsV1;
  if (variant === "V2" && Array.isArray(verse?.wordsV2)) return verse.wordsV2;
  return verse?.words ?? [];
}

export function PageView({
  surah,
  showArabicText,
  hoverTranslation,
  inlineTranslation,
  inlineTransliteration,
  fontClass,
  arabicFontSize,
  translationFontSize,
  transliterationFontSize,
  showTransliteration,
  verseRefs,
  wordSpacing = "1.8px",
  hideVerses = false,
  hideVerseMarkers = false,
}: Omit<PageViewProps, "assembledSurah">) {
  const { quranFont } = useApp();
  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);

  // Ingest entire data block from the distributed backend network cache
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // 30-minute stale time
  });

  const isIndoPakFont = quranFont === "indopak";
  const isUthmaniV4Font = quranFont === "uthmani_v4";
  const fontVariant = resolveVariant(quranFont);

  // Resolve target Surah directly out of the incoming network payload
  const activeSurah = useMemo(() => {
    if (!corpus?.surahs) return null;
    return corpus.surahs.find((s: any) => s.id === surah.id) || null;
  }, [corpus, surah.id]);

  // Read Surah 1 dynamically out of the server response stream to extract structural Bismillah arrays
  const bismillahWords = useMemo(() => {
    if (!showArabicText || !corpus?.surahs) return [];
    const surah1 = corpus.surahs.find((s: any) => s.id === 1);
    const firstVerse = surah1?.verses?.[0];
    if (!firstVerse) return [];

    const words = getVerseWords(firstVerse, fontVariant);
    if (!Array.isArray(words)) return [];

    return words.slice(0, 4).map((glyph: string) => ({
      glyph,
      translation: "",
      transliteration: "",
    }));
  }, [showArabicText, corpus, fontVariant]);

  // Indo-Pak verse-end markers now come straight from the compiled corpus
  // (verse.indoPakMarker), indexed by verse number, instead of a separate
  // static client-side JSON import.
  const verseMarkerMap = useMemo(() => {
    if (!isIndoPakFont || !activeSurah?.verses) return [];
    const sorted = [...activeSurah.verses].sort((a: any, b: any) => a.verseNumber - b.verseNumber);
    return sorted.map((v: any) => v.indoPakMarker ?? "");
  }, [isIndoPakFont, activeSurah]);

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

  // Process structural page configurations client-side out of the parsed cache payload
  const pages = useMemo(() => {
    if (!activeSurah || !corpus?.pageMap) return [];

    const startPage = activeSurah.pages[0];
    const endPage = activeSurah.pages[1];
    const result: { pageNumber: number; verses: any[] }[] = [];

    const verseMap = new Map<number, any>();
    for (const verse of activeSurah.verses) verseMap.set(verse.verseNumber, verse);

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const rawPageData = corpus.pageMap[pageNum - 1];
      const segments = parseClientPageSegments(rawPageData);
      if (!segments) continue;

      const surahSegment = segments.find((seg) => seg.surah === activeSurah.id);
      if (!surahSegment) continue;

      const pageVerses: any[] = [];
      for (let vn = surahSegment.startVerse; vn <= surahSegment.endVerse; vn++) {
        const verse = verseMap.get(vn);
        if (verse) pageVerses.push(verse);
      }
      if (pageVerses.length > 0) result.push({ pageNumber: pageNum, verses: pageVerses });
    }
    return result;
  }, [activeSurah, corpus]);

  // Compute absolute layout tracking coordinates using the incoming payload properties
  const resolvedLines = useMemo<ResolvedWord[][]>(() => {
    if (!activeSurah || !activeSurah.lines) return [];

    const verseMap = new Map<number, any>();
    for (const verse of activeSurah.verses) verseMap.set(verse.verseNumber, verse);

    return activeSurah.lines.map((lineRefs: string[]) =>
      lineRefs.map((ref) => {
        const [ayahStr, wordStr] = ref.split(":");
        const ayah = parseInt(ayahStr, 10);
        const wordPos = parseInt(wordStr, 10);
        const verse = verseMap.get(ayah) ?? null;
        const wordIndex = wordPos - 1;
        const words = verse ? getVerseWords(verse, fontVariant) : null;
        const glyph = words?.[wordIndex] ?? ref;

        const isVerseEnd = !!verse && words ? wordIndex === words.length - 1 : false;
        const isVerseNumber = verse === null;
        const isVerseMarker = !!verse && words ? wordIndex === words.length - 1 : false;

        let verseNumber: number | undefined;
        if (isVerseNumber && glyph.includes(":")) {
          verseNumber = parseInt(glyph.split(":")[0], 10);
        } else if (isVerseMarker && verse) {
          verseNumber = verse.verseNumber;
        }

        return {
          glyph,
          verse,
          wordIndex,
          isVerseEnd,
          isVerseNumber,
          isVerseMarker,
          verseNumber,
          transliteration: undefined,
        };
      })
    );
  }, [activeSurah, fontVariant]);

  const resolvedLinesByPage = useMemo(() => {
    return pages.map((page) => {
      const verseNumbers = new Set(page.verses.map(v => v.verseNumber));
      return resolvedLines.filter(line =>
        line.some(word =>
          word.verse !== null ? verseNumbers.has(word.verse.verseNumber)
          : word.isVerseNumber && word.verseNumber ? verseNumbers.has(word.verseNumber)
          : false
        )
      );
    });
  }, [pages, resolvedLines]);

  if (isLoading || !activeSurah) {
    return (
      <div className="w-full space-y-4 p-8 text-center animate-pulse">
        <div className="h-12 bg-muted rounded-xl w-3/4 mx-auto" />
        <div className="h-40 bg-muted rounded-2xl w-full" />
      </div>
    );
  }

  const shouldShowBismillah = activeSurah.id !== 1 && activeSurah.id !== 9 && showArabicText;

  return (
    <div id="quran-container">
      {pages.map((page, pageIdx) => {
        const pageFontFamily = getPageFontFamily(page.pageNumber);
        const showBismillahOnThisPage = pageIdx === 0 && shouldShowBismillah;
        const containerClassName = pageIdx === 0
          ? "rounded-t-none rounded-b-[48px] mb-2"
          : "rounded-[48px] mb-2";

        return (
          <React.Fragment key={page.pageNumber}>
            <Container className={`w-full ${containerClassName}`}>
              <div className="relative">
                {showArabicText && (
                  <PageLines
                    resolvedLines={resolvedLinesByPage[pageIdx]}
                    fontClass={fontClass}
                    arabicFontSize={arabicFontSize}
                    wordSpacing={wordSpacing}
                    surahId={activeSurah.id}
                    verseRefs={verseRefs}
                    hoveredVerse={hoveredVerse}
                    setHoveredVerse={setHoveredVerse}
                    showTransliteration={showTransliteration}
                    transliterationFontSize={transliterationFontSize}
                    hoverTranslation={hoverTranslation}
                    inlineTranslation={inlineTranslation}
                    inlineTransliteration={inlineTransliteration}
                    hideVerses={hideVerses}
                    hideVerseMarkers={hideVerseMarkers}
                    bismillahWords={showBismillahOnThisPage ? bismillahWords : []}
                    bismillahFontFamily={showBismillahOnThisPage ? pageFontFamily : undefined}
                    bismillahFontClass={fontClass}
                    bismillahFontSize={arabicFontSize}
                    pageFontFamily={pageFontFamily}
                    isIndoPakFont={isIndoPakFont}
                    verseMarkerMap={verseMarkerMap}
                    isUthmaniV4Font={isUthmaniV4Font}
                    justifyLines={false}
                  />
                )}

                {!showArabicText && showTransliteration && (
                  <div className="space-y-1 p-4">
                    {page.verses.map((verse) => {
                      const translit = verse.arabic;
                      if (!translit) return null;
                      return (
                        <p
                          key={`translit-${verse.verseNumber}`}
                          className={`text-muted-foreground leading-relaxed text-center transition-colors duration-200 ${
                            hoveredVerse === verse.verseNumber ? "bg-primary/10 rounded px-1" : ""
                          }`}
                          style={{ fontSize: transliterationFontSize }}
                          onMouseEnter={() => setHoveredVerse(verse.verseNumber)}
                          onMouseLeave={() => setHoveredVerse(null)}
                        >
                          {translit}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            </Container>
          </React.Fragment>
        );
      })}
    </div>
  );
}