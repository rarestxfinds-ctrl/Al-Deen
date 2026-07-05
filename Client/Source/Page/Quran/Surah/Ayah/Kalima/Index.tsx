import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Component/Layout/Index";
import { AudioPlayer } from "@/Component/Audio-Player/Index";
import { SurahHeader } from "@/Component/Quran/Surah/Header";
import { PageLines } from "@/Component/Quran/Layout/Safhah/Main";
import { NotesDialog } from "@/Component/Dialog/Notes";
import { ShareDialog } from "@/Component/Dialog/Share";
import { SurahInfoDialog } from "@/Component/Dialog/Surah-Info";
import { TafsirDialog } from "@/Component/Dialog/Tafsir";
import { RenderSurahDialog } from "@/Component/Dialog/Render-Quran/Index";

import { useApp } from "@/Context/App";
import { useAudio } from "@/Context/Audio";
import { useQuranData } from "@/Hook/Use-Quran-Data";
import { useReadingSession } from "@/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Hook/Use-Quran-Goals";
import { Button } from "@/Component/UI/button";
import { Skeleton } from "@/Component/UI/Skeleton";
import { Container } from "@/Component/UI/Container";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { Alert, AlertDescription } from "@/Component/UI/Alert";
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
// Client-Side Segment String Parser
// ============================================================================
function parseClientPageSegments(pageMapEntry: string | undefined): any[] | null {
  if (!pageMapEntry) return null;
  const segments = pageMapEntry.split('|');
  const result: any[] = [];
  
  for (const segment of segments) {
    const [start, end] = segment.split('-');
    if (!start || !end) continue;
    
    const [startSurahVerse] = start.split('.');
    const [startSurah, startVerse] = startSurahVerse.split(':');
    const [endSurahVerse] = end.split('.');
    const [endSurah, endVerse] = endSurahVerse.split(':');
    
    result.push({
      surah: parseInt(startSurah, 10),
      startVerse: parseInt(startVerse, 10),
      endVerse: parseInt(endVerse, 10),
    });
  }
  return result.length > 0 ? result : null;
}

const KalimaIndex = () => {
  const { id, verseId, kalimaId } = useParams<{
    id: string;
    verseId: string;
    kalimaId: string;
  }>();
  const surahId = parseInt(id || "1", 10);
  const verseNum = parseInt(verseId || "1", 10);
  const wordIndex = parseInt(kalimaId || "1", 10) - 1;

  const {
    fontSize,
    translationFontSize,
    quranFont,
    showArabicText,
    hoverTranslation,
    inlineTranslation,
    transliterationSize,
    hoverTransliteration,
    inlineTransliteration,
    hideVerses,
    hideVerseMarkers,
  } = useApp();

  const {
    stop: stopAudio,
    isPlaying: isAudioPlaying,
    currentSurah,
    playFullSurah,
    togglePlayPause,
  } = useAudio();

  // 🌟 Centralized React Query client cache hook
  const { data: corpus, isLoading: isCorpusLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
  });

  const { data: surahData, isLoading: isSurahLoading, error, refetch } = useQuranData(surahId);
  const verses = surahData?.verses;
  const verse = useMemo(() => verses?.find((v) => v.verseNumber === verseNum), [verses, verseNum]);
  const word = verse?.words[wordIndex];

  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } = useReadingSession();
  const { activeGoal } = useQuranGoals();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [surahInfoDialog, setSurahInfoDialog] = useState(false);
  const [renderDialog, setRenderDialog] = useState<{ open: boolean; ayah?: number; mode: "render" | "embed" }>({ open: false, mode: "render" });

  const [tafsirDialog, setTafsirDialog] = useState<{ open: boolean; verseNumber: number }>({ open: false, verseNumber: verseNum });
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; ayahId?: number; verse?: any }>({ open: false });
  const [shareDialog, setShareDialog] = useState<{ open: boolean; ayahId?: number; verseText?: string; translation?: string }>({ open: false });

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute boundaries from dynamic network configuration arrays
  const surah = useMemo(() => {
    if (!corpus?.surahs) return null;
    return corpus.surahs.find((s: any) => s.id === surahId) || corpus.surahs[0];
  }, [corpus, surahId]);

  const prevSurah = useMemo(() => {
    if (!corpus?.surahs) return null;
    return corpus.surahs.find((s: any) => s.id === surahId - 1) || null;
  }, [corpus, surahId]);

  const nextSurah = useMemo(() => {
    if (!corpus?.surahs) return null;
    return corpus.surahs.find((s: any) => s.id === surahId + 1) || null;
  }, [corpus, surahId]);

  // --- Page layout helpers ---
  const pageNumber = useMemo(() => {
    if (!surah || !surah.pages || !corpus?.pageMap) return 1;
    for (let p = surah.pages[0]; p <= surah.pages[1]; p++) {
      const rawPageData = corpus.pageMap[p - 1];
      const segs = parseClientPageSegments(rawPageData);
      if (segs) {
        const sSeg = segs.find(s => s.surah === surah.id);
        if (sSeg && verseNum >= sSeg.startVerse && verseNum <= sSeg.endVerse) return p;
      }
    }
    return surah.pages[0];
  }, [surah, verseNum, corpus]);

  const pageFontFamily = useMemo(() => {
    switch (quranFont) {
      case "indopak":    return "IndoPak";
      case "uthmani_v1": return `Uthmani-V1-${pageNumber}`;
      case "uthmani_v2": return `Uthmani-V2-${pageNumber}`;
      case "uthmani_v4": return `Uthmani-V4-${pageNumber}`;
      default:           return "Uthmani";
    }
  }, [quranFont, pageNumber]);

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
  const transliterationFontSizeValue = `${(1 * transliterationSize) / 3}rem`;

  // Build a single‑word ResolvedWord line
  const resolvedLines = useMemo<any[][]>(() => {
    if (!verse || word === undefined) return [];
    const wordObj = {
      glyph: word,
      verse,
      wordIndex,
      isVerseEnd: wordIndex === verse.words.length - 1,
      isVerseNumber: false,
      isVerseMarker: wordIndex === verse.words.length - 1,
      verseNumber: wordIndex === verse.words.length - 1 ? verse.verseNumber : undefined,
      transliteration: verse.wbwTransliteration?.[wordIndex],
    };
    return [[wordObj]];
  }, [verse, word, wordIndex]);

  // --- Reading session (time‑based goals) ---
  const isTimeGoal = activeGoal?.goal_type === "time_based";
  const shouldTrack = isTrackingEnabled && isTimeGoal;

  useEffect(() => {
    if (!shouldTrack) return;
    startSession();
    sessionIntervalRef.current = setInterval(async () => {
      const seconds = await stopSession();
      if (seconds > 0 && activeGoal) saveSecondsToGoal(activeGoal.id, seconds);
      startSession();
    }, 10000);
    return () => {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
      stopSession().then((seconds) => {
        if (seconds > 0 && activeGoal) saveSecondsToGoal(activeGoal.id, seconds);
      });
    };
  }, [shouldTrack, activeGoal, startSession, stopSession, saveSecondsToGoal]);

  // --- Navigation ---
  const totalWordsInVerse = verse?.words.length || 0;
  const hasPrevWord = verse && wordIndex > 0;
  const hasNextWord = verse && wordIndex < totalWordsInVerse - 1;
  const hasPrevVerse = verseNum > 1;
  const hasNextVerse = verses && verseNum < verses.length;

  const getPrevUrl = (): string | null => {
    if (hasPrevWord)
      return `/Quran/Surah/${surahId}/Ayah/${verseNum}/Kalima/${wordIndex}`;
    if (hasPrevVerse && verses) {
      const prevVerse = verses[verseNum - 2];
      const lastWordIdx = prevVerse.words.length;
      return `/Quran/Surah/${surahId}/Ayah/${verseNum - 1}/Kalima/${lastWordIdx}`;
    }
    return null;
  };

  const getNextUrl = (): string | null => {
    if (hasNextWord)
      return `/Quran/Surah/${surahId}/Ayah/${verseNum}/Kalima/${wordIndex + 2}`;
    if (hasNextVerse && verses)
      return `/Quran/Surah/${surahId}/Ayah/${verseNum + 1}/Kalima/1`;
    return null;
  };

  // --- Juz / Hizb (Computed client-side) ---
  const { currentJuz, currentHizb } = useMemo(() => {
    if (!corpus?.juzData) return { currentJuz: 1, currentHizb: 1 };
    const juzInfo = corpus.juzData.find((juz: any) =>
      juz.surahs.some((s: any) => s.id === surahId)
    );
    const juzNumber = juzInfo?.juzNumber || 1;
    const hizbNumber = (juzNumber - 1) * 2 + 1;
    return { currentJuz: juzNumber, currentHizb: hizbNumber };
  }, [corpus, surahId]);

  // Show SurahHeader only for the first word of the first ayah
  const showHeader = verseNum === 1 && wordIndex === 0;

  const handleAudioClick = () => {
    setShowAudioPlayer(true);
    if (currentSurah === surahId && isAudioPlaying) {
      togglePlayPause();
    } else if (currentSurah === surahId && !isAudioPlaying) {
      togglePlayPause();
    } else {
      playFullSurah(surahId);
    }
  };

  const isLoading = isCorpusLoading || isSurahLoading;

  if (isLoading || !surah) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[17em] mx-auto px-4 pt-28" style={{ fontSize: arabicFontSize }}>
          {showHeader && (
            <SurahHeader
              surah={surah || {}}
              fontClass={getFontClass()}
              arabicFontSize={arabicFontSize}
              onInfoClick={() => setSurahInfoDialog(true)}
              onAudioClick={handleAudioClick}
              onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: verseNum })}
              onRenderClick={() => setRenderDialog({ open: true, mode: "render" })}
            />
          )}
          <Container className={`w-full ${showHeader ? "!rounded-t-none !rounded-b-[48px]" : "!rounded-[48px]"} mb-12`}>
            <div className="p-6">
              <Skeleton className="h-8 w-full" />
            </div>
          </Container>
        </div>
      </Layout>
    );
  }

  if (error || !verse || word === undefined) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[17em] mx-auto px-4 pt-28" style={{ fontSize: arabicFontSize }}>
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load word parameters over the network interface.
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div style={{ fontSize: arabicFontSize }} className="w-full max-w-[17em] mx-auto px-4 pt-28">
        {showHeader && (
          <SurahHeader
            surah={surah}
            fontClass={getFontClass()}
            arabicFontSize={arabicFontSize}
            onInfoClick={() => setSurahInfoDialog(true)}
            onAudioClick={handleAudioClick}
            onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: verseNum })}
            onRenderClick={() => setRenderDialog({ open: true, mode: "render" })}
          />
        )}

        <Container className={`w-full ${showHeader ? "!rounded-t-none !rounded-b-[48px]" : "!rounded-[48px]"} mb-12`}>
          <div>
            <PageLines
              resolvedLines={resolvedLines}
              fontClass={getFontClass()}
              arabicFontSize={`calc(${arabicFontSize} * 1.8)`}
              wordSpacing="1.8px"
              surahId={surahId}
              verseRefs={verseRefs}
              hoveredVerse={null}
              setHoveredVerse={() => {}}
              showTransliteration={false}
              transliterationFontSize={transliterationFontSizeValue}
              hoverTranslation={hoverTranslation}
              inlineTranslation={inlineTranslation}
              inlineTransliteration={inlineTransliteration}
              hideVerses={hideVerses}
              hideVerseMarkers={hideVerseMarkers}
              bismillahWords={[]}
              pageFontFamily={pageFontFamily}
              isIndoPakFont={quranFont === "indopak"}
              verseMarkerMap={[]}
              isUthmaniV4Font={quranFont === "uthmani_v4"}
            />
          </div>
          <div className="flex items-center justify-center pb-1">
            <span className="text-sm text-muted-foreground font-medium">
              Juz - {currentJuz} | Page - {pageNumber} | Hizb - {currentHizb}
            </span>
          </div>
        </Container>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Button size="sm" variant="ghost" onClick={() => setRenderDialog({ open: true, mode: "render" })}>
            Render Surah
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRenderDialog({ open: true, mode: "embed", ayah: verseNum })}>
            Embed Ayah
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 mt-6">
          {getPrevUrl() ? (
            <Link to={getPrevUrl()!}>
              <Button className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </Link>
          ) : (
            <div className="w-[110px]" />
          )}
          <div className="flex-1" />
          {getNextUrl() ? (
            <Link to={getNextUrl()!}>
              <Button className="gap-2">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div className="w-[110px]" />
          )}
        </div>

        <div className="flex items-center justify-center gap-3 py-4 mt-8">
          {prevSurah && (
            <Link to={`/Quran/Surah/${prevSurah.id}/Ayah/1/Kalima/1`}>
              <Button className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Previous Surah
              </Button>
            </Link>
          )}
          {nextSurah && (
            <Link to={`/Quran/Surah/${nextSurah.id}/Ayah/1/Kalima/1`}>
              <Button className="gap-2">
                Next Surah
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <AudioPlayer
        isVisible={showAudioPlayer}
        onClose={() => {
          stopAudio();
          setShowAudioPlayer(false);
        }}
        surahId={surahId}
        surahName={surah.englishName}
      />

      <NotesDialog
        open={notesDialog.open}
        onOpenChange={(open) => setNotesDialog({ ...notesDialog, open })}
        surahId={surahId}
        ayahId={notesDialog.ayahId}
        verse={notesDialog.verse}
      />
      <ShareDialog
        open={shareDialog.open}
        onOpenChange={(open) => setShareDialog({ ...shareDialog, open })}
        surahId={surahId}
        surahName={surah.englishName}
        ayahId={shareDialog.ayahId}
        verseText={shareDialog.verseText}
        translation={shareDialog.translation}
      />
      <SurahInfoDialog
        open={surahInfoDialog}
        onOpenChange={setSurahInfoDialog}
        surahId={surahId}
      />
      <TafsirDialog
        open={tafsirDialog.open}
        onOpenChange={(open) => setTafsirDialog((prev) => ({ ...prev, open }))}
        surahId={surahId}
        verseNumber={tafsirDialog.verseNumber}
      />
      <RenderSurahDialog
        open={renderDialog.open}
        onOpenChange={(o) => setRenderDialog((p) => ({ ...p, open: o }))}
        surahId={surahId}
        ayahNumber={renderDialog.ayah}
        mode={renderDialog.mode}
      />
    </Layout>
  );
};

export default KalimaIndex;