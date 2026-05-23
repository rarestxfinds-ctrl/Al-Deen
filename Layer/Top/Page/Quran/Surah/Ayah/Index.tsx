import { useParams, useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { AudioPlayer } from "@/Top/Component/Audio-Player/Index";
import { SurahHeader } from "@/Top/Component/Quran/Surah/Header";
import { PageLines } from "@/Top/Component/Quran/Layout/Safhah/Main";
import { AyahView } from "@/Top/Component/Quran/Layout/Ayah/Index";
import { NotesDialog } from "@/Top/Component/Dialog/Notes";
import { ShareDialog } from "@/Top/Component/Dialog/Share";
import { SurahInfoDialog } from "@/Top/Component/Dialog/Surah-Info";
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
import { useReadingProgress } from "@/Middle/Hook/Use-Reading-Progress";
import { useReadingSession } from "@/Middle/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Middle/Hook/Use-Quran-Goals";
import { Button } from "@/Top/Component/UI/button";
import { TafsirDialog } from "@/Top/Component/Dialog/Tafsir";
import { Container } from "@/Top/Component/UI/Container";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/Top/Component/UI/Alert";
import { AudioControls } from "@/Top/Component/Quran/Record";
import { useDeepgram } from "@/Middle/Hook/Use-STT";

const AyahIndex = () => {
  const { id, verseId } = useParams<{ id: string; verseId: string }>();
  const [searchParams] = useSearchParams();
  const surahId = parseInt(id || "1");
  const verseNum = parseInt(verseId || "1");
  const surah = surahList.find((s) => s.id === surahId) || surahList[0];
  const targetVerse = searchParams.get("verse") || verseNum.toString();

  const {
    layout,
    fontSize,
    translationFontSize,
    quranFont,
    showArabicText,
    verseTranslation,
    hoverTranslation,
    inlineTranslation,
    transliterationSize,
    selectedAyahTransliterator,
    hoverTransliteration,
    inlineTransliteration,
    hideVerses,
    setHideVerses,
    hideVerseMarkers,
    recordAudioEnabled,
  } = useApp();

  const showTransliteration = selectedAyahTransliterator !== "None";
  const { stop: stopAudio, isPlaying } = useAudio();
  const { data: surahData, isLoading, error, refetch } = useQuranData(surahId);
  const verses = surahData?.verses;
  const verse = verses?.find((v) => v.verseNumber === verseNum);
  const { updateProgress } = useReadingProgress();
  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } = useReadingSession();
  const { activeGoal } = useQuranGoals();
  const { hifz } = useApp();

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
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPageLayout = layout === "page";
  const isTimeGoal = activeGoal?.goal_type === "time_based";
  const shouldTrack = isTrackingEnabled && isTimeGoal;

  // ---------- Deepgram / STT ----------
  const {
    toggleRecording,
    isRecording: isDeepgramRecording,
    transcript,
    sendRawAudio,
    connectWebSocket,
    error: deepgramError,
  } = useDeepgram({
    surahId,
    verses,
    visibleVerse: verseNum,
    hifz,
  });

  // ---------- Juz / Hizb (no rough page) ----------
  const { currentJuz, currentHizb } = useMemo(() => {
    const juzInfo = juzData.find((juz) => juz.surahs.some((s) => s.id === surahId));
    const juzNumber = juzInfo?.juzNumber || 1;
    const hizbNumber = (juzNumber - 1) * 2 + 1;
    return {
      currentJuz: juzNumber,
      currentHizb: hizbNumber,
    };
  }, [surahId]);

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

  // ---------- Page layout helpers ----------
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

  const bismillahFontFamily = useMemo(() => {
    switch (quranFont) {
      case "indopak":    return "IndoPak";
      case "uthmani_v1": return "Uthmani-V1-1";
      case "uthmani_v2": return "Uthmani-V2-1";
      case "uthmani_v4": return "Uthmani-V4-1";
      default:           return "Uthmani";
    }
  }, [quranFont]);

  const showBismillah = surah.id !== 1 && surah.id !== 9 && verseNum === 1 && showArabicText;
  const { data: surah1Data } = useQuranData(1);
  const bismillahWords = useMemo(() => {
    if (!showBismillah || !surah1Data?.verses?.length) return [];
    const firstVerse = surah1Data.verses[0];
    if (firstVerse.words.length < 4) return [];
    return firstVerse.words.slice(0, 4).map((glyph, idx) => ({
      glyph,
      translation: firstVerse.wbwTranslationInline?.[idx] || firstVerse.wbwTranslationHover?.[idx],
      transliteration: firstVerse.wbwTransliterationInline?.[idx] || firstVerse.wbwTransliterationHover?.[idx],
    }));
  }, [showBismillah, surah1Data]);

  const resolvedLines: ResolvedWord[][] = useMemo(() => {
    if (!verse || !isPageLayout) return [];
    const words = verse.words.map((glyph, idx) => ({
      glyph,
      verse,
      wordIndex: idx,
      isVerseEnd: idx === verse.words.length - 1,
      isVerseNumber: false,
      isVerseMarker: idx === verse.words.length - 1,
      verseNumber: idx === verse.words.length - 1 ? verse.verseNumber : undefined,
      transliteration: verse.wbwTransliteration?.[idx],
    }));
    return [words];
  }, [verse, isPageLayout]);

  // ---------- Test audio ----------
  const sendTestAudio = useCallback(async () => {
    const audioPath = `/Layer/Bottom/Data/Quran/Qiraat/Mishary_Rashid_Alafasy/Surah/${surahId}/Ayah/${verseNum}/Audio.mp3`;
    try {
      const response = await fetch(audioPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      await connectWebSocket();
      sendRawAudio(arrayBuffer);
    } catch (err) {
      console.error("Failed to send test audio:", err);
    }
  }, [connectWebSocket, sendRawAudio, surahId, verseNum]);

  const handleRecordToggle = () => toggleRecording();

  // ---------- Reading session ----------
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

  // ---------- Scroll to verse ----------
  useEffect(() => {
    if (verse) {
      const el = verseRefs.current.get(verseNum);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [verse, verseNum]);

  useEffect(() => {
    if (targetVerse && verses) {
      const target = parseInt(targetVerse);
      const el = verseRefs.current.get(target);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [targetVerse, verses]);

  const showHeader = verseNum === 1;

  // ---------- Surah navigation helpers ----------
  const prevSurah = surahList.find((s) => s.id === surahId - 1);
  const nextSurah = surahList.find((s) => s.id === surahId + 1);

  // ---------- Render ----------
  if (isLoading) {
    return null; // No skeleton
  }

  if (error || !verse) {
    return (
      <Layout hideFooter>
        <div
          className="w-full max-w-[17em] mx-auto px-4 pt-0 md:pt-0"
          style={{ fontSize: arabicFontSize }}
        >
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || "Failed to load verse data. Please try again later."}
            </AlertDescription>
          </Alert>
          <div className="text-center space-x-4">
            <Button onClick={() => refetch()}>Try Again</Button>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div
        style={{ fontSize: arabicFontSize }}
        className="w-full max-w-[17em] mx-auto pt-0 px-0 md:px-4"
      >
        {/* Header – only for the first verse */}
        {showHeader && (
          <SurahHeader
            surah={surah}
            fontClass={getFontClass()}
            arabicFontSize={arabicFontSize}
            onInfoClick={() => setSurahInfoDialog(true)}
            onAudioClick={() => setShowAudioPlayer(true)}
            onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: verseNum })}
          />
        )}

        <div ref={containerRef} className="w-full">
          {isPageLayout ? (
            <Container
              className={`w-full ${
                showHeader ? "!rounded-t-none !rounded-b-[48px]" : "!rounded-[48px]"
              } mb-12`}
            >
              <div>
                <PageLines
                  resolvedLines={resolvedLines}
                  fontClass={getFontClass()}
                  arabicFontSize={arabicFontSize}
                  wordSpacing="1.8px"
                  surahId={surahId}
                  verseRefs={verseRefs}
                  hoveredVerse={null}
                  setHoveredVerse={() => {}}
                  showTransliteration={showTransliteration}
                  transliterationFontSize={transliterationFontSizeValue}
                  hoverTranslation={hoverTranslation}
                  inlineTranslation={inlineTranslation}
                  inlineTransliteration={inlineTransliteration}
                  hideVerses={hideVerses}
                  hideVerseMarkers={hideVerseMarkers}
                  bismillahWords={showBismillah ? bismillahWords : []}
                  bismillahFontFamily={showBismillah ? bismillahFontFamily : undefined}
                  bismillahFontClass={getFontClass()}
                  bismillahFontSize={arabicFontSize}
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
          ) : (
            <AyahView
              surah={surah}
              verses={[verse]}
              showArabicText={showArabicText}
              verseTranslation={verseTranslation}
              inlineTranslation={inlineTranslation}
              translationFontSize={translationFontSizeValue}
              transliterationFontSize={transliterationFontSizeValue}
              selectedAyahTransliterator={selectedAyahTransliterator}
              targetVerse={null}
              verseRefs={verseRefs}
              onNotesClick={(ayahId) => {
                const v = verses?.find((v) => v.verseNumber === ayahId);
                setNotesDialog({ open: true, ayahId, verse: v });
              }}
              onTafsirClick={(ayahId) => setTafsirDialog({ open: true, verseNumber: ayahId })}
              onShareClick={(ayahId, verseText, translation) =>
                setShareDialog({ open: true, ayahId, verseText, translation })
              }
              hoverTransliteration={hoverTransliteration}
              inlineTransliteration={inlineTransliteration}
            />
          )}

          {/* Navigation – icon-only, same style as Surah page */}
          <div className="flex items-center justify-center gap-2 py-2 mt-2">
            {verseNum > 1 ? (
              <Link to={`/Quran/Surah/${surahId}/Ayah/${verseNum - 1}`}>
                <Button size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            ) : prevSurah ? (
              <Link to={`/Quran/Surah/${prevSurah.id}/Ayah/1`}>
                <Button size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}

            {verseNum < surah.numberOfAyahs ? (
              <Link to={`/Quran/Surah/${surahId}/Ayah/${verseNum + 1}`}>
                <Button size="icon" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : nextSurah ? (
              <Link to={`/Quran/Surah/${nextSurah.id}/Ayah/1`}>
                <Button size="icon" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {recordAudioEnabled && (
        <AudioControls
          isRecording={isDeepgramRecording}
          onRecordToggle={handleRecordToggle}
          onTestAudio={sendTestAudio}
          hideVerses={hideVerses}
          onHideVersesToggle={setHideVerses}
          transcript={transcript}
        />
      )}

      <AudioPlayer
        isVisible={showAudioPlayer}
        onClose={() => { stopAudio(); setShowAudioPlayer(false); }}
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
        onOpenChange={(open) => setTafsirDialog(prev => ({ ...prev, open }))}
        surahId={surahId}
        verseNumber={tafsirDialog.verseNumber}
      />
    </Layout>
  );
};

export default AyahIndex;