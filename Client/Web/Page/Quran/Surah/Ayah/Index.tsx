import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@Web/Component/Layout/Index";
import { AudioPlayer } from "@Web/Component/Audio-Player/Index";
import { SurahHeader } from "@Web/Component/Quran/Surah/Header";
import { Qaimat_As_Safahat } from "@Web/Component/Quran/Takheet/Safhah/Qaimah";
import { Qaimat_Al_Ayaat } from "@Web/Component/Quran/Takheet/Ayah/Qaimah";
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
import { Container } from "@Web/Component/UI/Container";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@Web/Component/UI/Alert";
import { AudioControls } from "@Web/Component/Quran/Record";
import { useDeepgram } from "@/Hook/Use-STT";
import { useQuery } from "@tanstack/react-query";
import { Jalb_Aqsam_As_Safahat_Corpus } from "@/Library/Quran-API";
import type { Aqsam_As_Safahat, As_Surah } from "@/Library/Quran-Types";

// ============================================================================
// Network Fetch Client Handler (still the only source for the flat surah
// list, per-surah verses and juz data used for navigation - none of the
// Takheet components fetch or expose those)
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

// Resolves which mushaf page a given surah:verse falls on, using the same
// Aqsam_As_Safahat corpus map the Takheet components read internally.
function findPageForVerse(
  surahPages: [number, number] | undefined,
  surahId: number,
  verseNum: number,
  pageSegmentsMap: Aqsam_As_Safahat | undefined
): number {
  if (!surahPages) return 1;
  if (!pageSegmentsMap) return surahPages[0];

  for (let p = surahPages[0]; p <= surahPages[1]; p++) {
    const raw = (pageSegmentsMap as Record<string, any>)[String(p)];
    if (!raw) continue;

    const segmentsStr = Array.isArray(raw) ? raw.join("|") : raw;
    if (typeof segmentsStr !== "string") continue;

    for (const seg of segmentsStr.split("|")) {
      const [start, end] = seg.split("-");
      if (!start || !end) continue;

      const [startSurahVerse] = start.split(".");
      const [startSurahStr, startVerseStr] = startSurahVerse.split(":");
      const [endSurahVerse] = end.split(".");
      const [, endVerseStr] = endSurahVerse.split(":");

      const segSurah = parseInt(startSurahStr, 10);
      const segStartVerse = parseInt(startVerseStr, 10);
      const segEndVerse = parseInt(endVerseStr, 10);

      if (segSurah === surahId && verseNum >= segStartVerse && verseNum <= segEndVerse) {
        return p;
      }
    }
  }

  return surahPages[0];
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

  const { data: corpus, isLoading, error } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
  });

  const { data: pageSegmentsMap } = useQuery<Aqsam_As_Safahat>({
    queryKey: ["aqsamAsSafahat"],
    queryFn: Jalb_Aqsam_As_Safahat_Corpus,
    staleTime: 1000 * 60 * 60,
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

  // Qaimat_Al_Ayaat / Bitaqah_Al_Ayah read "Al-Ayah" / "As-Surah" style keys
  // (with only partial camelCase fallback), so stamp them on before handing
  // the raw corpus verse/surah objects down.
  const bitaqahSurah = surah
    ? ({
        ...surah,
        "As-Surah": surah.id,
        "Bidayat-As-Safhah": surah.pages?.[0],
        "Nihayat-As-Safhah": surah.pages?.[1],
        "At-Tansiq": surah.englishName,
      } as As_Surah)
    : null;

  const bitaqahAyah = verse ? { ...verse, "Al-Ayah": verse.verseNumber } : null;

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

  const pageNumber = useMemo(
    () => findPageForVerse(surah?.pages as [number, number] | undefined, surahId, verseNum, pageSegmentsMap),
    [surah, surahId, verseNum, pageSegmentsMap]
  );

  const sendTestAudio = useCallback(() => {
    setShowAudioPlayer(true);
    playFullSurah(surahId);
  }, [surahId, playFullSurah]);

  const handleRecordToggle = () => toggleRecording();

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

  if (error || !verse || !bitaqahAyah || !bitaqahSurah) {
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
                {/*
                  NOTE: same caveat as the page-number route - Qaimat_As_Safahat
                  resolves its own page range from the surah data it fetches
                  internally, so this renders every page of the surah that has
                  verses, not just the page containing `verseNum`. There's no
                  prop on Qaimat_As_Safahat today to scope it to one page/verse;
                  that would need a change inside Qaimah.tsx itself.
                */}
                <Qaimat_As_Safahat
                  surah={{ "As-Surah": surahId } as As_Surah}
                  showArabicText={showArabicText && !hideVerses}
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
              </div>
              <div className="flex items-center justify-center pb-1">
                <span className="text-sm text-muted-foreground font-medium">
                  Juz - {currentJuz} | Page - {pageNumber} | Hizb - {currentHizb}
                </span>
              </div>
            </Container>
          ) : (
            <Qaimat_Al_Ayaat
              Surah={bitaqahSurah}
              Ayaat={[bitaqahAyah]}
              Kalimaat={[]}
              Izhaar_An_Nass_Al_Arabi={showArabicText && !hideVerses}
              Tarjamat_Al_Ayah={verseTranslation}
              Hajm_Khatt_At_Tarjamah={translationFontSizeValue}
              Hajm_Khatt_Al_Kitabah_As_Sawtiyyah={transliterationFontSizeValue}
              Mukhtar_Al_Kitabah_As_Sawtiyyah={selectedAyahTransliterator}
              Tarjamah_Ind_Al_Tamreer={hoverTranslation !== "None" ? hoverTranslation : undefined}
              At_Tarjamah_Al_Mudmajah={inlineTranslation !== "None" ? inlineTranslation : undefined}
              Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={inlineTransliteration !== "None" ? inlineTransliteration : undefined}
              Al_Ayah_Al_Mustahdafah={verseNum}
              Maraji_Al_Ayaat={verseRefs}
              An_Naqr_Ala_Al_Mulahazaat={(ayahId: number) => {
                const v = verses?.find((v: any) => v.verseNumber === ayahId);
                setNotesDialog({ open: true, ayahId, verse: v });
              }}
              An_Naqr_Ala_Al_Musharakah={(ayahId: number, verseText: string, translation?: string) =>
                setShareDialog({ open: true, ayahId, verseText, translation })
              }
              An_Naqr_Ala_At_Tafseer={(ayahId: number) => setTafsirDialog({ open: true, verseNumber: ayahId })}
              An_Naqr_Ala_Al_Muayanah={(ayahId: number) => setRenderDialog({ open: true, mode: "render", ayah: ayahId })}
              An_Naqr_Ala_At_Tadmeen={(ayahId: number) => setRenderDialog({ open: true, mode: "embed", ayah: ayahId })}
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