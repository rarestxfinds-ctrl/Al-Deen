import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/Component/Layout/Index";
import { AudioPlayer } from "@/Component/Audio-Player/Index";
import { SurahHeader } from "@/Component/Quran/Surah/Header";
import { PageLines } from "@/Component/Quran/Layout/Safhah/Main";
import { AyahView } from "@/Component/Quran/Layout/Ayah/Index";
import { NotesDialog } from "@/Component/Dialog/Notes";
import { ShareDialog } from "@/Component/Dialog/Share";
import { SurahInfoDialog } from "@/Component/Dialog/Surah-Info";
import { useApp } from "@/Context/App";
import { useAudio } from "@/Context/Audio";
import { useReadingProgress } from "@/Hook/Use-Reading-Progress";
import { useReadingSession } from "@/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Hook/Use-Quran-Goals";
import { Button } from "@/Component/UI/button";
import { TafsirDialog } from "@/Component/Dialog/Tafsir";
import { RenderSurahDialog } from "@/Component/Dialog/Render-Quran/Index";
import { Container } from "@/Component/UI/Container";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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

// ============================================================================
// Client-Side Segment Processor
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

const AyahIndex = () => {
  const { id, verseId } = useParams<{ id: string; verseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const surahId = parseInt(id || "1", 10);
  const verseNum = parseInt(verseId || "1", 10);
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
  const { stop: stopAudio, playFullSurah } = useAudio();
  
  // 🌟 Centralized React Query global client network state hook
  const { data: corpus, isLoading, error } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
  });

  const { updateProgress } = useReadingProgress();
  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } = useReadingSession();
  const { activeGoal } = useQuranGoals();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [surahInfoDialog, setSurahInfoDialog] = useState(false);
  const [renderDialog, setRenderDialog] = useState<{ open: boolean; ayah?: number; mode: "render" | "embed" }>({ open: false, mode: "render" });
  const [tafsirDialog, setTafsirDialog] = useState<{ open: boolean; verseNumber: number }>({ open: false, verseNumber: verseNum });
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; ayahId?: number; verse?: any }>({ open: false });
  const [shareDialog, setShareDialog] = useState<{ open: boolean; ayahId?: number; verseText?: string; translation?: string }>({ open: false });

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isPageLayout = layout === "page";
  const isTimeGoal = activeGoal?.goal_type === "time_based";
  const shouldTrack = isTrackingEnabled && isTimeGoal;

  // Resolve surrounding and active contextual records
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

  const verses = surah?.verses;
  const verse = useMemo(() => verses?.find((v: any) => v.verseNumber === verseNum), [verses, verseNum]);

  // Deepgram voice integration hook configuration
  const { toggleRecording, isRecording: isDeepgramRecording, transcript } = useDeepgram({
    surahId,
    onVerseComplete: (completedVerse) => {
      const next = completedVerse + 1;
      if (surah && next <= surah.numberOfAyahs) {
        navigate(`/Quran/Surah/${surahId}/Ayah/${next}`);
      }
    },
  });

  // Client-side dynamic evaluation of global Juz/Hizb indexing boundaries
  const { currentJuz, currentHizb } = useMemo(() => {
    if (!corpus?.juzData) return { currentJuz: 1, currentHizb: 1 };
    const juzInfo = corpus.juzData.find((juz: any) => juz.surahs.some((s: any) => s.id === surahId));
    const juzNumber = juzInfo?.juzNumber || 1;
    const hizbNumber = (juzNumber - 1) * 2 + 1;
    return { currentJuz: juzNumber, currentHizb: hizbNumber };
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

  // Parse global location bounds purely client-side from the payload stream maps
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

  const bismillahFontFamily = useMemo(() => {
    switch (quranFont) {
      case "indopak":    return "IndoPak";
      case "uthmani_v1": return "Uthmani-V1-1";
      case "uthmani_v2": return "Uthmani-V2-1";
      case "uthmani_v4": return "Uthmani-V4-1";
      default:           return "Uthmani";
    }
  }, [quranFont]);

  const showBismillah = surah && surah.id !== 1 && surah.id !== 9 && verseNum === 1 && showArabicText;
  
  const bismillahWords = useMemo(() => {
    if (!showBismillah || !corpus?.surahs) return [];
    const surah1 = corpus.surahs.find((s: any) => s.id === 1);
    const firstVerse = surah1?.verses?.[0];
    if (!firstVerse || !Array.isArray(firstVerse.words) || firstVerse.words.length < 4) return [];
    
    return firstVerse.words.slice(0, 4).map((glyph: string) => ({
      glyph,
      translation: "",
      transliteration: "",
    }));
  }, [showBismillah, corpus]);

  const resolvedLines = useMemo<ResolvedWord[][]>(() => {
    if (!verse || !isPageLayout) return [];
    const words = verse.words.map((glyph: string, idx: number) => ({
      glyph,
      verse,
      wordIndex: idx,
      isVerseEnd: idx === verse.words.length - 1,
      isVerseNumber: false,
      isVerseMarker: idx === verse.words.length - 1,
      verseNumber: idx === verse.words.length - 1 ? verse.verseNumber : undefined,
      transliteration: undefined,
    }));
    return [words];
  }, [verse, isPageLayout]);

  const sendTestAudio = useCallback(() => {
    setShowAudioPlayer(true);
    playFullSurah(surahId);
  }, [surahId, playFullSurah]);

  const handleRecordToggle = () => toggleRecording();

  // Progress monitoring and storage runtime hooks
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
    if (verse) {
      const el = verseRefs.current.get(verseNum);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [verse, verseNum]);

  useEffect(() => {
    if (targetVerse && verses) {
      const target = parseInt(targetVerse, 10);
      const el = verseRefs.current.get(target);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [targetVerse, verses]);

  const showHeader = verseNum === 1;

  if (isLoading || !surah) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-2xl mx-auto p-8 text-center animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-xl w-3/4 mx-auto" />
          <div className="h-40 bg-muted rounded-2xl w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !verse) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[17em] mx-auto px-4 pt-8" style={{ fontSize: arabicFontSize }}>
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || "Failed to resolve contextual network resources dynamically."}
            </AlertDescription>
          </Alert>
          <div className="text-center space-x-4">
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div style={{ fontSize: arabicFontSize }} className="w-full max-w-[17em] mx-auto pt-0 px-0 md:px-4">
        {showHeader && (
          <SurahHeader
            surah={surah}
            fontClass={getFontClass()}
            arabicFontSize={arabicFontSize}
            onInfoClick={() => setSurahInfoDialog(true)}
            onAudioClick={() => setShowAudioPlayer(true)}
            onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: verseNum })}
            onRenderClick={() => setRenderDialog({ open: true, mode: "render" })}
          />
        )}

        <div ref={containerRef} className="w-full">
          {isPageLayout ? (
            <Container className={`w-full ${showHeader ? "!rounded-t-none !rounded-b-[48px]" : "!rounded-[48px]"} mb-12`}>
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
              showArabicText={showArabicText && !hideVerses}
              verseTranslation={verseTranslation}
              inlineTranslation={inlineTranslation}
              translationFontSize={translationFontSizeValue}
              transliterationFontSize={transliterationFontSizeValue}
              selectedAyahTransliterator={selectedAyahTransliterator}
              targetVerse={null}
              verseRefs={verseRefs}
              flatTopOnFirst={showHeader}
              onNotesClick={(ayahId) => {
                const v = verses?.find((v: any) => v.verseNumber === ayahId);
                setNotesDialog({ open: true, ayahId, verse: v });
              }}
              onTafsirClick={(ayahId) => setTafsirDialog({ open: true, verseNumber: ayahId })}
              onShareClick={(ayahId, verseText, translation) =>
                setShareDialog({ open: true, ayahId, verseText, translation })
              }
              onRenderClick={(ayahId) => setRenderDialog({ open: true, mode: "render", ayah: ayahId })}
              onEmbedClick={(ayahId) => setRenderDialog({ open: true, mode: "embed", ayah: ayahId })}
              hoverTransliteration={hoverTransliteration}
              inlineTransliteration={inlineTransliteration}
            />
          )}

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
      />
      <TafsirDialog
        open={tafsirDialog.open}
        onOpenChange={(open) => setTafsirDialog(prev => ({ ...prev, open }))}
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

export default AyahIndex;