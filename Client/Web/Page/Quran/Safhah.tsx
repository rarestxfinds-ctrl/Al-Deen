import { useParams } from "react-router-dom";
import { useMemo, useRef } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Qaimat_As_Safahat } from "@Web/Component/Quran/Takheet/Safhah/Qaimah";
import { Qaimat_Al_Ayaat } from "@Web/Component/Quran/Takheet/Ayah/Qaimah";
import { Layout } from "@Web/Component/Layout/Index";
import { useApp, type QuranFontFamily } from "@Web/Context/App";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@Web/Component/UI/Alert";
import { Container } from "@Web/Component/UI/Container";
import { Jalb_Aqsam_As_Safahat_Corpus, Jalb_Bayanat_As_Surah } from "@/Library/Quran-API";
import type { Aqsam_As_Safahat, As_Surah, Al_Ayah, Bayanat_As_Surah } from "@/Library/Quran-Types";

interface PageSegment {
  surah: number;
  startVerse: number;
  startWord: number;
  endSurah: number;
  endVerse: number;
  endWord: number;
}

// Same pipe-delimited "surah:verse.word-surah:verse.word|..." format the old
// client-side parser used, just pointed at the Aqsam_As_Safahat corpus map
// that Qaimat_As_Safahat itself now reads from Jalb_Aqsam_As_Safahat_Corpus.
function parsePageSegments(pageMapEntry: string | string[] | undefined): PageSegment[] | null {
  if (!pageMapEntry) return null;
  const raw = Array.isArray(pageMapEntry) ? pageMapEntry.join("|") : pageMapEntry;
  const segments = raw.split("|");
  const result: PageSegment[] = [];

  for (const segment of segments) {
    const [start, end] = segment.split("-");
    if (!start || !end) continue;

    const [startSurahVerse, startWordStr] = start.split(".");
    const [startSurah, startVerse] = startSurahVerse.split(":").map(Number);
    const startWord = Number(startWordStr || 1);

    const [endSurahVerse, endWordStr] = end.split(".");
    const [endSurah, endVerse] = endSurahVerse.split(":").map(Number);
    const endWord = Number(endWordStr || 1);

    result.push({ surah: startSurah, startVerse, startWord, endSurah, endVerse, endWord });
  }

  return result.length > 0 ? result : null;
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

export default function Safhah() {
  const { pageNumber: pageNumParam } = useParams<{ pageNumber: string }>();
  const pageNumber = parseInt(pageNumParam || "1", 10);

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
    selectedAyahTransliterator,
    hideVerses,
    hideVerseMarkers,
  } = useApp();

  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isPageLayout = layout === "page";

  const arabicFontSize = `${(1.5 * fontSize) / 5}rem`;
  const translationFontSizeValue = `${(1 * translationFontSize) / 3}rem`;
  const transliterationFontSizeValue = `${(1 * transliterationSize) / 3}rem`;
  const fontClass = getFontClass(quranFont);

  // Which surah(s) land on this page number, and where within them.
  const {
    data: pageSegmentsMap,
    isLoading: isLoadingSegments,
    error: segmentsError,
  } = useQuery<Aqsam_As_Safahat>({
    queryKey: ["aqsamAsSafahat"],
    queryFn: Jalb_Aqsam_As_Safahat_Corpus,
    staleTime: 1000 * 60 * 60,
  });

  const pageSegments = useMemo(() => {
    if (!pageSegmentsMap) return null;
    const rawPageData = (pageSegmentsMap as Record<string, any>)[String(pageNumber)];
    return parsePageSegments(rawPageData);
  }, [pageSegmentsMap, pageNumber]);

  const surahIdsOnPage = useMemo(() => {
    if (!pageSegments) return [];
    return Array.from(new Set(pageSegments.map((s) => s.surah)));
  }, [pageSegments]);

  // List-layout only: Qaimat_Al_Ayaat doesn't fetch its own data (unlike
  // Qaimat_As_Safahat), so pull each surah's verses/words here and trim to
  // the segment that actually falls on this page.
  const surahQueries = useQueries({
    queries: surahIdsOnPage.map((surahId) => ({
      queryKey: ["bayanatAsSurah", surahId],
      queryFn: () => Jalb_Bayanat_As_Surah(surahId, [], []),
      enabled: !isPageLayout && !!pageSegments,
      staleTime: 1000 * 60 * 30,
    })),
  });

  const pageVerses = useMemo(() => {
    if (isPageLayout || !pageSegments) return [];

    const result: { surah: As_Surah; ayaat: Al_Ayah[]; kalimaat: any[] }[] = [];

    pageSegments.forEach((segment) => {
      const idx = surahIdsOnPage.indexOf(segment.surah);
      const data = surahQueries[idx]?.data as Bayanat_As_Surah | undefined;
      if (!data?.["As-Surah"]) return;

      const ayaat = (data["Al-Ayat"] || []).filter(
        (v: Al_Ayah) => v["Al-Ayah"] >= segment.startVerse && v["Al-Ayah"] <= segment.endVerse
      );
      const kalimaat = (data["Al-Kalimat"] || []).filter(
        (k: any) => k["Al-Ayah"] >= segment.startVerse && k["Al-Ayah"] <= segment.endVerse
      );

      result.push({ surah: data["As-Surah"], ayaat, kalimaat });
    });

    return result;
  }, [pageSegments, surahIdsOnPage, surahQueries, isPageLayout]);

  const isLoading = isLoadingSegments || (!isPageLayout && surahQueries.some((q) => q.isLoading));
  const error = segmentsError || (!isPageLayout && surahQueries.find((q) => q.error)?.error);

  if (isLoading) {
    return (
      <Layout hideFooter>
        <div className="w-full max-w-2xl mx-auto p-8 text-center animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-xl w-3/4 mx-auto" />
          <div className="h-40 bg-muted rounded-2xl w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !pageSegments) {
    return (
      <Layout hideFooter>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load page {pageNumber}. Please verify remote cache operational health.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="w-full max-w-[19em] mx-auto pt-0 px-0">
        <Container className="!px-6 !py-4 rounded-t-[40px] rounded-b-none flex items-center justify-between">
          <h1 className="text-lg font-bold">Page {pageNumber}</h1>
        </Container>
        <Container className="!rounded-t-none !rounded-b-[40px] mb-6">
          {isPageLayout ? (
            <div className="pt-2 px-2 pb-2 space-y-4">
              {surahIdsOnPage.length > 0 ? (
                surahIdsOnPage.map((surahId) => (
                  // NOTE: Qaimat_As_Safahat resolves Bidayat/Nihayat-As-Safhah from the
                  // surah data it fetches itself, not from this prop, so it renders every
                  // page of the surah that has verses (a full paginated surah view), not
                  // just `pageNumber`. There's no prop on this component to scope it to a
                  // single page today - that would need a change inside Qaimah.tsx itself
                  // (e.g. an optional `onlyPage` filter applied to its `Safahat` list).
                  <Qaimat_As_Safahat
                    key={surahId}
                    surah={{ "As-Surah": surahId } as As_Surah}
                    showArabicText={showArabicText}
                    hoverTranslation={hoverTranslation}
                    inlineTranslation={inlineTranslation}
                    inlineTransliteration={inlineTransliteration}
                    fontClass={fontClass}
                    arabicFontSize={arabicFontSize}
                    translationFontSize={translationFontSizeValue}
                    transliterationFontSize={transliterationFontSizeValue}
                    showTransliteration={selectedAyahTransliterator !== "None"}
                    verseRefs={verseRefs}
                    hideVerses={hideVerses}
                    hideVerseMarkers={hideVerseMarkers}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No content available</div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {pageVerses.length > 0 ? (
                pageVerses.map(({ surah, ayaat, kalimaat }) => (
                  <Qaimat_Al_Ayaat
                    key={surah["As-Surah"]}
                    Surah={surah}
                    Ayaat={ayaat}
                    Kalimaat={kalimaat}
                    Izhaar_An_Nass_Al_Arabi={showArabicText}
                    Tarjamat_Al_Ayah={verseTranslation}
                    Hajm_Khatt_At_Tarjamah={translationFontSizeValue}
                    Hajm_Khatt_Al_Kitabah_As_Sawtiyyah={transliterationFontSizeValue}
                    Mukhtar_Al_Kitabah_As_Sawtiyyah={selectedAyahTransliterator}
                    Tarjamah_Ind_Al_Tamreer={hoverTranslation}
                    At_Tarjamah_Al_Mudmajah={inlineTranslation}
                    Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={inlineTransliteration}
                    Maraji_Al_Ayaat={verseRefs}
                    An_Naqr_Ala_Al_Mulahazaat={() => {}}
                    An_Naqr_Ala_Al_Musharakah={() => {}}
                    An_Naqr_Ala_At_Tafseer={() => {}}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No content available</div>
              )}
            </div>
          )}
        </Container>
      </div>
    </Layout>
  );
}