// Surah/Index.tsx
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Layout } from "@Web/Component/Layout/Index";
import { AudioPlayer } from "@Web/Component/Audio-Player/Index";
import { SurahHeader } from "@Web/Component/Quran/Surah/Header";
import { PageView } from "@Web/Component/Quran/Layout/Page/PageView";
import { AyahList } from "@Web/Component/Quran/Layout/Ayah/AyahList";
import { NotesDialog } from "@Web/Component/Dialog/Notes";
import { ShareDialog } from "@Web/Component/Dialog/Share";
import { SurahInfoDialog } from "@Web/Component/Dialog/Surah-Info";
import { useApp } from "@Web/Context/App";
import { useAudio } from "@Web/Context/Audio";
import { useReadingProgress } from "@/Hook/Use-Reading-Progress";
import { useReadingSession } from "@/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Hook/Use-Quran-Goals";
import { Button } from "@Web/Component/UI/button";
import { TafsirDialog } from "@Web/Component/Dialog/Tafsir";
import { RenderSurahDialog } from "@Web/Component/Dialog/Render-Quran/Index";
import { AlertCircle, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@Web/Component/UI/Alert";
import { AudioControls } from "@Web/Component/Quran/Record";
import { useDeepgram } from "@/Hook/Use-STT";

import { Fetch_Suwar, Fetch_Surah_Details } from "@/Library/Quran-API";
import type { Surah_Details } from "@/Library/Quran-API";
import type { Surah_Metadata, Ayah } from "@/Library/Quran-Types";

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
    activeTranslationIds,
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
    hifz,
  } = useApp();

  const [surahList, setSurahList] = useState<Surah_Metadata[]>([]);
  const [surahDetail, setSurahDetail] = useState<Surah_Details | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeTranslations = useMemo(() => {
    return Array.isArray(activeTranslationIds) ? activeTranslationIds : [];
  }, [activeTranslationIds]);

  const activeNaqharat = useMemo(() => {
    return selectedAyahTransliterator && selectedAyahTransliterator !== "None"
      ? [selectedAyahTransliterator]
      : [];
  }, [selectedAyahTransliterator]);

  const wbwTranslationIds = useMemo(() => {
    const wbwEnabled =
      (hoverTranslation && hoverTranslation !== "None") ||
      (inlineTranslation && inlineTranslation !== "None");
    return wbwEnabled ? activeTranslations : [];
  }, [activeTranslations, hoverTranslation, inlineTranslation]);

  const wbwTransliterationIds = useMemo(() => {
    const wbwEnabled =
      (hoverTransliteration && hoverTransliteration !== "None") ||
      (inlineTransliteration && inlineTransliteration !== "None");
    return wbwEnabled ? activeNaqharat : [];
  }, [activeNaqharat, hoverTransliteration, inlineTransliteration]);

  useEffect(() => {
    let cancelled = false;
    Fetch_Suwar()
      .then((list) => {
        if (!cancelled) setSurahList(list);
      })
      .catch((err) => {
        console.warn("Could not fetch surah list for navigation:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setIsLoadingDetail(true);

    Fetch_Surah_Details(
      surahId,
      activeTranslations,
      activeNaqharat,
      wbwTranslationIds,
      wbwTransliterationIds
    )
      .then((detail) => {
        if (cancelled) return;
        setSurahDetail(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error loading surah ${surahId}:`, err);
        setSurahDetail((current) => {
          if (!current) {
            setLoadError(err.message || `Failed to load Surah ${surahId}`);
          }
          return current;
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    surahId,
    JSON.stringify(activeTranslations),
    JSON.stringify(activeNaqharat),
    JSON.stringify(wbwTranslationIds),
    JSON.stringify(wbwTransliterationIds),
  ]);

  const showTransliteration = selectedAyahTransliterator !== "None";
  const { stop: stopAudio, playFullSurah } = useAudio();

  // Surah_Details already carries the real field names — no more
  // fallback-key guessing / "as any" needed.
  const sur = surahDetail?.Surah;
  const verses = surahDetail?.Ayah;
  const words = surahDetail?.Words;
  const translations = surahDetail?.Translations;
  const transliterations = surahDetail?.Transliterations;
  const wordTranslations = surahDetail?.Word_Translations;
  const wordTransliterations = surahDetail?.Word_Transliterations;
  const footnotes = surahDetail?.Footnotes;

  const { updateProgress } = useReadingProgress();
  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } = useReadingSession();
  const { activeGoal } = useQuranGoals();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [, setReadingProgress] = useState(0);
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

  const prevSurah = useMemo(() => {
    if (!surahList.length) return null;
    return surahList.find((s) => s.Surah === surahId - 1) || null;
  }, [surahList, surahId]);

  const nextSurah = useMemo(() => {
    if (!surahList.length) return null;
    return surahList.find((s) => s.Surah === surahId + 1) || null;
  }, [surahList, surahId]);

  const { currentJuz, currentHizb } = useMemo(() => {
    if (!sur) return { currentJuz: 1, currentHizb: 1 };
    const pageNum = sur.Start_Page || 1;
    const juzNumber = Math.ceil(pageNum / 20);
    return {
      currentJuz: juzNumber,
      currentHizb: (juzNumber - 1) * 2 + 1,
    };
  }, [sur]);

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

  useEffect(() => {
    if (targetVerse && verses) {
      const verseNumber = parseInt(targetVerse, 10);
      const el = verseRefs.current.get(verseNumber);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    } else if (!targetVerse && !isLoadingDetail && verses) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [surahId, targetVerse, verses, isLoadingDetail]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const pageFooter = useCallback(
    (pageNumber: number) => (
      <span className="text-sm text-muted-foreground font-medium">
        Juz - {currentJuz} | Page - {pageNumber} | Hizb - {currentHizb}
      </span>
    ),
    [currentJuz, currentHizb]
  );

  const handleNotesClick = useCallback(
    (ayahId: number, arabicText?: string) => {
      const targetVerseObj = verses?.find((v: Ayah) => v.Ayah === ayahId);
      setNotesDialog({
        open: true,
        ayahId,
        verse: targetVerseObj ?? { Surah: surahId, Ayah: ayahId, Arabic: arabicText },
      });
    },
    [verses, surahId]
  );

  const handleShareClick = useCallback(
    (ayahId: number, arabicText?: string, translation?: string) => {
      setShareDialog({ open: true, ayahId, verseText: arabicText, translation });
    },
    []
  );

  const handleTafsirClick = useCallback((ayahId: number) => {
    setTafsirDialog({ open: true, verseNumber: ayahId });
  }, []);

  const handleEmbedClick = useCallback((ayahId: number) => {
    setRenderDialog({ open: true, mode: "embed", ayah: ayahId });
  }, []);

  const handleRenderClick = useCallback((ayahId: number) => {
    setRenderDialog({ open: true, mode: "render", ayah: ayahId });
  }, []);

  if (loadError) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[19em] mx-auto px-4 pt-28" style={{ fontSize: arabicFontSize }}>
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
          <div className="text-center space-x-4">
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sur || !surahDetail) {
    return null;
  }

  if (!verses || !Array.isArray(verses) || verses.length === 0) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[19em] mx-auto px-4 pt-28" style={{ fontSize: arabicFontSize }}>
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No verses found for this surah collection map.</AlertDescription>
          </Alert>
          <div className="text-center">
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const surahMeta = {
    id: sur.Surah ?? surahId,
    surahFontName: sur.Arabic || "",
    englishNameTranslation: sur.Translation || "",
    transliteration: sur.Transliteration || "",
  };

  return (
    <Layout hideFooter>
      <div style={{ fontSize: arabicFontSize }} className="w-full max-w-[19em] mx-auto pt-0 px-0">
        <SurahHeader
          surah={surahMeta}
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
              Surah={sur}
              Show_Arabic_Text={showArabicText}
              Hover_Translation={hoverTranslation}
              Inline_Translation={inlineTranslation}
              Inline_Transliteration={inlineTransliteration}
              FontClass={getFontClass()}
              ArabicFontSize={arabicFontSize}
              Translation_Font_Size={translationFontSizeValue}
              Transliteration_Font_Size={transliterationFontSizeValue}
              Show_Transliteration={showTransliteration}
              Ayah_Refs={verseRefs}
              HideVerses={hideVerses}
              HideVerseMarkers={hideVerseMarkers}
              PageFooter={pageFooter}
            />
          ) : (
            <AyahList
              Surah={sur}
              Ayah={verses}
              Kalimah={words}
              Translation={translations}
              Transliteration={transliterations}
              WBW_Translation={wordTranslations}
              WBW_Transliteration={wordTransliterations}
              Footnote={footnotes}
              Show_Arabic_Text={showArabicText && !hideVerses}
              Show_Translation={verseTranslation}
              Show_Transliteration={showTransliteration}
              Translation_Font_Size={translationFontSizeValue}
              Transliteration_Font_Size={transliterationFontSizeValue}
              Hover_Translation={hoverTranslation}
              Inline_Translation={inlineTranslation}
              Inline_Transliteration={inlineTransliteration}
              Target_Ayah={targetVerse}
              Ayah_Refs={verseRefs}
              On_Notes_Click={handleNotesClick}
              On_Share_Click={handleShareClick}
              On_Tafsir_Click={handleTafsirClick}
              On_Embed_Click={handleEmbedClick}
              On_Render_Click={handleRenderClick}
            />
          )}

          <div className="flex items-center justify-center gap-2 py-2">
            {prevSurah && (
              <Link to={`/Quran/Surah/${prevSurah.Surah}`}>
                <Button size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button onClick={scrollToTop} size="icon" className="h-8 w-8">
              <ChevronUp className="h-4 w-4" />
            </Button>
            {nextSurah && (
              <Link to={`/Quran/Surah/${nextSurah.Surah}`}>
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
        surahName={sur.Transliteration}
      />
      <NotesDialog open={notesDialog.open} onOpenChange={(open) => setNotesDialog({ ...notesDialog, open })}
        surahId={surahId} ayahId={notesDialog.ayahId} verse={notesDialog.verse} />
      <ShareDialog open={shareDialog.open} onOpenChange={(open) => setShareDialog({ ...shareDialog, open })}
        surahId={surahId} surahName={sur.Transliteration} ayahId={shareDialog.ayahId}
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