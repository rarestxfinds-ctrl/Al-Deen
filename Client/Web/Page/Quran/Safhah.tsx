import { useParams } from "react-router-dom";
import { useMemo, useRef } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { PageView } from "@Web/Component/Quran/Layout/Page/PageView";
import { AyahList } from "@Web/Component/Quran/Layout/Ayah/AyahList";
import { Layout } from "@Web/Component/Layout/Index";
import { useApp, type QuranFontFamily } from "@Web/Context/App";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@Web/Component/UI/Alert";
import { Container } from "@Web/Component/UI/Container";
import { Fetch_Page_Sections_Corpus, Fetch_Surah_Details } from "@/Library/Quran-API";
import type { Page_Sections, Surah_Details } from "@/Library/Quran-API";
import type { SurahMeta, AssembledVerse } from "@Web/Component/Quran/Layout/Types";

interface PageSegment {
  surah: number;
  startVerse: number;
  endVerse: number;
}

// Page_Sections[page] (see Page_Sections in Quran-API.ts) is an array of
// { Surah, Start_Ayah, End_Ayah } objects — not a delimited string,
// and it carries no word-level boundaries at all. This reads that shape
// directly instead of parsing a "surah:verse.word-surah:verse.word|..."
// format that was never actually returned.
function parsePageSegments(pageMapEntry: Page_Sections[number] | undefined): PageSegment[] | null {
  if (!pageMapEntry || pageMapEntry.length === 0) return null;

  return pageMapEntry.map((entry) => ({
    surah: entry["Surah"],
    startVerse: entry["Start_Ayah"],
    endVerse: entry["End_Ayah"],
  }));
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
    data: pageSectionsMap,
    isLoading: isLoadingSegments,
    error: segmentsError,
  } = useQuery<Page_Sections>({
    queryKey: ["pageSectionsCorpus"],
    queryFn: Fetch_Page_Sections_Corpus,
    staleTime: 1000 * 60 * 60,
  });

  const pageSegments = useMemo(() => {
    if (!pageSectionsMap) return null;
    return parsePageSegments(pageSectionsMap[pageNumber]);
  }, [pageSectionsMap, pageNumber]);

  const surahIdsOnPage = useMemo(() => {
    if (!pageSegments) return [];
    return Array.from(new Set(pageSegments.map((s) => s.surah)));
  }, [pageSegments]);

  // List-layout only: AyahList doesn't fetch its own data (unlike
  // PageView), so pull each surah's verses/words here and trim to
  // the segment that actually falls on this page.
  const surahQueries = useQueries({
    queries: surahIdsOnPage.map((surahId) => ({
      queryKey: ["surahDetails", surahId],
      queryFn: () => Fetch_Surah_Details(surahId, [], []),
      enabled: !isPageLayout && !!pageSegments,
      staleTime: 1000 * 60 * 30,
    })),
  });

  const pageVerses = useMemo(() => {
    if (isPageLayout || !pageSegments) return [];

    const result: { surah: SurahMeta; ayaat: AssembledVerse[]; words: any[] }[] = [];

    pageSegments.forEach((segment) => {
      const idx = surahIdsOnPage.indexOf(segment.surah);
      const data = surahQueries[idx]?.data as Surah_Details | undefined;
      if (!data?.["Surah"]) return;

      const ayaat = (data["Ayah"] || []).filter(
        (v) => v["Ayah"] >= segment.startVerse && v["Ayah"] <= segment.endVerse
      );
      const words = (data["Words"] || []).filter(
        (w) => w["Ayah"] >= segment.startVerse && w["Ayah"] <= segment.endVerse
      );

      result.push({ surah: data["Surah"] as unknown as SurahMeta, ayaat: ayaat as unknown as AssembledVerse[], words });
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
                  // NOTE: PageView resolves Start_Page/End_Page from the
                  // surah data it fetches itself, not from this prop, so it renders every
                  // page of the surah that has verses (a full paginated surah view), not
                  // just `pageNumber`. There's no prop on this component to scope it to a
                  // single page today - that would need a change inside PageView.tsx itself
                  // (e.g. an optional `onlyPage` filter applied to its page list).
                  <PageView
                    key={surahId}
                    Surah={{ Surah: surahId } as SurahMeta}
                    ShowArabicText={showArabicText}
                    HoverTranslation={hoverTranslation}
                    InlineTranslation={inlineTranslation}
                    InlineTransliteration={inlineTransliteration}
                    FontClass={fontClass}
                    ArabicFontSize={arabicFontSize}
                    TranslationFontSize={translationFontSizeValue}
                    TransliterationFontSize={transliterationFontSizeValue}
                    ShowTransliteration={selectedAyahTransliterator !== "None"}
                    AyahRefs={verseRefs}
                    HideVerses={hideVerses}
                    HideVerseMarkers={hideVerseMarkers}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No content available</div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {pageVerses.length > 0 ? (
                pageVerses.map(({ surah, ayaat, words }) => (
                  <AyahList
                    key={surah["Surah"]}
                    Surah={surah}
                    Ayah={ayaat}
                    Words={words}
                    ShowArabicText={showArabicText}
                    ShowTranslation={verseTranslation}
                    TranslationFontSize={translationFontSizeValue}
                    TransliterationFontSize={transliterationFontSizeValue}
                    SelectedTransliteration={selectedAyahTransliterator}
                    HoverTranslation={hoverTranslation}
                    InlineTranslation={inlineTranslation}
                    InlineTransliteration={inlineTransliteration}
                    AyahRefs={verseRefs}
                    onNotesClick={() => {}}
                    onShareClick={() => {}}
                    onTafsirClick={() => {}}
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