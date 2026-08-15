import { useMemo, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Bitaqah_Al_Ayah } from "@Web/Component/Quran/Takheet/Ayah/Bitaqah";
import { Bitaqah as Bitaqat_As_Safhah } from "@Web/Component/Quran/Takheet/Safhah/Bitaqah";
import { SurahHeader } from "@Web/Component/Quran/Surah/Header";
import { SurahInfoDialog } from "@Web/Component/Dialog/Surah-Info";
import { TafsirDialog } from "@Web/Component/Dialog/Tafsir";
import { AudioPlayer } from "@Web/Component/Audio-Player/Index";
import { useAudio } from "@Web/Context/Audio";
import { useApp, type QuranFontFamily } from "@Web/Context/App";
import type { Al_Kalimah_Al_Muhallalah } from "@Web/Component/Quran/Takheet/Anwaa";

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

// ============= Adapters: legacy fetch shape -> new Bitaqah prop shape =============

/** Bitaqah_Al_Ayah/Bitaqat_As_Safhah read "Al-Ayah" / "As-Surah" style keys directly
 *  (with only partial fallback to camelCase). These helpers guarantee both are present
 *  so the components work regardless of which key path they use internally. */
function toBitaqahAyah(verse: any) {
  return {
    ...verse,
    "Al-Ayah": verse.verseNumber ?? verse["Al-Ayah"],
    "Al-Arabiyyah": verse.arabic ?? verse["Al-Arabiyyah"],
    Haashiyah: verse.footnotes ?? verse.Haashiyah,
  };
}

function toBitaqahSurah(surah: any, adjustedSurah: any) {
  return {
    ...adjustedSurah,
    "As-Surah": surah.id,
    "Bidayat-As-Safhah": adjustedSurah.pages?.[0],
    "Nihayat-As-Safhah": adjustedSurah.pages?.[1],
    "At-Tansiq": surah.arabicName ?? surah.englishName,
    "At-Tarjamah": surah.englishName,
  };
}

const WORDS_PER_SYNTHETIC_LINE = 12;

/**
 * Groups the flat verse->word list into the line-based structure Sutoor_As_Safhah
 * expects (Sutoor_Muhallalah: Al_Kalimah_Al_Muhallalah[][]).
 *
 * If the backend ever starts returning real mushaf line numbers per word
 * (e.g. word.line), this will pick them up automatically. Until then it falls
 * back to a synthetic word-count-based wrap so the page layout still renders.
 */
function buildSutoorMuhallalah(verses: any[]): Al_Kalimah_Al_Muhallalah[][] {
  const flatWords: Array<Al_Kalimah_Al_Muhallalah & { __line?: number }> = [];

  for (const verse of verses) {
    const words: any[] = verse.words || verse.Al_Kalimat || [];
    const bitaqahVerse = toBitaqahAyah(verse);

    words.forEach((word: any, i: number) => {
      flatWords.push({
        Ar_Rasm: word.text ?? word.arabic ?? word["Ar-Rasm"] ?? "",
        Al_Ayah: bitaqahVerse,
        Fahras_Al_Kalimah: i,
        Nihayat_Al_Ayah: i === words.length - 1,
        Raqm_Al_Ayah_Hal: false,
        Raqm_Al_Ayah: verse.verseNumber,
        __line: word.line ?? word.lineNumber,
      } as Al_Kalimah_Al_Muhallalah & { __line?: number });
    });
  }

  const byLine = new Map<number, Al_Kalimah_Al_Muhallalah[]>();
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
          const bitaqahSurah = toBitaqahSurah(surah, adjustedSurah);

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
                <Bitaqat_As_Safhah
                  Raqm_As_Surah={surah.id}
                  Sutoor_Muhallalah={buildSutoorMuhallalah(trimmedVerses)}
                  Fiat_Al_Khatt={fontClass}
                  Hajm_Khatt_Ar_Rasm={arabicFontSize}
                  Izhaar_An_Nass_Al_Arabi={showArabicText && !hideVerses}
                  Izhaar_Al_Kitabah_As_Sawtiyyah={showTransliteration}
                  As_Safhah={{ ...data, verses: trimmedVerses, pageNumber: startPage }}
                  Maraji_Al_Ayaat={verseRefs}
                  Al_Ayah_Al_Mumayyazah={highlightedVerse}
                  Tain_Al_Ayah_Al_Mumayyazah={setHighlightedVerse}
                  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah={transliterationFontSizeValue}
                  Tarjamah_Ind_Al_Tamreer={wbwTranslationHover}
                  At_Tarjamah_Al_Mudmajah={wbwTranslationInline}
                  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={wbwTransliterationInline}
                  Ikhfaa_Al_Ayaat={false}
                  Ikhfaa_Alamaat_Al_Ayaat={hideVerseMarkers}
                  Hal_Huwa_Khatt_Indo_Pak={quranFont === "indopak"}
                  Hal_Huwa_Khatt_Uthmani_V4={quranFont === "uthmani_v4"}
                  Ailat_Khatt_Al_Safhah={undefined}
                />
              ) : (
                <div className="space-y-4">
                  {trimmedVerses.map((verse) => (
                    <Bitaqah_Al_Ayah
                      key={verse.verseNumber}
                      Al_Ayah={toBitaqahAyah(verse)}
                      Kalimaat={verse.words || verse.Al_Kalimat}
                      At_Tarjamah={verse.translation}
                      Surah={bitaqahSurah}
                      Izhaar_An_Nass_Al_Arabi={showArabicText && !hideVerses}
                      Tarjamat_Al_Ayah={verseTranslation}
                      Hajm_Khatt_At_Tarjamah={translationFontSizeValue}
                      Hajm_Khatt_Al_Kitabah_As_Sawtiyyah={transliterationFontSizeValue}
                      Izhaar_Al_Kitabah_As_Sawtiyyah={showTransliteration}
                      Tarjamah_Ind_Al_Tamreer={wbwTranslationHover}
                      At_Tarjamah_Al_Mudmajah={wbwTranslationInline}
                      Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={wbwTransliterationInline}
                      Marji_Al_Ayah={(el: HTMLDivElement | null) => {
                        if (el) verseRefs.current.set(verse.verseNumber, el);
                      }}
                      An_Naqr_Ala_At_Tafseer={() =>
                        setTafsirDialog({ open: true, surahId: surah.id, verseNumber: verse.verseNumber })
                      }
                      An_Naqr_Ala_Al_Mulahazaat={() => {}}
                      An_Naqr_Ala_Al_Musharakah={() => {}}
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