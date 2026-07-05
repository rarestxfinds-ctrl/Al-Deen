import { useParams } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLines } from "@/Component/Quran/Layout/Safhah/Main";
import { VerseCard } from "@/Component/Quran/Layout/Ayah/Main";
import { Layout } from "@/Component/Layout/Index";
import { useApp } from "@/Context/App";
import { useAudio } from "@/Context/Audio";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/Component/UI/Alert";
import { Container } from "@/Component/UI/Container";

interface ResolvedWord {
  glyph: string;
  verse: any;
  wordIndex: number;
  isVerseEnd: boolean;
  isVerseNumber: boolean;
  verseNumber?: number;
}

// ============================================================================
// Network Fetch Client Handler
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

// ============================================================================
// Client-Side Segment String Parser
// ============================================================================
function parseClientPageSegments(pageMapEntry: string | undefined): any[] | null {
  if (!pageMapEntry) return null;
  
  const segments = pageMapEntry.split('|');
  const result: any[] = [];
  
  for (const segment of segments) {
    const [start, end] = segment.split('-');
    if (!start || !end) continue;
    
    const [startSurahVerse, startWordStr] = start.split('.');
    const [startSurah, startVerse] = startSurahVerse.split(':').map(Number);
    const startWord = Number(startWordStr || 1);
    
    const [endSurahVerse, endWordStr] = end.split('.');
    const [endSurah, endVerse] = endSurahVerse.split(':').map(Number);
    const endWord = Number(endWordStr || 1);
    
    result.push({
      surah: startSurah,
      startVerse,
      startWord,
      endSurah,
      endVerse,
      endWord
    });
  }
  
  return result.length > 0 ? result : null;
}

export default function Safhah() {
  const { pageNumber: pageNumParam } = useParams<{ pageNumber: string }>();
  const pageNumber = parseInt(pageNumParam || "1", 10);

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
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const isPageLayout = layout === "page";

  // 🌟 Ingest total compiled relational data framework over the wire
  const { data: corpus, isLoading, error } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // 30-minute operational window
  });

  const getFontClass = () => {
    switch (quranFont) {
      case "indopak":    return "font-indopak";
      case "uthmani_v1": return "font-uthmani_v1";
      case "uthmani_v2": return "font-uthmani_v2";
      case "uthmani_v4": return "font-uthmani_v4";
      default:           return "font-uthmani";
    }
  };

  const arabicFontSize = `${(1.5 * fontSize) / 5}rem`;
  const translationFontSizeValue = `${(1 * translationFontSize) / 3}rem`;

  // Compute page segments client-side from global string maps
  const pageSegments = useMemo(() => {
    if (!corpus?.pageMap) return null;
    const rawPageData = corpus.pageMap[pageNumber - 1];
    return parseClientPageSegments(rawPageData);
  }, [corpus, pageNumber]);

  // Construct structured mapping parameters to look up chapters out of current payload
  const surahDataMap = useMemo(() => {
    const map = new Map<number, any>();
    if (!corpus?.surahs || !pageSegments) return map;

    pageSegments.forEach((segment) => {
      if (!map.has(segment.surah)) {
        const foundSurah = corpus.surahs.find((s: any) => s.id === segment.surah);
        if (foundSurah) map.set(segment.surah, foundSurah);
      }
    });
    return map;
  }, [corpus, pageSegments]);

  // Map out horizontal rendering line offsets cleanly across segmented verse collections
  const resolvedLines = useMemo(() => {
    if (!pageSegments || !isPageLayout) return [];

    const lines: ResolvedWord[][] = [];
    let currentLine: ResolvedWord[] = [];

    for (const segment of pageSegments) {
      const surahData = surahDataMap.get(segment.surah);
      if (!surahData?.verses) continue;

      const startIdx = segment.startVerse - 1;
      const endIdx = segment.endVerse;
      const verses = surahData.verses.slice(startIdx, endIdx);

      for (let v = 0; v < verses.length; v++) {
        const verse = verses[v];
        const words = verse.words || [];

        let startWord = 0;
        let endWord = words.length;

        if (v === 0) startWord = segment.startWord - 1;
        if (v === verses.length - 1) endWord = segment.endWord;

        for (let w = startWord; w < endWord; w++) {
          if (!words[w]) continue;
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

  // Flatten active target verses for linear rendering down standard card view paths
  const pageVerses = useMemo(() => {
    if (!pageSegments || isPageLayout || !corpus?.surahs) return [];

    const result: { verse: any; surah: any }[] = [];

    for (const segment of pageSegments) {
      const surahData = surahDataMap.get(segment.surah);
      if (!surahData?.verses) continue;

      const startIdx = segment.startVerse - 1;
      const endIdx = segment.endVerse;
      const verses = surahData.verses.slice(startIdx, endIdx);

      for (let v = 0; v < verses.length; v++) {
        const verse = verses[v];
        const words = verse.words || [];

        let startWord = 0;
        let endWord = words.length;

        if (v === 0) startWord = segment.startWord - 1;
        if (v === verses.length - 1) endWord = segment.endWord;

        const filteredWords = words.slice(startWord, endWord);
        const filteredWbw = Array.isArray(verse.wbwTranslation) 
          ? verse.wbwTranslation.slice(startWord, endWord) 
          : [];

        result.push({
          verse: { ...verse, words: filteredWords, wbwTranslation: filteredWbw },
          surah: surahData,
        });
      }
    }
    return result;
  }, [pageSegments, surahDataMap, isPageLayout, corpus]);

  if (isLoading) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-2xl mx-auto p-8 text-center animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-xl w-3/4 mx-auto" />
          <div className="h-40 bg-muted rounded-2xl w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !pageSegments) {
    return (
      <Layout hideFooter>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load page {pageNumber}. Please verify remote cache operational health.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="w-full max-w-[19em] mx-auto pt-0 px-0">
        <Container className="!px-6 !py-4 rounded-t-[40px] rounded-b-none flex items-center justify-between">
          <h1 className="text-lg font-bold">Page {pageNumber}</h1>
        </Container>
        <Container className="!rounded-t-none !rounded-b-[40px] mb-6">
          {isPageLayout ? (
            <div className="pt-2 px-2 pb-2">
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
                <div className="text-center py-8 text-muted-foreground">No content available</div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {pageVerses.length > 0 ? (
                pageVerses.map(({ verse, surah }, idx) => (
                  <VerseCard
                    key={`${surah?.id}-${verse.verseNumber}-${idx}`}
                    verse={verse}
                    surah={surah}
                    showArabicText={showArabicText}
                    verseTranslation={verseTranslation}
                    translationFontSize={translationFontSizeValue}
                    isHighlighted={false}
                    onNotesClick={() => {}}
                    onShareClick={() => {}}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No content available</div>
              )}
            </div>
          )}
        </Container>
      </div>
    </Layout>
  );
}