import { useParams, useSearchParams } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { SurahNavbar } from "@/Top/Component/Quran/Surah/Navbar";
import { SurahNavigation } from "@/Top/Component/Quran/Surah/Navigation";
import { AudioPlayer } from "@/Top/Component/Audio-Player/Index";
import { SurahHeader } from "@/Top/Component/Quran/Surah/Header";
import { PageView } from "@/Top/Component/Quran/Layout/Safhah/Index";
import { AyahView } from "@/Top/Component/Quran/Layout/Ayah/Index";
import { NotesDialog } from "@/Top/Component/Dialog/Notes";
import { ShareDialog } from "@/Top/Component/Dialog/Share";
import { SurahInfoDialog } from "@/Top/Component/Dialog/Surah-Info";
import { surahList, juzData, type AssembledVerse } from "@/Bottom/API/Quran";
import { useApp } from "@/Middle/Context/App";
import { useAudio } from "@/Middle/Context/Audio";
import { useQuranData } from "@/Middle/Hook/Use-Quran-Data";
import { useReadingProgress } from "@/Middle/Hook/Use-Reading-Progress";
import { useReadingSession } from "@/Middle/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Middle/Hook/Use-Quran-Goals";
import { Button } from "@/Top/Component/UI/button";
import { Skeleton } from "@/Top/Component/UI/Skeleton";
import { TafsirDialog } from "@/Top/Component/Dialog/Tafsir";
import { AlertCircle } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/Top/Component/UI/Alert";
import { AudioControls } from "@/Top/Component/Quran/Record";
import { useDeepgram } from "@/Middle/Hook/Use-STT";

const Surah = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const surahId = parseInt(id || "1");
  const surah = surahList.find((s) => s.id === surahId) || surahList[0];
  const targetVerse = searchParams.get("verse");

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
  const lines = surahData?.lines;
  const { updateProgress } = useReadingProgress();
  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } = useReadingSession();
  const { activeGoal } = useQuranGoals();
  const { hifz } = useApp(); // assumes hifz is in useApp context

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [surahInfoDialog, setSurahInfoDialog] = useState(false);
  const [tafsirDialog, setTafsirDialog] = useState<{
    open: boolean;
    verseNumber: number;
  }>({ open: false, verseNumber: 1 });
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

  // --- Visible verse state (from scroll) ---
  const [visibleVerse, setVisibleVerse] = useState(1);

  // --- Use the combined STT + alignment hook ---
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
    visibleVerse,
    hifz,
  });

  // --- Test audio handler ---
  const sendTestAudio = useCallback(async () => {
    const audioPath = "/Layer/Bottom/Data/Quran/Qiraat/Mishary_Rashid_Alafasy/Surah/1/Ayah/1/Audio.mp3";
    try {
      console.log("Fetching audio from:", audioPath);
      const response = await fetch(audioPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      await connectWebSocket();
      const success = sendRawAudio(arrayBuffer);
      console.log("Test audio sent:", success);
    } catch (err) {
      console.error("Failed to send test audio:", err);
    }
  }, [connectWebSocket, sendRawAudio]);

  const handleRecordToggle = () => {
    toggleRecording();
  };

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPageLayout = layout === "page";
  const isTimeGoal = activeGoal?.goal_type === "time_based";
  const shouldTrack = isTrackingEnabled && isTimeGoal;

  const { currentJuz, currentHizb, currentPage } = useMemo(() => {
    const juzInfo = juzData.find((juz) => juz.surahs.some((s) => s.id === surahId));
    const juzNumber = juzInfo?.juzNumber || 1;
    const totalVersesBefore = surahList
      .filter((s) => s.id < surahId)
      .reduce((sum, s) => sum + s.numberOfAyahs, 0);
    const pageNumber = Math.ceil((totalVersesBefore / 6236) * 604) || 1;
    return {
      currentJuz: juzNumber,
      currentHizb: (juzNumber - 1) * 2 + 1,
      currentPage: pageNumber,
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

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !verses?.length) return;

    const container = containerRef.current;
    const scrollPosition = window.scrollY - container.offsetTop + window.innerHeight;
    const progress = Math.min(
      100,
      Math.max(0, (scrollPosition / container.scrollHeight) * 100),
    );
    setReadingProgress(progress);

    let newVisibleVerse = 1;
    verseRefs.current.forEach((element, verseId) => {
      const rect = element.getBoundingClientRect();
      if (rect.top <= window.innerHeight / 2 && rect.bottom >= 0) {
        newVisibleVerse = verseId;
      }
    });
    setVisibleVerse(newVisibleVerse);

    if (newVisibleVerse > 1) updateProgress(surahId, newVisibleVerse);
  }, [verses, surahId, updateProgress]);

  useEffect(() => {
    if (!shouldTrack) return;

    startSession();

    sessionIntervalRef.current = setInterval(async () => {
      const seconds = await stopSession();
      if (seconds > 0 && activeGoal) {
        saveSecondsToGoal(activeGoal.id, seconds);
      }
      startSession();
    }, 10000);

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
      stopSession().then((seconds) => {
        if (seconds > 0 && activeGoal) {
          saveSecondsToGoal(activeGoal.id, seconds);
        }
      });
    };
  }, [shouldTrack, activeGoal, startSession, stopSession, saveSecondsToGoal]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (targetVerse && verses) {
      const verseNumber = parseInt(targetVerse);
      const el = verseRefs.current.get(verseNumber);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      }
    } else if (!targetVerse && !isLoading && verses) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [surahId, targetVerse, verses, isLoading]);

  if (isLoading) {
    return (
      <Layout hideFooter>
        <SurahNavbar
          surahName={surah.englishName}
          surahId={surah.id}
          juz={currentJuz}
          hizb={currentHizb}
          page={currentPage}
        />
        <div className="container py-8 max-w-4xl mx-auto space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 border border-border rounded-xl">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout hideFooter>
        <SurahNavbar
          surahName={surah.englishName}
          surahId={surah.id}
          juz={currentJuz}
          hizb={currentHizb}
          page={currentPage}
        />
        <div className="container py-8 max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || "Failed to load Surah data. Please try again later."}
            </AlertDescription>
          </Alert>
          <div className="text-center space-x-4">
            <Button onClick={() => refetch()}>Try Again</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!verses) {
    return (
      <Layout hideFooter>
        <SurahNavbar
          surahName={surah.englishName}
          surahId={surah.id}
          juz={currentJuz}
          hizb={currentHizb}
          page={currentPage}
        />
        <div className="container py-8 max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No verses found for this surah. Please try again.
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <SurahNavbar
        surahName={surah.englishName}
        surahId={surah.id}
        juz={currentJuz}
        hizb={currentHizb}
        page={currentPage}
        progress={readingProgress}
        onAudioToggle={() => setShowAudioPlayer(!showAudioPlayer)}
        isAudioPlaying={isPlaying}
      />

      <div ref={containerRef}>
        <div className="container max-w-4xl mx-auto space-y-6 px-0 sm:px-2">
          <SurahHeader
            surah={surah}
            showBismillah={surahId !== 1 && surahId !== 9 && showArabicText}
            fontClass={getFontClass()}
            arabicFontSize={arabicFontSize}
            onInfoClick={() => setSurahInfoDialog(true)}
            onAudioClick={() => setShowAudioPlayer(true)}
            onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: 1 })}
          />

          {isPageLayout ? (
            <PageView
              surah={surah}
              assembledSurah={surahData}
              showArabicText={showArabicText}
              hoverTranslation={hoverTranslation}
              inlineTranslation={inlineTranslation}
              inlineTransliteration={inlineTransliteration}
              fontClass={getFontClass()}
              arabicFontSize={arabicFontSize}
              translationFontSize={translationFontSizeValue}
              transliterationFontSize={transliterationFontSizeValue}
              showTransliteration={showTransliteration}
              verseRefs={verseRefs}
              hideVerses={hideVerses}
              hideVerseMarkers={hideVerseMarkers}
            />
          ) : (
            <AyahView
              surah={surah}
              verses={verses}
              showArabicText={showArabicText}
              verseTranslation={verseTranslation}
              inlineTranslation={inlineTranslation}
              translationFontSize={translationFontSizeValue}
              transliterationFontSize={transliterationFontSizeValue}
              selectedAyahTransliterator={selectedAyahTransliterator}
              targetVerse={targetVerse}
              verseRefs={verseRefs}
              onNotesClick={(ayahId, verseText) => {
                const verse = verses.find((v) => v.verseNumber === ayahId);
                setNotesDialog({ open: true, ayahId, verse });
              }}
              onTafsirClick={(ayahId) => setTafsirDialog({ open: true, verseNumber: ayahId })}
              onShareClick={(ayahId, verseText, translation) =>
                setShareDialog({ open: true, ayahId, verseText, translation })
              }
              hoverTransliteration={hoverTransliteration}
              inlineTransliteration={inlineTransliteration}
            />
          )}

          <SurahNavigation
            currentSurahId={surahId}
            totalVerses={surah.numberOfAyahs}
          />
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
        onOpenChange={(open) => setTafsirDialog(prev => ({ ...prev, open }))}
        surahId={surahId}
        verseNumber={tafsirDialog.verseNumber}
      />
    </Layout>
  );
};

export default Surah;