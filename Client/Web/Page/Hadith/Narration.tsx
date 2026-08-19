import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Copy, Share2, BookmarkPlus, Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@Web/Context/App";
import { useBookmarks } from "@/Hook/Use-Bookmarks";
import { useAuth } from "@Web/Context/Auth";
import { useTranslation } from "@/Hook/Use-Translation";
import { toast } from "@/Hook/Use-Toast";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { Tooltip } from "@Web/Component/UI/Tooltip";
import { ShareDialog } from "@Web/Component/Dialog/Share";
import { useState } from "react";

import {
  Fetch_Collections,
  Get_Chapter,
  Fetch_Hadith_Composite,
} from "@/Library/Hadith-API";
import type {
  Collection_Info,
  Chapter_Data,
  Hadith_Composite,
  WBW_Translation,
  WBW_Transliteration,
} from "@/Library/Hadith-Types";

const cleanEdition = (val?: string) => (!val || val === "None" ? "" : val);

const Narration = () => {
  const { Collection, Chapter, HadithId } = useParams<{
    Collection: string;
    Chapter: string;
    HadithId: string;
  }>();

  const { t } = useTranslation();
  const { user } = useAuth();
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
  const {
    showHadithTranslation,
    showHadithTransliteration,
    hadithArabicFontSize,
    hadithTranslationFontSize,
    hadithTransliterationFontSize,
    selectedHadithTranslationEdition,
    selectedHadithTransliterationEdition,

    // WBW Word Settings (Exclusively Hover and Inline Editions)
    selectedHadithHoverTranslationEdition,
    selectedHadithInlineTranslationEdition,
    selectedHadithHoverTransliterationEdition,
    selectedHadithInlineTransliterationEdition,
  } = useApp();

  const [shareOpen, setShareOpen] = useState(false);

  const collectionId = Collection ?? "";
  const chapterIdNum = Number(Chapter) || 0;
  const hadithIdNum = Number(HadithId) || 0;

  // 1. Resolve collection details
  const { data: collections = [] } = useQuery<Collection_Info[]>({
    queryKey: ["hadithCollections"],
    queryFn: () => Fetch_Collections(),
    staleTime: 1000 * 60 * 60,
  });

  const normalize = (str?: string) => str?.toLowerCase().replace(/[\/-]/g, "");

  const targetCollection = collections.find(
    (c) => normalize(c.ID) === normalize(collectionId)
  );

  // 2. Fetch parent chapter data
  const { data: chapterData = null } = useQuery<Chapter_Data | null>({
    queryKey: ["hadithChapter", targetCollection?.ID, chapterIdNum],
    queryFn: () =>
      targetCollection?.ID && chapterIdNum
        ? Get_Chapter(targetCollection.ID, chapterIdNum)
        : null,
    enabled: Boolean(targetCollection?.ID && chapterIdNum),
    staleTime: 1000 * 60 * 30,
  });

  // Clean parameters so API receives empty string instead of "None"
  const hTrans = cleanEdition(selectedHadithHoverTranslationEdition);
  const iTrans = cleanEdition(selectedHadithInlineTranslationEdition);
  const hTLit = cleanEdition(selectedHadithHoverTransliterationEdition);
  const iTLit = cleanEdition(selectedHadithInlineTransliterationEdition);

  // 3. Fetch composite Hadith payload
  const { data: hadithComposite = null } = useQuery<Hadith_Composite | null>({
    queryKey: [
      "hadithComposite",
      targetCollection?.ID,
      hadithIdNum,
      selectedHadithTranslationEdition,
      selectedHadithTransliterationEdition,
      hTrans,
      iTrans,
      hTLit,
      iTLit,
    ],
    queryFn: () =>
      targetCollection?.ID && hadithIdNum
        ? Fetch_Hadith_Composite(
            targetCollection.ID,
            hadithIdNum,
            selectedHadithTranslationEdition || "",
            selectedHadithTransliterationEdition || "",
            hTrans,
            iTrans,
            hTLit,
            iTLit
          )
        : null,
    enabled: Boolean(targetCollection?.ID && hadithIdNum),
    staleTime: 1000 * 60 * 30,
  });

  const toRem = (size: number | undefined, base = 1.2) => {
    const val = typeof size === "number" && !isNaN(size) ? size : 5;
    return `${(base * val) / 5}rem`;
  };

  const narration = hadithComposite?.Narration;

  if (!targetCollection || !chapterData || !narration) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <Container className="max-w-md mx-auto p-8">
            <h1 className="text-2xl font-semibold mb-4">Hadith Not Found</h1>
            <Link to="/Hadith">
              <Button>Back to Hadith</Button>
            </Link>
          </Container>
        </div>
      </Layout>
    );
  }

  const safeCollectionId = targetCollection.ID.replace(/\//g, "-");
  const arabicText = narration.Text || "";
  const primaryTranslation = hadithComposite?.Translation?.[0]?.Text || "";
  const primaryTransliteration = hadithComposite?.Transliteration?.[0]?.Text || "";

  // Compute active column count
  const isTranslationActive = Boolean(showHadithTranslation && primaryTranslation);
  const isTransliterationActive = Boolean(showHadithTransliteration && primaryTransliteration);

  let gridColsClass = "grid-cols-1";
  if (isTranslationActive && isTransliterationActive) {
    gridColsClass = "grid-cols-1 lg:grid-cols-3";
  } else if (isTranslationActive || isTransliterationActive) {
    gridColsClass = "grid-cols-1 lg:grid-cols-2";
  }

  const chapterNarrations = chapterData.Narrations || [];
  const currentIndex = chapterNarrations.findIndex((n) => n.ID === hadithIdNum);
  const prevHadith = currentIndex > 0 ? chapterNarrations[currentIndex - 1] : null;
  const nextHadith =
    currentIndex !== -1 && currentIndex < chapterNarrations.length - 1
      ? chapterNarrations[currentIndex + 1]
      : null;

  const isBookmarked = bookmarks.some(
    (b) => b.surah_id === 0 && b.ayah_id === narration.ID
  );
  const getBookmarkId = () =>
    bookmarks.find((b) => b.surah_id === 0 && b.ayah_id === narration.ID)?.id;

  const handleBookmark = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to bookmark hadith" });
      return;
    }
    if (isBookmarked) {
      const id = getBookmarkId();
      if (id) await removeBookmark(id);
    } else {
      await addBookmark(
        0,
        narration.ID,
        `Hadith ${narration.ID} - ${chapterData.Chapter.Name}`
      );
    }
  };

  const handleCopy = () => {
    let text = arabicText;
    if (primaryTransliteration) text += `\n\n${primaryTransliteration}`;
    if (primaryTranslation) text += `\n\n${primaryTranslation}`;
    text += `\n\n— ${targetCollection.Name} ${narration.ID}`;

    navigator.clipboard.writeText(text);
    toast({ title: t.quran.copy, description: "Hadith copied to clipboard" });
  };

  // Split word payload
  const arabicWords = arabicText.trim().split(/\s+/);
  const hoverTranslations = hadithComposite?.WBW_Hover_Translation || [];
  const inlineTranslations = hadithComposite?.WBW_Inline_Translation || [];
  const hoverTransliterations = hadithComposite?.WBW_Hover_Transliteration || [];
  const inlineTransliterations = hadithComposite?.WBW_Inline_Transliteration || [];

  const hasHoverTranslation = Boolean(hTrans);
  const hasHoverTransliteration = Boolean(hTLit);
  const hasInlineTranslation = Boolean(iTrans);
  const hasInlineTransliteration = Boolean(iTLit);

  const renderWord = (word: string, idx: number) => {
    const hoverTransEntry: WBW_Translation | undefined = hoverTranslations[idx];
    const hoverTLiterEntry: WBW_Transliteration | undefined = hoverTransliterations[idx];

    const inlineTransEntry: WBW_Translation | undefined = inlineTranslations[idx];
    const inlineTLiterEntry: WBW_Transliteration | undefined = inlineTransliterations[idx];

    const showTooltip = Boolean(
      (hasHoverTranslation && hoverTransEntry?.Text) ||
        (hasHoverTransliteration && hoverTLiterEntry?.Text)
    );

    const tooltipContent = showTooltip ? (
      <div className="flex flex-col gap-1 p-1 text-center" dir="ltr">
        {hasHoverTransliteration && hoverTLiterEntry?.Text && (
          <span className="text-xs font-semibold text-emerald-500">
            {hoverTLiterEntry.Text}
          </span>
        )}
        {hasHoverTranslation && hoverTransEntry?.Text && (
          <span className="text-xs text-foreground">{hoverTransEntry.Text}</span>
        )}
      </div>
    ) : null;

    const WordContent = (
      <div className="inline-flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
        <span
          className="cursor-pointer transition-colors duration-150 hover:text-emerald-600"
          style={{
            fontFamily: "'KFGQPC-Uthmani', sans-serif",
            fontSize: toRem(hadithArabicFontSize, 1.4),
          }}
        >
          {word}
        </span>

        {hasInlineTransliteration && inlineTLiterEntry?.Text && (
          <span
            className="text-xs text-emerald-600 dark:text-emerald-400 font-medium tracking-wide mt-1"
            dir="ltr"
          >
            {inlineTLiterEntry.Text}
          </span>
        )}

        {hasInlineTranslation && inlineTransEntry?.Text && (
          <span
            className="text-xs text-muted-foreground mt-0.5"
            dir="ltr"
          >
            {inlineTransEntry.Text}
          </span>
        )}
      </div>
    );

    return (
      <span key={idx} className="inline-block my-1 mx-0.5">
        {showTooltip ? (
          <Tooltip content={tooltipContent} enabled={true} side="top" offset={8}>
            {WordContent}
          </Tooltip>
        ) : (
          WordContent
        )}
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <Container className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <Container className="!py-1.5 !px-3 inline-flex w-auto max-w-full">
              <h1 className="text-sm font-medium truncate">
                {targetCollection.Name} - {chapterData.Chapter.Name} - {narration.ID}
              </h1>
            </Container>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" className="w-8 h-8 p-0" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" className="w-8 h-8 p-0" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className={`w-8 h-8 p-0 ${isBookmarked ? "text-primary" : ""}`}
                onClick={handleBookmark}
              >
                {isBookmarked ? (
                  <Bookmark className="h-4 w-4 fill-current" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className={`grid ${gridColsClass} gap-8 items-start`}>
            {/* 1. Translation Column */}
            {isTranslationActive && (
              <div className="order-3 lg:order-1 mt-2 lg:mt-0" dir="ltr">
                <p
                  className="text-justify leading-relaxed text-muted-foreground dark:text-neutral-200"
                  style={{ fontSize: toRem(hadithTranslationFontSize, 1.0) }}
                >
                  {primaryTranslation}
                </p>
              </div>
            )}

            {/* 2. Transliteration Column */}
            {isTransliterationActive && (
              <div className="order-2 lg:order-2 mt-2 lg:mt-0" dir="ltr">
                <p
                  className="text-justify leading-relaxed text-emerald-600 dark:text-emerald-400 font-medium"
                  style={{ fontSize: toRem(hadithTransliterationFontSize, 1.0) }}
                >
                  {primaryTransliteration}
                </p>
              </div>
            )}

            {/* 3. Arabic Main Text Column */}
            {arabicText && (
              <div
                className="order-1 lg:order-3 flex flex-wrap flex-row-reverse justify-start items-baseline gap-y-2"
                dir="rtl"
              >
                {arabicWords.map((word, idx) => renderWord(word, idx))}
              </div>
            )}
          </div>
        </Container>

        <div className="flex items-center justify-between mt-6 pt-4">
          {prevHadith ? (
            <Link to={`/Hadith/${safeCollectionId}/${chapterIdNum}/${prevHadith.ID}`}>
              <Button className="px-4 py-2 inline-flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Hadith {prevHadith.ID}
              </Button>
            </Link>
          ) : (
            <div />
          )}
          {nextHadith && (
            <Link to={`/Hadith/${safeCollectionId}/${chapterIdNum}/${nextHadith.ID}`}>
              <Button className="px-4 py-2 inline-flex items-center gap-2">
                Hadith {nextHadith.ID}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        surahId={0}
        ayahId={narration.ID}
        verseText={arabicText}
        translation={primaryTranslation}
      />
    </Layout>
  );
};

export default Narration;