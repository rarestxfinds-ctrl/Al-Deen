import { useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { PageView } from "@/Component/Quran/Layout/Safhah/Index";
import { AyahView } from "@/Component/Quran/Layout/Ayah/Index";
import { SurahHeader } from "@/Component/Quran/Surah/Header";
import { SurahInfoDialog } from "@/Component/Dialog/Surah-Info";
import { TafsirDialog } from "@/Component/Dialog/Tafsir";
import { AudioPlayer } from "@/Component/Audio-Player/Index";
import { useAudio } from "@/Context/Audio";
import { useApp, type QuranFontFamily } from "@/Context/App";

interface SegmentRange {
  surah: number;
  startVerse: number;
  endVerse: number;
}

interface Props {
  segments: SegmentRange[];
}

type QuranFontType = "V1" | "V2" | "Standard";

// ============= API Configuration and Endpoint Handlers =============
const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

function mapFontToDataType(font: QuranFontFamily): QuranFontType {
  switch (font) {
    case "uthmani_v1":
      return "V1";
    case "uthmani_v2":
    case "uthmani_v4":
      return "V2";
    default:
      return "Standard";
  }
}

function getFontClass(quranFont: QuranFontFamily) {
  switch (quranFont) {
    case "indopak":
      return "font-indopak";
    case "uthmani_v1":
      return "font-uthmani_v1";
    case "uthmani_v2":
      return "font-uthmani_v2";
    case "uthmani_v4":
      return "font-uthmani_v4";
    default:
      return "font-uthmani";
  }
}

function getSegmentPageRange(
  surah: any,
  startVerse: number,
  endVerse: number,
  pageSegmentsMap: any[] = []
): [number, number] {
  let start = surah.pages?.[0] || 1;
  let end = surah.pages?.[1] || 604;
  let found = false;

  for (let p = start; p <= end; p++) {
    // pageSegmentsMap array indexes usually align with zero-indexed pages or absolute offsets
    const segs = pageSegmentsMap?.[p] || [];
    const seg = segs.find((s: any) => s.surah === surah.id);
    if (!seg) continue;
    if (seg.endVerse < startVerse || seg.startVerse > endVerse) continue;
    if (!found) {
      start = p;
      found = true;
    }
    end = p;
  }
  return [start, end];
}

export function SegmentRenderer({ segments }: Props) {
  const {
    layout,
    fontSize,
    translationFontSize,
    transliterationSize,
    quranFont,
    showArabicText,
    verseTranslation,
    hoverTranslation,
    inlineTranslation,
    inlineTransliteration,
    hoverTransliteration,
    selectedAyahTransliterator,
    hideVerses,
    hideVerseMarkers,
    selectedTranslator,
  } = useApp();

  const { stop: stopAudio } = useAudio();
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [surahInfoDialog, setSurahInfoDialog] = useState<{ open: boolean; surahId: number }>({
    open: false,
    surahId: 1,
  });
  const [tafsirDialog, setTafsirDialog] = useState<{
    open: boolean;
    surahId: number;
    verseNumber: number;
  }>({ open: false, surahId: 1, verseNumber: 1 });
  const [audioPlayer, setAudioPlayer] = useState<{ open: boolean; surahId?: number }>({
    open: false,
  });

  // 🌟 Ingest structural database maps over unified reactive client context query cache
  const { data: corpus, isLoading: isCorpusLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, 
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);
  const pageSegmentsMap = useMemo(() => corpus?.pageSegments || [], [corpus]);

  const isPageLayout = layout === "page";
  const showTransliteration = selectedAyahTransliterator !== "None";
  const fontClass = getFontClass(quranFont);
  const fontType = mapFontToDataType(quranFont);

  const arabicFontSize = `${(1.5 * fontSize) / 5}rem`;
  const translationFontSizeValue = `${(1 * translationFontSize) / 3}rem`;
  const transliterationFontSizeValue = `${(1 * transliterationSize) / 3}rem`;

  // Merge overlapping segment offsets cleanly per surah targets
  const grouped = useMemo(() => {
    const map = new Map<number, { startVerse: number; endVerse: number }>();
    for (const s of segments) {
      const cur = map.get(s.surah);
      if (!cur) map.set(s.surah, { startVerse: s.startVerse, endVerse: s.endVerse });
      else {
        cur.startVerse = Math.min(cur.startVerse, s.startVerse);
        cur.endVerse = Math.max(cur.endVerse, s.endVerse);
      }
    }
    return Array.from(map.entries()).map(([surahId, range]) => ({
      surahId,
      ...range,
    }));
  }, [segments]);

  const wbwTranslationHover = hoverTranslation !== "None" ? hoverTranslation : undefined;
  const wbwTranslationInline = inlineTranslation !== "None" ? inlineTranslation : undefined;
  const wbwTransliterationHover = hoverTransliteration !== "None" ? hoverTransliteration : undefined;
  const wbwTransliterationInline = inlineTransliteration !== "None" ? inlineTransliteration : undefined;
  const transliterationStyle = selectedAyahTransliterator !== "None" ? selectedAyahTransliterator : undefined;
  const translationSource = verseTranslation && selectedTranslator ? selectedTranslator : undefined;

  const queries = useQueries({
    queries: grouped.map((g) => ({
      queryKey: [
        "surah",
        g.surahId,
        translationSource,
        wbwTranslationHover,
        wbwTranslationInline,
        fontType,
        transliterationStyle,
        wbwTransliterationHover,
        wbwTransliterationInline,
      ],
      queryFn: async () => {
        const queryParams = new URLSearchParams({
          fontType,
          wbw: "true",
        });
        if (translationSource) queryParams.append("translation", translationSource);
        if (transliterationStyle) queryParams.append("transliteration", transliterationStyle);
        
        const response = await fetch(`${BACKEND_BASE_URL}/api/surah/${g.surahId}?${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Failed to load surah data for index ${g.surahId}`);
        return response.json();
      },
      staleTime: 1000 * 60 * 60,
      enabled: !!corpus,
    })),
  });

  if (isCorpusLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center animate-pulse">
        <p className="text-sm text-muted-foreground">Loading structural segments mapping data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {grouped.map((g, idx) => {
          const surah = surahList.find((s: any) => s.id === g.surahId);
          const data = queries[idx]?.data;
          if (!surah || !data) return null;

          const trimmedVerses: any[] = data.verses.filter(
            (v: any) => v.verseNumber >= g.startVerse && v.verseNumber <= g.endVerse
          );

          const [startPage, endPage] = getSegmentPageRange(
            surah,
            g.startVerse,
            g.endVerse,
            pageSegmentsMap
          );
          const adjustedSurah = { ...surah, pages: [startPage, endPage] };

          return (
            <div key={g.surahId} className="w-full">
              <SurahHeader
                surah={surah}
                fontClass={fontClass}
                arabicFontSize={arabicFontSize}
                onInfoClick={() => setSurahInfoDialog({ open: true, surahId: surah.id })}
                onTafsirClick={() =>
                  setTafsirDialog({ open: true, surahId: surah.id, verseNumber: g.startVerse })
                }
                onAudioClick={() => setAudioPlayer({ open: true, surahId: surah.id })}
              />

              {isPageLayout ? (
                <PageView
                  surah={adjustedSurah}
                  assembledSurah={{ ...data, verses: trimmedVerses }}
                  showArabicText={showArabicText}
                  hoverTranslation={hoverTranslation}
                  inlineTranslation={inlineTranslation}
                  inlineTransliteration={inlineTransliteration}
                  fontClass={fontClass}
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
                  surah={adjustedSurah}
                  verses={trimmedVerses}
                  showArabicText={showArabicText && !hideVerses}
                  verseTranslation={verseTranslation}
                  inlineTranslation={inlineTranslation}
                  translationFontSize={translationFontSizeValue}
                  transliterationFontSize={transliterationFontSizeValue}
                  selectedAyahTransliterator={selectedAyahTransliterator}
                  targetVerse={null}
                  verseRefs={verseRefs}
                  onNotesClick={() => {}}
                  onShareClick={() => {}}
                  onTafsirClick={(ayahId) =>
                    setTafsirDialog({ open: true, surahId: surah.id, verseNumber: ayahId })
                  }
                  hoverTransliteration={hoverTransliteration}
                  inlineTransliteration={inlineTransliteration}
                />
              )}
            </div>
          );
        })}
      </div>

      <SurahInfoDialog
        open={surahInfoDialog.open}
        onOpenChange={(open) => setSurahInfoDialog((p) => ({ ...p, open }))}
        surahId={surahInfoDialog.surahId}
        surah={surahList.find((s: any) => s.id === surahInfoDialog.surahId) || surahList[0] || {}}
      />
      <TafsirDialog
        open={tafsirDialog.open}
        onOpenChange={(open) => setTafsirDialog((p) => ({ ...p, open }))}
        surahId={tafsirDialog.surahId}
        verseNumber={tafsirDialog.verseNumber}
      />
      <AudioPlayer
        isVisible={audioPlayer.open}
        onClose={() => {
          stopAudio();
          setAudioPlayer({ open: false });
        }}
        surahId={audioPlayer.surahId}
        surahName={
          audioPlayer.surahId
            ? surahList.find((s: any) => s.id === audioPlayer.surahId)?.englishName
            : undefined
        }
      />
    </>
  );
}