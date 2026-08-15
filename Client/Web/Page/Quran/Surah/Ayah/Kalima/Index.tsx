import { useParams, Link } from "react-router-dom";
import { Layout } from "@Web/Component/Layout/Index";
import { AudioPlayer } from "@Web/Component/Audio-Player/Index";
import { SurahHeader } from "@Web/Component/Quran/Surah/Header";
import { Bitaqah_Al_Ayah } from "@Web/Component/Quran/Takheet/Ayah/Bitaqah";
import { NotesDialog } from "@Web/Component/Dialog/Notes";
import { ShareDialog } from "@Web/Component/Dialog/Share";
import { SurahInfoDialog } from "@Web/Component/Dialog/Surah-Info";
import { TafsirDialog } from "@Web/Component/Dialog/Tafsir";
import { RenderSurahDialog } from "@Web/Component/Dialog/Render-Quran/Index";

import { useApp } from "@Web/Context/App";
import { useAudio } from "@Web/Context/Audio";
import { useQuranData } from "@/Hook/Use-Quran-Data";
import { useReadingSession } from "@/Hook/Use-Reading-Session";
import { useQuranGoals } from "@/Hook/Use-Quran-Goals";
import { Button } from "@Web/Component/UI/button";
import { Container } from "@Web/Component/UI/Container";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { Alert, AlertDescription } from "@Web/Component/UI/Alert";
import { useQuery } from "@tanstack/react-query";
import { Jalb_Aqsam_As_Safahat_Corpus } from "@/Library/Quran-API";
import type { Aqsam_As_Safahat } from "@/Library/Quran-Types";

// ============================================================================
// Network Fetch Client Handler (still the only source we have for the flat
// surah list + juz data - Jalb_Aqsam_As_Safahat_Corpus only covers page/verse
// segment boundaries, not surah metadata or juz groupings)
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

// Resolves which mushaf page a given surah:verse falls on, using the same
// Aqsam_As_Safahat corpus map that Bitaqah_Al_Ayah reads internally for its
// own font-per-page resolution.
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

const KalimaIndex = () => {
  const { id, verseId, kalimaId } = useParams<{
    id: string;
    verseId: string;
    kalimaId: string;
  }>();
  const SurahId = parseInt(id || "1", 10);
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

  // Flat surah list / juz groupings - see note on fetchQuranCorpusFromBackend above.
  const { data: corpus, isLoading: isCorpusLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
  });

  // Page/verse segment boundaries - same source Bitaqah_Al_Ayah uses internally.
  const { data: pageSegmentsMap } = useQuery<Aqsam_As_Safahat>({
    queryKey: ["aqsamAsSafahat"],
    queryFn: Jalb_Aqsam_As_Safahat_Corpus,
    staleTime: 1000 * 60 * 60,
  });

  const { data: SurahData, isLoading: isSurahLoading, error, refetch } = useQuranData(SurahId);
  const verses = SurahData?.verses;
  const verse = useMemo(() => verses?.find((v) => v.verseNumber === verseNum), [verses, verseNum]);
  const word = verse?.words[wordIndex];

  const { startSession, stopSession, saveSecondsToGoal, isTrackingEnabled } = useReadingSession();
  const { activeGoal } = useQuranGoals();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isSurahInfoOpen, setIsSurahInfoOpen] = useState(false);
  const [renderDialog, setRenderDialog] = useState<{ open: boolean; ayah?: number; mode: "render" | "embed" }>({ open: false, mode: "render" });

  const [tafsirDialog, setTafsirDialog] = useState<{ open: boolean; verseNumber: number }>({ open: false, verseNumber: verseNum });
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; ayahId?: number; verse?: any }>({ open: false });
  const [shareDialog, setShareDialog] = useState<{ open: boolean; ayahId?: number; verseText?: string; translation?: string }>({ open: false });

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const Surah = useMemo(() => {
    if (!corpus?.Surahs) return null;
    return corpus.Surahs.find((s: any) => s.id === SurahId) || corpus.Surahs[0];
  }, [corpus, SurahId]);

  const prevSurah = useMemo(() => {
    if (!corpus?.Surahs) return null;
    return corpus.Surahs.find((s: any) => s.id === SurahId - 1) || null;
  }, [corpus, SurahId]);

  const nextSurah = useMemo(() => {
    if (!corpus?.Surahs) return null;
    return corpus.Surahs.find((s: any) => s.id === SurahId + 1) || null;
  }, [corpus, SurahId]);

  const pageNumber = useMemo(
    () => findPageForVerse(Surah?.pages as [number, number] | undefined, SurahId, verseNum, pageSegmentsMap),
    [Surah, SurahId, verseNum, pageSegmentsMap]
  );

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

  // Bitaqah_Al_Ayah expects Kalimaat to be Al_Kalimah objects (translation/
  // transliteration included, as built by Qaimat_Al_Ayaat). Here verse.words
  // looks like a plain glyph string[] (word = verse.words[wordIndex] is used
  // directly as a glyph below), which isn't that shape - so Kalimaat is left
  // unset and Bitaqah_Al_Ayah falls back to rendering the full verse text.
  // Highlighting just `wordIndex` needs either useQuranData returning
  // structured per-word objects, or a targeted-word prop added to
  // Bitaqah_Al_Ayah - neither exists in the files I've seen so far.
  const bitaqahSurah = Surah
    ? {
        ...Surah,
        "As-Surah": Surah.id,
        "Bidayat-As-Safhah": Surah.pages?.[0],
        "Nihayat-As-Safhah": Surah.pages?.[1],
        "At-Tansiq": Surah.englishName,
      }
    : null;

  const bitaqahAyah = verse ? { ...verse, "Al-Ayah": verse.verseNumber } : null;

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
      return `/Quran/Surah/${SurahId}/Ayah/${verseNum}/Kalima/${wordIndex}`;
    if (hasPrevVerse && verses) {
      const prevVerse = verses[verseNum - 2];
      const lastWordIdx = prevVerse.words.length;
      return `/Quran/Surah/${SurahId}/Ayah/${verseNum - 1}/Kalima/${lastWordIdx}`;
    }
    return null;
  };

  const getNextUrl = (): string | null => {
    if (hasNextWord)
      return `/Quran/Surah/${SurahId}/Ayah/${verseNum}/Kalima/${wordIndex + 2}`;
    if (hasNextVerse && verses)
      return `/Quran/Surah/${SurahId}/Ayah/${verseNum + 1}/Kalima/1`;
    return null;
  };

  // --- Juz / Hizb (Computed client-side) ---
  const { currentJuz, currentHizb } = useMemo(() => {
    if (!corpus?.juzData) return { currentJuz: 1, currentHizb: 1 };
    const juzInfo = corpus.juzData.find((juz: any) =>
      juz.Surahs.some((s: any) => s.id === SurahId)
    );
    const juzNumber = juzInfo?.juzNumber || 1;
    const hizbNumber = (juzNumber - 1) * 2 + 1;
    return { currentJuz: juzNumber, currentHizb: hizbNumber };
  }, [corpus, SurahId]);

  // Show SurahHeader only for the first word of the first ayah
  const showHeader = verseNum === 1 && wordIndex === 0;

  const handleAudioClick = () => {
    setShowAudioPlayer(true);
    if (currentSurah === SurahId && isAudioPlaying) {
      togglePlayPause();
    } else if (currentSurah === SurahId && !isAudioPlaying) {
      togglePlayPause();
    } else {
      playFullSurah(SurahId);
    }
  };

  const isLoading = isCorpusLoading || isSurahLoading;

  if (isLoading || !Surah) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-[17em] mx-auto px-4 pt-28" style={{ fontSize: arabicFontSize }}>
          {showHeader && (
            <SurahHeader
              Surah={Surah || {}}
              fontClass={getFontClass()}
              arabicFontSize={arabicFontSize}
              onInfoClick={() => setIsSurahInfoOpen(true)}
              onAudioClick={handleAudioClick}
              onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: verseNum })}
              onRenderClick={() => setRenderDialog({ open: true, mode: "render" })}
            />
          )}
          <Container className={`w-full ${showHeader ? "!rounded-t-none !rounded-b-[48px]" : "!rounded-[48px]"} mb-12`} />
        </div>
      </Layout>
    );
  }

  if (error || !verse || word === undefined || !bitaqahAyah || !bitaqahSurah) {
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
            Surah={Surah}
            fontClass={getFontClass()}
            arabicFontSize={arabicFontSize}
            onInfoClick={() => setIsSurahInfoOpen(true)}
            onAudioClick={handleAudioClick}
            onTafsirClick={() => setTafsirDialog({ open: true, verseNumber: verseNum })}
            onRenderClick={() => setRenderDialog({ open: true, mode: "render" })}
          />
        )}

        <Container className={`w-full ${showHeader ? "!rounded-t-none !rounded-b-[48px]" : "!rounded-[48px]"} mb-12`}>
          <div>
            <Bitaqah_Al_Ayah
              Al_Ayah={bitaqahAyah}
              Surah={bitaqahSurah}
              Izhaar_An_Nass_Al_Arabi={showArabicText && !hideVerses}
              Tarjamat_Al_Ayah={false}
              Izhaar_Al_Kitabah_As_Sawtiyyah={false}
              Hajm_Khatt_Al_Kitabah_As_Sawtiyyah={transliterationFontSizeValue}
              Hajm_Khatt_At_Tarjamah={translationFontSizeValue}
              Tarjamah_Ind_Al_Tamreer={hoverTranslation !== "None" ? hoverTranslation : undefined}
              At_Tarjamah_Al_Mudmajah={inlineTranslation !== "None" ? inlineTranslation : undefined}
              Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={inlineTransliteration !== "None" ? inlineTransliteration : undefined}
              Marji_Al_Ayah={(el: HTMLDivElement | null) => {
                if (el) verseRefs.current.set(verseNum, el);
              }}
              An_Naqr_Ala_At_Tafseer={() => setTafsirDialog({ open: true, verseNumber: verseNum })}
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
        SurahId={SurahId}
        SurahName={Surah.englishName}
      />

      <NotesDialog
        open={notesDialog.open}
        onOpenChange={(open) => setNotesDialog({ ...notesDialog, open })}
        SurahId={SurahId}
        ayahId={notesDialog.ayahId}
        verse={notesDialog.verse}
      />
      <ShareDialog
        open={shareDialog.open}
        onOpenChange={(open) => setShareDialog({ ...shareDialog, open })}
        SurahId={SurahId}
        SurahName={Surah.englishName}
        ayahId={shareDialog.ayahId}
        verseText={shareDialog.verseText}
        translation={shareDialog.translation}
      />
      <SurahInfoDialog
        open={isSurahInfoOpen}
        onOpenChange={setIsSurahInfoOpen}
        SurahId={SurahId}
      />
      <TafsirDialog
        open={tafsirDialog.open}
        onOpenChange={(open) => setTafsirDialog((prev) => ({ ...prev, open }))}
        SurahId={SurahId}
        verseNumber={tafsirDialog.verseNumber}
      />
      <RenderSurahDialog
        open={renderDialog.open}
        onOpenChange={(o) => setRenderDialog((p) => ({ ...p, open: o }))}
        SurahId={SurahId}
        ayahNumber={renderDialog.ayah}
        mode={renderDialog.mode}
      />
    </Layout>
  );
};

export default KalimaIndex;