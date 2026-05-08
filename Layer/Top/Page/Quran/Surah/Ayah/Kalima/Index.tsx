import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { AudioPlayer } from "@/Top/Component/Audio-Player/Index";
import { SurahHeader } from "@/Top/Component/Quran/Surah/Header";
import { PageLines } from "@/Top/Component/Quran/Layout/Safhah/Main";
import { NotesDialog } from "@/Top/Component/Dialog/Notes";
import { ShareDialog } from "@/Top/Component/Dialog/Share";
import { SurahInfoDialog } from "@/Top/Component/Dialog/Surah-Info";
import { TafsirDialog } from "@/Top/Component/Dialog/Tafsir";
import {
  surahList,
  juzData,
  getPageSegments,
  type AssembledVerse,
  type ResolvedWord,
} from "@/Bottom/API/Quran";
import { useApp } from "@/Middle/Context/App";
import { useAudio } from "@/Middle/Context/Audio";
import { useQuranData } from "@/Middle/Hook/Use-Quran-Data";
import { useReadingSession } from "@/Middle/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Middle/Hook/Use-Quran-Goals";
import { Button } from "@/Top/Component/UI/button";
import { Skeleton } from "@/Top/Component/UI/Skeleton";
import { Container } from "@/Top/Component/UI/Container";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { Alert, AlertDescription } from "@/Top/Component/UI/Alert";

const KalimaIndex = () => {
  const { id, verseId, kalimaId } = useParams<{
    id: string;
    verseId: string;
    kalimaId: string;
  }>();
  const surahId = parseInt(id || "1");
  const verseNum = parseInt(verseId || "1");
  const wordIndex = parseInt(kalimaId || "1") - 1;
  const surah = surahList.find((s) => s.id === surahId) || surahList[0];

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

  const { data: surahData, isLoading, error, refetch } = useQuranData(surahId);
  const verses = surahData?.verses;
  const verse = verses?.find((v) => v.verseNumber === verseNum);
  const word = verse?.words[wordIndex];

  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } =
    useReadingSession();
  const { activeGoal } = useQuranGoals();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [surahInfoDialog, setSurahInfoDialog] = useState(false);
  const [tafsirDialog, setTafsirDialog] = useState<{
    open: boolean;
    verseNumber: number;
  }>({ open: false, verseNumber: verseNum });
  const [notesDialog, setNotesDialog] = useState<{
    open: boolean;
    ayahId?: number;
    verse?: AssembledVerse;
  }>({ open: false });
  const [shareDialog, setShareDialog] = useState<{
    open: boolean;
    ayahId?: number;
    verseText?: string;
    translation?: string;
  }>({ open: false });

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Page layout helpers ---
  const pageNumber = useMemo(() => {
    if (!surah.pages) return 1;
    for (let p = surah.pages[0]; p <= surah.pages[1]; p++) {
      const segs = getPageSegments(p);
      if (segs) {
        const sSeg = segs.find(s => s.surah === surah.id);
        if (sSeg && verseNum >= sSeg.startVerse && verseNum <= sSeg.endVerse) return p;
      }
    }
    return surah.pages[0];
  }, [surah, verseNum]);

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
  const resolvedLines: ResolvedWord[][] = useMemo(() => {
    if (!verse || word === undefined) return [];
    const wordObj: ResolvedWord = {
      glyph: word,
      verse,
      wordIndex,
      isVerseEnd: wordIndex === verse.words.length - 1,
      isVerseNumber: false,
      isVerseMarker: wordIndex === verse.words.length - 1,
      verseNumber:
        wordIndex === verse.words.length - 1 ? verse.verseNumber : undefined,
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
      return `/Quran/Surah/${surahId}/Ayah/${verseNum}/Kalima/${wordIndex}`; // 1‑based
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

  const prevSurah = surahList.find((s) => s.id === surahId - 1);
  const nextSurah = surahList.find((s) => s.id === surahId + 1);

  // --- Juz / Hizb (unchanged) ---
  const { currentJuz, currentHizb } = useMemo(() => {
    const juzInfo = juzData.find((juz) =>
      juz.surahs.some((s) => s.id === surahId)
    );
    const juzNumber = juzInfo?.juzNumber || 1;
    const hizbNumber = (juzNumber - 1) * 2 + 1;
    return {
      currentJuz: juzNumber,
      currentHizb: hizbNumber,
    };
  }, [surahId]);

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

  if (isLoading) {
    return (
      <Layout hideFooter>
        <div
          className="w-full max-w-[17em] mx-auto px-4 pt-28"
          style={{ fontSize: arabicFontSize }}
        >
          {showHeader && (
            <SurahHeader
              surah={surah}
              fontClass={getFontClass()}
              arabicFontSize={arabicFontSize}
              onInfoClick={() => setSurahInfoDialog(true)}
              onAudioClick={handleAudioClick}
              onTafsirClick={() =>
                setTafsirDialog({ open: true, verseNumber: verseNum })
              }
            />
          )}
          <Container
            className={`w-full ${
              showHeader
                ? "!rounded-t-none !rounded-b-[48px]"
                : "!rounded-[48px]"
            } mb-12`}
          >
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
        <div
          className="w-full max-w-[17em] mx-auto px-4 pt-28"
          style={{ fontSize: arabicFontSize }}
        >
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load word data. Please try again later.
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
      <div
        style={{ fontSize: arabicFontSize }}
        className="w-full max-w-[17em] mx-auto px-4 pt-28"
      >
        {/* SurahHeader only for the first word of the first ayah */}
        {showHeader && (
          <SurahHeader
            surah={surah}
            fontClass={getFontClass()}
            arabicFontSize={arabicFontSize}
            onInfoClick={() => setSurahInfoDialog(true)}
            onAudioClick={handleAudioClick}
            onTafsirClick={() =>
              setTafsirDialog({ open: true, verseNumber: verseNum })
            }
          />
        )}

        {/* Word container – flat top when header is present */}
        <Container
          className={`w-full ${
            showHeader
              ? "!rounded-t-none !rounded-b-[48px]"
              : "!rounded-[48px]"
          } mb-12`}
        >
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

          {/* Juz - Page - Hizb info */}
          <div className="flex items-center justify-center pb-1">
            <span className="text-sm text-muted-foreground font-medium">
              Juz - {currentJuz} | Page - {pageNumber} | Hizb - {currentHizb}
            </span>
          </div>
        </Container>

        {/* Word‑to‑word navigation */}
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

        {/* Surah boundary navigation */}
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
        surah={surah}
      />
      <TafsirDialog
        open={tafsirDialog.open}
        onOpenChange={(open) =>
          setTafsirDialog((prev) => ({ ...prev, open }))
        }
        surahId={surahId}
        verseNumber={tafsirDialog.verseNumber}
      />
    </Layout>
  );
};

export default KalimaIndex;