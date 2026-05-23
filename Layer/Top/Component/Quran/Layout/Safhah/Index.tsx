import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAudio } from "@/Middle/Context/Audio";
import { useApp } from "@/Middle/Context/App";
import { PageLines } from "./Main";
import { WordTooltip, useAudioPlayback } from "./Utility";
import type { PageViewProps, ResolvedWord } from "./Types";
import type { AssembledVerse } from "@/Bottom/API/Quran";
import { getPageSegments } from "@/Bottom/API/Quran";
import { Container } from "@/Top/Component/UI/Container";
import { useQuranData } from "@/Middle/Hook/Use-Quran-Data";
import indoPakMarkers from "@/Bottom/Data/Quran/Meta/Indo-Pak-Verse-Markers.json";

export function PageView({
  surah,
  assembledSurah,
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
  pageFooter, // deprecated – kept for compatibility but not used
}: PageViewProps) {
  const { verses, lines } = assembledSurah;
  const { activeVerse, activeWord, playAyah } = useAudio();
  const { quranFont, hifz } = useApp();
  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);
  const [overflowPages, setOverflowPages] = useState<Set<number>>(new Set());

  const { playWordAudio, isPlaying } = useAudioPlayback(surah.id);
  const surah1Data = useQuranData(1);

  const isHoverTranslationEnabled = useMemo(
    () => hoverTranslation !== "None" && hoverTranslation !== false,
    [hoverTranslation]
  );

  const isIndoPakFont = quranFont === "indopak";
  const isUthmaniV4Font = quranFont === "uthmani_v4";

  const verseMarkerMap = useMemo(() => {
    if (!isIndoPakFont) return [];
    const markers = (indoPakMarkers as string[][])[surah.id - 1];
    return Array.isArray(markers) ? markers : [];
  }, [isIndoPakFont, surah.id]);

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

  const getBismillahFontFamily = (): string => {
    switch (quranFont) {
      case "indopak": return "IndoPak";
      case "uthmani": return "Uthmani";
      case "uthmani_v1": return "Uthmani-V1-1";
      case "uthmani_v2": return "Uthmani-V2-1";
      case "uthmani_v4": return "Uthmani-V4-1";
      default: return "Uthmani";
    }
  };

  const bismillahWords = useMemo(() => {
    if (!showArabicText) return [];
    const verses1 = surah1Data.data?.verses;
    if (!verses1 || verses1.length === 0) return [];
    const firstVerse = verses1[0];
    const words = firstVerse.words;
    if (words.length < 5) return [];
    return words.slice(0, 4).map((glyph, idx) => ({
      glyph,
      translation: firstVerse.wbwTranslationInline?.[idx] || firstVerse.wbwTranslationHover?.[idx],
      transliteration: firstVerse.wbwTransliterationInline?.[idx] || firstVerse.wbwTransliterationHover?.[idx],
    }));
  }, [showArabicText, surah1Data.data]);

  const pages = useMemo(() => {
    const startPage = surah.pages[0];
    const endPage = surah.pages[1];
    const result: { pageNumber: number; verses: AssembledVerse[] }[] = [];

    const verseMap = new Map<number, AssembledVerse>();
    for (const verse of verses) verseMap.set(verse.verseNumber, verse);

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const segments = getPageSegments(pageNum);
      if (!segments) continue;
      const surahSegment = segments.find((seg) => seg.surah === surah.id);
      if (!surahSegment) continue;

      const pageVerses: AssembledVerse[] = [];
      for (let vn = surahSegment.startVerse; vn <= surahSegment.endVerse; vn++) {
        const verse = verseMap.get(vn);
        if (verse) pageVerses.push(verse);
      }
      if (pageVerses.length > 0) result.push({ pageNumber: pageNum, verses: pageVerses });
    }
    return result;
  }, [surah, verses]);

  const verseMap = useMemo(() => {
    const map = new Map<number, AssembledVerse>();
    for (const verse of verses) map.set(verse.verseNumber, verse);
    return map;
  }, [verses]);

  const resolvedLines = useMemo<ResolvedWord[][]>(() => {
    if (!lines) return [];
    return lines.map((lineRefs) =>
      lineRefs.map((ref) => {
        const [ayahStr, wordStr] = ref.split(":");
        const ayah = parseInt(ayahStr, 10);
        const wordPos = parseInt(wordStr, 10);
        const verse = verseMap.get(ayah) ?? null;
        const wordIndex = wordPos - 1;
        const glyph = verse?.words[wordIndex] ?? ref;
        const isVerseEnd = !!verse && wordIndex === verse.words.length - 1;
        const isVerseNumber = verse === null;
        const isVerseMarker = !!verse && wordIndex === verse.words.length - 1;

        let verseNumber: number | undefined;
        if (isVerseNumber && glyph.includes(":")) {
          verseNumber = parseInt(glyph.split(":")[0], 10);
        } else if (isVerseMarker && verse) {
          verseNumber = verse.verseNumber;
        }

        const transliteration = (!isVerseEnd && verse?.wbwTransliteration?.[wordIndex]) || undefined;
        return {
          glyph, verse, wordIndex,
          isVerseEnd, isVerseNumber, isVerseMarker,
          verseNumber, transliteration,
        };
      })
    );
  }, [lines, verseMap]);

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

  const getVerseTransliteration = (verse: AssembledVerse): string | null => {
    if (!showTransliteration) return null;
    return verse.transliteration || null;
  };

  const shouldShowBismillah = surah.id !== 1 && surah.id !== 9 && showArabicText;

  // Overflow detection (hidden PageLines always present)
  const pageLinesRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!showArabicText) return;
    const observers: ResizeObserver[] = [];

    pages.forEach((page) => {
      const el = pageLinesRefs.current.get(page.pageNumber);
      if (!el) return;

      const checkWrapping = () => {
        const lineContainers = el.querySelectorAll("[data-line-container]");
        for (const lineEl of lineContainers) {
          const words = lineEl.querySelectorAll("[data-word]");
          if (words.length < 2) continue;
          const firstTop = words[0].getBoundingClientRect().top;
          for (let i = 1; i < words.length; i++) {
            if (Math.abs(words[i].getBoundingClientRect().top - firstTop) > 2) {
              return true;
            }
          }
        }
        return false;
      };

      const observer = new ResizeObserver(() => {
        if (el.clientWidth > 0) {
          const wrapped = checkWrapping();
          setOverflowPages((prev) => {
            const next = new Set(prev);
            if (wrapped && !next.has(page.pageNumber)) {
              console.log(`[DEBUG] Page ${page.pageNumber} overflow → fluid layout`);
              next.add(page.pageNumber);
            } else if (!wrapped && next.has(page.pageNumber)) {
              console.log(`[DEBUG] Page ${page.pageNumber} restored → fixed layout`);
              next.delete(page.pageNumber);
            }
            return next;
          });
        }
      });

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [pages, resolvedLinesByPage, showArabicText]);

  // Fluid fallback – uses justify-content: space-between, no fixed layout
  const renderFluidArabic = (verses: AssembledVerse[], pageFont: string) => (
    <div
      dir="rtl"
      className={fontClass}
      style={{
        fontSize: arabicFontSize,
        lineHeight: 1.8,
        wordSpacing,
        fontFamily: pageFont || fontClass,
        textAlign: "right",
        padding: "1rem 0",
      }}
    >
      {verses.map((verse) => (
        <div
          key={verse.verseNumber}
          style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", width: "100%" }}
        >
          {verse.words.map((glyph, wordIdx) => {
            const isVerseEnd = wordIdx === verse.words.length - 1;
            const isVerseMarker = isVerseEnd;
            const verseNumber = verse.verseNumber;

            const hoverTranslationText =
              !isVerseEnd && verse.wbwTranslationHover?.[wordIdx];
            const hoverTransliterationText =
              !isVerseEnd && verse.wbwTransliterationHover?.[wordIdx];

            const handleClick = isVerseEnd
              ? () => playAyah(surah.id, verseNumber)
              : () => playWordAudio(verseNumber, wordIdx);

            const handleMouseEnter = () => {
              if (isVerseEnd) setHoveredVerse(verseNumber);
            };
            const handleMouseLeave = () => {
              if (isVerseEnd) setHoveredVerse(null);
            };

            const isVerseHighlighted =
              hoveredVerse !== null && hoveredVerse === verseNumber;
            const isActive =
              !isVerseEnd && verseNumber === activeVerse && wordIdx === activeWord;
            const wordKey = `word-${verseNumber}-${wordIdx}`;
            const ayahKey = `ayah-${verseNumber}`;
            const isPlayingAudio =
              isPlaying(wordKey) || isPlaying(ayahKey);

            let spanClass = "select-text transition-colors duration-200 inline ";
            if (isVerseHighlighted && !isVerseMarker) spanClass += "text-primary";
            else if (isActive) spanClass += "text-emerald-500 animate-pulse";
            else if (isPlayingAudio) spanClass += "text-primary animate-pulse";
            else if (isVerseEnd || isVerseMarker)
              spanClass += "text-muted-foreground hover:text-primary cursor-pointer";
            else spanClass += "text-foreground hover:text-primary";

            return (
              <WordTooltip
                key={`${verseNumber}-${wordIdx}`}
                translation={hoverTranslationText}
                transliteration={hoverTransliterationText}
                enabled={isHoverTranslationEnabled}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <span
                  className={spanClass}
                  style={{ cursor: "pointer" }}
                  onClick={handleClick}
                  data-verse={verseNumber}
                  data-word={wordIdx}
                  {...(isVerseMarker ? { "data-is-verse-marker": "true" } : {})}
                >
                  {glyph}{" "}
                </span>
              </WordTooltip>
            );
          })}
        </div>
      ))}
    </div>
  );

  // Helper to extract juz, page, hizb numbers (replace with your actual data)
  const getFooterParts = (pageNumber: number) => {
    const juzNumber = Math.ceil(pageNumber / 20); // approximate, use real data
    const hizbNumber = Math.ceil(pageNumber / 10); // approximate, use real data
    return { juz: juzNumber, page: pageNumber, hizb: hizbNumber };
  };

  return (
    <div id="quran-container">
      {pages.map((page, pageIdx) => {
        const pageFontFamily = getPageFontFamily(page.pageNumber);
        const bismillahFontFamily = getBismillahFontFamily();
        const showBismillahOnThisPage = pageIdx === 0 && shouldShowBismillah;
        // Reduced bottom margin from mb-12 to mb-4
        const containerClassName = pageIdx === 0
          ? "rounded-t-none rounded-b-[48px] mb-2"
          : "rounded-[48px] mb-2";
        const isOverflow = overflowPages.has(page.pageNumber);
        const useFluid = pageIdx !== 0 && isOverflow;
        const justifyLines = pageIdx !== 0;

        const { juz, page: pageNum, hizb } = getFooterParts(page.pageNumber);

        return (
          <React.Fragment key={page.pageNumber}>
            <Container className={`w-full ${containerClassName}`}>
              <div className="relative">
                {showArabicText && (
                  <>
                    {useFluid && renderFluidArabic(page.verses, pageFontFamily)}

                    <div
                      ref={(el) => {
                        if (el) pageLinesRefs.current.set(page.pageNumber, el);
                        else pageLinesRefs.current.delete(page.pageNumber);
                      }}
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        visibility: "hidden",
                        top: 0, left: 0,
                        width: "100%",
                        zIndex: -1,
                      }}
                    >
                      <PageLines
                        resolvedLines={resolvedLinesByPage[pageIdx]}
                        fontClass={fontClass}
                        arabicFontSize={arabicFontSize}
                        wordSpacing={wordSpacing}
                        surahId={surah.id}
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
                        bismillahFontFamily={showBismillahOnThisPage ? bismillahFontFamily : undefined}
                        bismillahFontClass={fontClass}
                        bismillahFontSize={arabicFontSize}
                        pageFontFamily={pageFontFamily}
                        isIndoPakFont={isIndoPakFont}
                        verseMarkerMap={verseMarkerMap}
                        isUthmaniV4Font={isUthmaniV4Font}
                        justifyLines={justifyLines}
                      />
                    </div>

                    {!useFluid && (
                      <div>
                        <PageLines
                          resolvedLines={resolvedLinesByPage[pageIdx]}
                          fontClass={fontClass}
                          arabicFontSize={arabicFontSize}
                          wordSpacing={wordSpacing}
                          surahId={surah.id}
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
                          bismillahFontFamily={showBismillahOnThisPage ? bismillahFontFamily : undefined}
                          bismillahFontClass={fontClass}
                          bismillahFontSize={arabicFontSize}
                          pageFontFamily={pageFontFamily}
                          isIndoPakFont={isIndoPakFont}
                          verseMarkerMap={verseMarkerMap}
                          isUthmaniV4Font={isUthmaniV4Font}
                          justifyLines={justifyLines}
                        />
                      </div>
                    )}
                  </>
                )}

                {!showArabicText && (
                  <div className="space-y-4">
                    {showTransliteration && (
                      <div className="space-y-1">
                        {page.verses.map((verse) => {
                          const translit = getVerseTransliteration(verse);
                          if (!translit) return null;
                          return (
                            <p
                              key={`translit-${verse.verseNumber}`}
                              className={`text-muted-foreground leading-relaxed transition-colors duration-200 ${
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

                    <div className="space-y-1">
                      {page.verses.map((verse) => (
                        <p
                          key={verse.verseNumber}
                          className={`text-foreground leading-relaxed transition-colors duration-200 ${
                            hoveredVerse === verse.verseNumber ? "bg-primary/10 rounded px-1" : ""
                          }`}
                          style={{ fontSize: translationFontSize }}
                          onMouseEnter={() => setHoveredVerse(verse.verseNumber)}
                          onMouseLeave={() => setHoveredVerse(null)}
                        >
                          {verse.translation ?? null}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Container>

            {/* Footer: three separate Container components, placed outside the main container */}
            <div className="flex justify-center gap-4 py-2 mb-2">
              <Container className="px-3 py-1 text-sm font-medium text-center rounded-full shadow-sm min-w-[70px]">
                Juz {juz}
              </Container>
              <Container className="px-3 py-1 text-sm font-medium text-center rounded-full shadow-sm min-w-[70px]">
                Page {pageNum}
              </Container>
              <Container className="px-3 py-1 text-sm font-medium text-center rounded-full shadow-sm min-w-[70px]">
                Hizb {hizb}
              </Container>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}