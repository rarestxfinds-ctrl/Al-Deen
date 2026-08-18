import { useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { VerseCard } from "@Web/Component/Quran/Layout/Ayah/VerseCard";
import { PageCard } from "@Web/Component/Quran/Layout/Page/PageCard";
import { SurahHeader } from "@Web/Component/Quran/Surah/Header";
import { SurahInfoDialog } from "@Web/Component/Dialog/Surah-Info";
import { TafsirDialog } from "@Web/Component/Dialog/Tafsir";
import { AudioPlayer } from "@Web/Component/Audio-Player/Index";
import { useAudio } from "@Web/Context/Audio";
import { useApp, type QuranFontFamily } from "@Web/Context/App";
import type { ResolvedWord, SurahMeta, AssembledVerse, PageAyahs } from "@Web/Component/Quran/Layout/Types";

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

// ============= Adapters: legacy fetch shape -> real component prop shape =============

/** VerseCard/PageCard read the real AssembledVerse / SurahMeta field names
 *  (Surah, Ayah, Arabic, ...). This ad-hoc backend's verse/surah objects use
 *  their own camelCase shape though (verseNumber, arabic, footnotes, ...),
 *  so these helpers translate field-by-field rather than relying on the
 *  loose fallback chains VerseCard/PageCard use internally. */
function toResolvedVerse(verse: any): AssembledVerse {
  return {
    Surah: verse.surah ?? verse.Surah,
    Ayah: verse.verseNumber ?? verse.Ayah,
    Arabic: verse.arabic ?? verse.Arabic ?? "",
    Arabic_V1: verse.arabicV1 ?? null,
    Arabic_V2: verse.arabicV2 ?? null,
    IndoPakMarker: verse.indoPakMarker ?? null,
  };
}

function toCardSurah(surah: any, adjustedSurah: any): SurahMeta {
  return {
    Surah: surah.id,
    Arabic: surah.arabicName ?? "",
    Translation: surah.englishName ?? "",
    Transliteration: surah.transliteration ?? surah.englishName ?? "",
    Revelation_Place: surah.revelationPlace ?? null,
    Revelation_Order: surah.revelationOrder ?? null,
    Ayah_Count: surah.numberOfAyahs,
    Start_Page: adjustedSurah.pages?.[0],
    End_Page: adjustedSurah.pages?.[1],
    Indo_Pak_Ayah_Ending: [],
    Layout: null,
  };
}

const WORDS_PER_SYNTHETIC_LINE = 12;

/**
 * Groups the flat verse->word list into the line-based structure PageCard
 * expects (ResolvedLines: ResolvedWord[][]).
 *
 * If the backend ever starts returning real mushaf line numbers per word
 * (e.g. word.line), this will pick them up automatically. Until then it falls
 * back to a synthetic word-count-based wrap so the page layout still renders.
 */
function buildResolvedLines(verses: any[]): ResolvedWord[][] {
  const flatWords: Array<ResolvedWord & { __line?: number }> = [];

  for (const verse of verses) {
    const words: any[] = verse.words || verse.Words || [];
    const resolvedVerse = toResolvedVerse(verse);

    words.forEach((word: any, i: number) => {
      flatWords.push({
        Glyph: word.text ?? word.arabic ?? word.Arabic ?? "",
        Ayah: resolvedVerse,
        WordIndex: i,
        IsVerseEnd: i === words.length - 1,
        IsVerseMarker: false,
        AyahNumber: verse.verseNumber,
        __line: word.line ?? word.lineNumber,
      } as ResolvedWord & { __line?: number });
    });
  }

  const byLine = new Map<number, ResolvedWord[]>();
  let syntheticLine = 0;
  let cursorInLine = 0;

  flatWords.forEach((w) => {
    let lineKey = w.__line;
    if (lineKey == null) {
      lineKey = syntheticLine;
      cursorInLine++;
      if (cursorInLine >= WORDS_PER_SYNTHETIC_LINE) {
        cursorInLine = 0;
        syntheticLine++;
      }
    }
    if (!byLine.has(lineKey)) byLine.set(lineKey, []);
    byLine.get(lineKey)!.push(w);
  });

  return Array.from(byLine.keys())
    .sort((a, b) => a - b)
    .map((k) => byLine.get(k)!);
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
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

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
          const cardSurah = toCardSurah(surah, adjustedSurah);

          const pageData: PageAyahs = {
            pageNumber: startPage,
            Ayah: trimmedVerses.map(toResolvedVerse),
          };

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
                <PageCard
                  // NOTE: several of the props below are required by
                  // PageCardProps but have no source in this ad-hoc
                  // corpus (no basmalah words, no mushaf Layout, no
                  // per-page font-family resolution) - these are the same
                  // safe defaults PageView.tsx falls back to when that
                  // data is missing, not derived values. Worth revisiting
                  // once this route has a real data source for them.
                  PageIndex={0}
                  SurahNumber={surah.id}
                  ResolvedLines={buildResolvedLines(trimmedVerses)}
                  ContainerClass="rounded-[48px] mb-2"
                  FontClass={fontClass}
                  ArabicFontSize={arabicFontSize}
                  ShowArabicText={showArabicText && !hideVerses}
                  ShowTransliteration={showTransliteration}
                  PageData={pageData}
                  RawPageData={null}
                  ShowBasmalahOnPage={false}
                  BasmalahWords={[]}
                  PageFontFamily={fontClass}
                  AyahRefs={verseRefs}
                  HighlightedAyah={highlightedVerse}
                  setHighlightedAyah={setHighlightedVerse}
                  TransliterationFontSize={transliterationFontSizeValue}
                  TranslationFontSize={translationFontSizeValue}
                  HoverTranslation={wbwTranslationHover ?? false}
                  InlineTranslation={wbwTranslationInline ?? ""}
                  InlineTransliteration={wbwTransliterationInline ?? ""}
                  HideVerses={false}
                  HideVerseMarkers={hideVerseMarkers}
                  IsIndoPakFont={quranFont === "indopak"}
                  VerseMarkerOverrides={[]}
                  IsUthmaniV4Font={quranFont === "uthmani_v4"}
                  WordSpacing="1.8px"
                  Layout={null}
                />
              ) : (
                <div className="space-y-4">
                  {trimmedVerses.map((verse) => (
                    <VerseCard
                      key={verse.verseNumber}
                      Ayah={toResolvedVerse(verse)}
                      Words={verse.words || verse.Words}
                      Translation={verse.translation}
                      Surah={cardSurah}
                      ShowArabicText={showArabicText && !hideVerses}
                      ShowTranslation={verseTranslation}
                      TranslationFontSize={translationFontSizeValue}
                      TransliterationFontSize={transliterationFontSizeValue}
                      ShowTransliteration={showTransliteration}
                      HoverTranslation={wbwTranslationHover}
                      InlineTranslation={wbwTranslationInline}
                      InlineTransliteration={wbwTransliterationInline}
                      AyahRef={(el: HTMLDivElement | null) => {
                        if (el) verseRefs.current.set(verse.verseNumber, el);
                      }}
                      onTafsirClick={() =>
                        setTafsirDialog({ open: true, surahId: surah.id, verseNumber: verse.verseNumber })
                      }
                      onNotesClick={() => {}}
                      onShareClick={() => {}}
                    />
                  ))}
                </div>
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