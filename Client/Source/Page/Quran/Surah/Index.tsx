import { useParams, useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/Component/Layout/Index";
import { AudioPlayer } from "@/Component/Audio-Player/Index";
import { SurahHeader } from "@/Component/Quran/Surah/Header";
import { PageView } from "@/Component/Quran/Layout/Safhah/Index";
import { AyahView } from "@/Component/Quran/Layout/Ayah/Index";
import { NotesDialog } from "@/Component/Dialog/Notes";
import { ShareDialog } from "@/Component/Dialog/Share";
import { SurahInfoDialog } from "@/Component/Dialog/Surah-Info";
import { useApp } from "@/Context/App";
import { useAudio } from "@/Context/Audio";
import { useQuranData } from "@/Hook/Use-Quran-Data";
import { useReadingProgress } from "@/Hook/Use-Reading-Progress";
import { useReadingSession } from "@/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Hook/Use-Quran-Goals";
import { Button } from "@/Component/UI/button";
import { TafsirDialog } from "@/Component/Dialog/Tafsir";
import { RenderSurahDialog } from "@/Component/Dialog/Render-Quran/Index";
import { Container } from "@/Component/UI/Container";
import { AlertCircle, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/Component/UI/Alert";
import { AudioControls } from "@/Component/Quran/Record";
import { useDeepgram } from "@/Hook/Use-STT";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Network Fetch Client Handler
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

const Surah = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const surahId = parseInt(id || "1", 10);
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

  // 🌟 Ingest entire structural framework out of the network cache interface
  const { data: corpus, isLoading: isCorpusLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // 30 minutes client cache validity
  });

  const showTransliteration = selectedAyahTransliterator !== "None";
  const { stop: stopAudio, isPlaying, playFullSurah } = useAudio();
  const { data: surahData, isLoading: isSurahLoading, error, refetch } = useQuranData(surahId);
  const verses = surahData?.verses;
  const { updateProgress } = useReadingProgress();
  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } = useReadingSession();
  const { activeGoal } = useQuranGoals();
  const { hifz } = useApp();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [surahInfoDialog, setSurahInfoDialog] = useState(false);
  const [renderDialog, setRenderDialog] = useState<{ open: boolean; ayah?: number; mode: "render" | "embed" }>({ open: false, mode: "render" });
  const [tafsirDialog, setTafsirDialog] = useState<{ open: boolean; verseNumber: number }>({ open: false, verseNumber: 1 });
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; ayahId?: number; verse?: any }>({ open: false });
  const [shareDialog, setShareDialog] = useState<{ open: boolean; ayahId?: number; verseText?: string; translation?: string }>({ open: false });

  const [visibleVerse, setVisibleVerse] = useState(1);

  const {
    toggleRecording,
    isRecording: isDeepgramRecording,
    transcript,
  } = useDeepgram({
    surahId,
    verses,
    visibleVerse,
    hifz,
    onVerseComplete: (completedVerse) => {
      const next = completedVerse + 1;
      const el = verseRefs.current.get(next);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  });

  const sendTestAudio = useCallback(() => {
    setShowAudioPlayer(true);
    playFullSurah(surahId);
  }, [surahId, playFullSurah]);

  const handleRecordToggle = () => toggleRecording();

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPageLayout = layout === "page";
  const isTimeGoal = activeGoal?.goal_type === "time_based";
  const shouldTrack = isTrackingEnabled && isTimeGoal;

  // Compute active metadata properties client-side out of cache structures
  const sur = useMemo(() => {
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

  const { currentJuz, currentHizb } = useMemo(() => {
    if (!corpus?.juzData) return { currentJuz: 1, currentHizb: 1 };
    const juzInfo = corpus.juzData.find((juz: any) => juz.surahs.some((s: any) => s.id === surahId));
    const juzNumber = juzInfo?.juzNumber || 1;
    return {
      currentJuz: juzNumber,
      currentHizb: (juzNumber - 1) * 2 + 1,
    };
  }, [corpus, surahId]);

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
    const progress = Math.min(100, Math.max(0, (scrollPosition / container.scrollHeight) * 100));
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

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const isPageDataLoading = isCorpusLoading || isSurahLoading;

  useEffect(() => {
    if (targetVerse && verses) {
      const verseNumber = parseInt(targetVerse, 10);
      const el = verseRefs.current.get(verseNumber);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    } else if (!targetVerse && !isPageDataLoading && verses) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [surahId, targetVerse, verses, isPageDataLoading]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const pageFooter = useCallback(
    (pageNumber: number) => (
      <span className="text-sm text-muted-foreground font-medium">
        Juz - {currentJuz} | Page - {pageNumber} | Hizb - {currentHizb}
      </span>
    ),
    [currentJuz, currentHizb]
  );

  if (isPageDataLoading || !sur) {
    return null;
  }

  if (error) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[19em] mx-auto px-4 pt-28" style={{ fontSize: arabicFontSize }}>
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message || "Failed to load Surah data frameworks."}</AlertDescription>
          </Alert>
          <div className="text-center space-x-4">
            <Button onClick={() => refetch()}>Try Again</Button>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!verses) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[19em] mx-auto px-4 pt-28" style={{ fontSize: arabicFontSize }}>
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No verses found for this surah collection map.</AlertDescription>
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
      <div style={{ fontSize: arabicFontSize }} className="w-full max-w-[19em] mx-auto pt-0 px-0">
        <SurahHeader
          surah={sur}
          fontClass={getFontClass()}
          arabicFontSize={arabicFontSize}
          onInfoClick={() => setSurahInfoDialog(true)}
          onAudioClick={() => setShowAudioPlayer(true)}
          onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: 1 })}
          onRenderClick={() => setRenderDialog({ open: true, mode: "render" })}
        />

        <div ref={containerRef} className="w-full">
          {isPageLayout ? (
            <PageView
              surah={sur}
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
              pageFooter={pageFooter}
            />
          ) : (
            <AyahView
              surah={sur}
              verses={verses}
              showArabicText={showArabicText && !hideVerses}
              verseTranslation={verseTranslation}
              inlineTranslation={inlineTranslation}
              translationFontSize={translationFontSizeValue}
              transliterationFontSize={transliterationFontSizeValue}
              selectedAyahTransliterator={selectedAyahTransliterator}
              targetVerse={targetVerse}
              verseRefs={verseRefs}
              onNotesClick={(ayahId) => {
                const targetVerseObj = verses.find((v) => v.verseNumber === ayahId);
                setNotesDialog({ open: true, ayahId, verse: targetVerseObj });
              }}
              onTafsirClick={(ayahId) => setTafsirDialog({ open: true, verseNumber: ayahId })}
              onShareClick={(ayahId, verseText, translation) =>
                setShareDialog({ open: true, ayahId, verseText, translation })
              }
              onEmbedClick={(ayahId) => setRenderDialog({ open: true, mode: "embed", ayah: ayahId })}
              onRenderClick={(ayahId) => setRenderDialog({ open: true, mode: "render", ayah: ayahId })}
              hoverTransliteration={hoverTransliteration}
              inlineTransliteration={inlineTransliteration}
            />
          )}

          <div className="flex items-center justify-center gap-2 py-2">
            {prevSurah && (
              <Link to={`/Quran/Surah/${prevSurah.id}`}>
                <Button size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button onClick={scrollToTop} size="icon" className="h-8 w-8">
              <ChevronUp className="h-4 w-4" />
            </Button>
            {nextSurah && (
              <Link to={`/Quran/Surah/${nextSurah.id}`}>
                <Button size="icon" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
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
        surahName={sur.englishName}
      />
      <NotesDialog open={notesDialog.open} onOpenChange={(open) => setNotesDialog({ ...notesDialog, open })}
        surahId={surahId} ayahId={notesDialog.ayahId} verse={notesDialog.verse} />
      <ShareDialog open={shareDialog.open} onOpenChange={(open) => setShareDialog({ ...shareDialog, open })}
        surahId={surahId} surahName={sur.englishName} ayahId={shareDialog.ayahId}
        verseText={shareDialog.verseText} translation={shareDialog.translation} />
      <SurahInfoDialog open={surahInfoDialog} onOpenChange={setSurahInfoDialog} surahId={surahId} />
      <TafsirDialog open={tafsirDialog.open} onOpenChange={(open) => setTafsirDialog(prev => ({ ...prev, open }))}
        surahId={surahId} verseNumber={tafsirDialog.verseNumber} />
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

export default Surah;