import { useParams } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { surahList, getSurah, getPageSegments } from "@/Bottom/API/Quran";
import { PageLines } from "@/Top/Component/Quran/Layout/Safhah/Main";
import { VerseCard } from "@/Top/Component/Quran/Layout/Ayah/Main";
import { Layout } from "@/Top/Component/Layout/Index";
import { useApp } from "@/Middle/Context/App";
import { useAudio } from "@/Middle/Context/Audio";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/Top/Component/UI/Alert";

interface ResolvedWord {
  glyph: string;
  verse: any;
  wordIndex: number;
  isVerseEnd: boolean;
  isVerseNumber: boolean;
  verseNumber?: number;
}

export default function Safhah() {
  const { pageNumber: pageNumParam } = useParams<{ pageNumber: string }>();
  const pageNumber = parseInt(pageNumParam || "1");

  const {
    layout,
    fontSize,
    translationFontSize,
    quranFont,
    showArabicText,
    verseTranslation,
    hoverTranslation,
  } = useApp();

  const { stop: stopAudio, isPlaying } = useAudio();
  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const isPageLayout = layout === "page";

  const getFontClass = () => {
    switch (quranFont) {
      case "indopak":
        return "font-indopak";
      case "uthmani_v1":
        return "font-uthmani_v1";
      case "uthmani_v2":
        return "font-uthmani_v2";
      case "uthmani_v4":
        return "font-uthmani_v4";
      default:
        return "font-uthmani";
    }
  };

  const arabicFontSize = `${(1.5 * fontSize) / 5}rem`;
  const translationFontSizeValue = `${(1 * translationFontSize) / 3}rem`;

  const pageSegments = useMemo(() => {
    return getPageSegments(pageNumber);
  }, [pageNumber]);

  const surahIds = useMemo(() => {
    if (!pageSegments) return [];
    return [...new Set(pageSegments.map((segment) => segment.surah))];
  }, [pageSegments]);

  const queries = useQueries({
    queries: surahIds.map((surahId) => ({
      queryKey: ["surah", surahId, "page", pageNumber],
      queryFn: () =>
        getSurah(surahId, {
          fontType: quranFont === "indopak" ? "Standard" : quranFont,
        }),
      enabled: !!surahId && pageSegments !== null,
    })),
  });

  // Loading skeletons completely removed – no isLoading state
  const error = queries.find((q) => q.error)?.error;

  const surahDataMap = useMemo(() => {
    const map = new Map();
    queries.forEach((query, idx) => {
      if (query.data) {
        map.set(surahIds[idx], query.data);
      }
    });
    return map;
  }, [queries, surahIds]);

  const resolvedLines = useMemo(() => {
    if (!pageSegments || !isPageLayout) return [];

    const lines: ResolvedWord[][] = [];
    let currentLine: ResolvedWord[] = [];

    for (const segment of pageSegments) {
      const surahData = surahDataMap.get(segment.surah);
      if (!surahData) continue;

      const startIdx = segment.startVerse - 1;
      const endIdx = segment.endVerse;
      const verses = surahData.verses.slice(startIdx, endIdx);

      for (let v = 0; v < verses.length; v++) {
        const verse = verses[v];
        const words = verse.words;

        let startWord = 0;
        let endWord = words.length;

        if (v === 0) startWord = segment.startWord - 1;
        if (v === verses.length - 1) endWord = segment.endWord;

        for (let w = startWord; w < endWord; w++) {
          currentLine.push({
            glyph: words[w],
            verse,
            wordIndex: w,
            isVerseEnd: w === words.length - 1,
            isVerseNumber: false,
            verseNumber: undefined,
          });
        }
      }

      if (currentLine.length > 0) {
        lines.push([...currentLine]);
        currentLine = [];
      }
    }

    if (currentLine.length > 0) lines.push(currentLine);
    return lines;
  }, [pageSegments, surahDataMap, isPageLayout]);

  const pageVerses = useMemo(() => {
    if (!pageSegments || isPageLayout) return [];

    const result: { verse: any; surah: any }[] = [];

    for (const segment of pageSegments) {
      const surahData = surahDataMap.get(segment.surah);
      if (!surahData) continue;

      const startIdx = segment.startVerse - 1;
      const endIdx = segment.endVerse;
      const verses = surahData.verses.slice(startIdx, endIdx);

      for (let v = 0; v < verses.length; v++) {
        const verse = verses[v];
        const words = verse.words;

        let startWord = 0;
        let endWord = words.length;

        if (v === 0) startWord = segment.startWord - 1;
        if (v === verses.length - 1) endWord = segment.endWord;

        const filteredWords = words.slice(startWord, endWord);
        const filteredWbw = verse.wbwTranslation?.slice(startWord, endWord);

        result.push({
          verse: {
            ...verse,
            words: filteredWords,
            wbwTranslation: filteredWbw,
            arabic: filteredWords.join(" "),
          },
          surah: surahList.find((s) => s.id === segment.surah),
        });
      }
    }

    return result;
  }, [pageSegments, surahDataMap, isPageLayout]);

  // Error state – only show if the whole page failed
  if (error || !pageSegments) {
    return (
      <Layout hideFooter noHorizontalPadding={isPageLayout}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load page {pageNumber}. Please try again later.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout hideFooter noHorizontalPadding={isPageLayout}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Page {pageNumber}</h1>
      </div>

      {isPageLayout ? (
        <div className="glass-container !rounded-xl overflow-hidden !block">
          <div className="pt-4 px-6 sm:px-8 pb-4">
            {resolvedLines.length > 0 ? (
              <PageLines
                resolvedLines={resolvedLines}
                fontClass={getFontClass()}
                arabicFontSize={arabicFontSize}
                wordSpacing="1.8px"
                surahId={0}
                verseRefs={verseRefs}
                hoveredVerse={hoveredVerse}
                setHoveredVerse={setHoveredVerse}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No content available
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {pageVerses.length > 0 ? (
            pageVerses.map(({ verse, surah }, idx) => (
              <div
                key={`${surah?.id}-${verse.verseNumber}-${idx}`}
                className="glass-container !rounded-xl !block"
              >
                <div className="p-6">
                  <VerseCard
                    verse={verse}
                    surah={surah!}
                    showArabicText={showArabicText}
                    verseTranslation={verseTranslation}
                    translationFontSize={translationFontSizeValue}
                    isHighlighted={false}
                    onNotesClick={() => {}}
                    onShareClick={() => {}}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No content available
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}