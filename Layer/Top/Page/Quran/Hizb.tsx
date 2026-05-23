import { useParams } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { surahList, getSurah, getHizbSegments } from "@/Bottom/API/Quran";
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

export default function Hizb() {
  const { hizbNumber: hizbParam } = useParams<{ hizbNumber: string }>();
  const hizbNumber = parseInt(hizbParam || "1");

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

  // Get hizb segments
  const hizbSegments = useMemo(() => {
    return getHizbSegments(hizbNumber);
  }, [hizbNumber]);

  // Get unique surah IDs from segments
  const surahIds = useMemo(() => {
    if (!hizbSegments) return [];
    return [...new Set(hizbSegments.map((segment) => segment.surah))];
  }, [hizbSegments]);

  // Fetch surah data
  const queries = useQueries({
    queries: surahIds.map((surahId) => ({
      queryKey: ["surah", surahId, "hizb", hizbNumber],
      queryFn: () =>
        getSurah(surahId, {
          fontType: quranFont === "indopak" ? "Standard" : quranFont,
        }),
      enabled: !!surahId && hizbSegments !== null,
    })),
  });

  // No loading skeletons – removed completely
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

  // Build resolved lines for page layout
  const resolvedLines = useMemo(() => {
    if (!hizbSegments || !isPageLayout) return [];

    const lines: ResolvedWord[][] = [];
    let currentLine: ResolvedWord[] = [];

    for (const segment of hizbSegments) {
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

        if (v === 0) {
          startWord = segment.startWord - 1;
        }
        if (v === verses.length - 1) {
          endWord = segment.endWord;
        }

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
  }, [hizbSegments, surahDataMap, isPageLayout]);

  // Build hizb verses for ayah layout
  const hizbVerses = useMemo(() => {
    if (!hizbSegments || isPageLayout) return [];

    const result: { verse: any; surah: any }[] = [];

    for (const segment of hizbSegments) {
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

        if (v === 0) {
          startWord = segment.startWord - 1;
        }
        if (v === verses.length - 1) {
          endWord = segment.endWord;
        }

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
  }, [hizbSegments, surahDataMap, isPageLayout]);

  // Error state – only show if the whole page failed
  if (error || !hizbSegments) {
    return (
      <Layout hideFooter>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load Hizb {hizbNumber}. Please try again later.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="container pt-28 max-w-4xl mx-auto pb-24">
        <div className="glass-container !rounded-xl !block w-full mb-6">
          <div className="p-4 sm:p-5">
            <h1 className="text-2xl font-bold">Hizb {hizbNumber}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Juz {Math.ceil(hizbNumber / 2)} • Part{" "}
              {hizbNumber % 2 === 1 ? "1" : "2"} of{" "}
              {Math.ceil(hizbNumber / 2)}
            </p>
          </div>
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
          <div className="space-y-6">
            {hizbVerses.length > 0 ? (
              hizbVerses.map(({ verse, surah }, idx) => (
                <VerseCard
                  key={`${surah?.id}-${verse.verseNumber}-${idx}`}
                  verse={verse}
                  surah={surah!}
                  showArabicText={showArabicText}
                  verseTranslation={verseTranslation}
                  translationFontSize={translationFontSizeValue}
                  isHighlighted={false}
                  onNotesClick={() => {}}
                  onShareClick={() => {}}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No content available
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}