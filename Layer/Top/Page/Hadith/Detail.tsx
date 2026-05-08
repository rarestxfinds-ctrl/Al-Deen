import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { Copy, Share2, BookmarkPlus, Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { getCollection, getChapter, getFullTransliteration } from "@/Bottom/API/Hadith";
import { useApp } from "@/Middle/Context/App";
import { useBookmarks } from "@/Middle/Hook/Use-Bookmarks";
import { useAuth } from "@/Middle/Context/Auth";
import { useTranslation } from "@/Middle/Hook/Use-Translation";
import { toast } from "@/Middle/Hook/Use-Toast";
import { Container } from "@/Top/Component/UI/Container";
import { Button } from "@/Top/Component/UI/Button";
import { Tooltip } from "@/Top/Component/UI/Tooltip";
import { useState } from "react";

const Detail = () => {
  const { Collection, Chapter, HadithId } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
  const {
    // Toggles
    showHadithTranslation,
    showHadithTransliteration,
    showHadithInlineTranslation,
    showHadithInlineTransliteration,
    showHadithHoverTranslation,
    showHadithHoverTransliteration,
    // Font sizes (1‑10 scale)
    hadithArabicFontSize,
    hadithTranslationFontSize,
    hadithTransliterationFontSize,
    hadithInlineTranslationFontSize,
    hadithInlineTransliterationFontSize,
  } = useApp();

  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  // Helper: convert 1‑10 to rem (base 1.2rem for size 5)
  const toRem = (size: number, base = 1.2) => `${(base * size) / 5}rem`;

  // Synchronous data retrieval
  const collection = Collection ? getCollection(Collection) : null;
  const chapter = Collection && Chapter ? getChapter(Collection, Chapter) : null;
  const hadithIdNum = HadithId ? parseInt(HadithId, 10) : 0;
  const hadith = chapter?.hadith?.find(h => h.id === hadithIdNum);

  // Navigation within chapter
  const currentIndex = chapter?.hadith.findIndex(h => h.id === hadithIdNum) ?? -1;
  const prevHadith = currentIndex > 0 ? chapter?.hadith[currentIndex - 1] : null;
  const nextHadith = currentIndex !== -1 && currentIndex < (chapter?.hadith.length ?? 0) - 1
    ? chapter?.hadith[currentIndex + 1]
    : null;

  // Bookmark logic
  const isBookmarked = hadith ? bookmarks.some(b => b.surah_id === 0 && b.ayah_id === hadith.id) : false;
  const getBookmarkId = () => bookmarks.find(b => b.surah_id === 0 && b.ayah_id === hadith?.id)?.id;

  const handleBookmark = async () => {
    if (!user || !hadith) {
      toast({ title: "Sign in required", description: "Please sign in to bookmark hadith" });
      return;
    }
    if (isBookmarked) {
      const id = getBookmarkId();
      if (id) await removeBookmark(id);
    } else {
      await addBookmark(0, hadith.id, `Hadith ${hadith.id} - ${chapter?.name}`);
    }
  };

  const handleCopy = () => {
    if (!hadith) return;
    const text = `${hadith.arabic}\n\n${hadith.translation}\n\n— ${collection?.name} ${hadith.id}`;
    navigator.clipboard.writeText(text);
    toast({ title: t.quran.copy, description: "Hadith copied to clipboard" });
  };

  const handleShare = async () => {
    if (!hadith) return;
    const text = `${hadith.arabic}\n\n${hadith.translation}\n\n— ${collection?.name} ${hadith.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${collection?.name} - Hadith ${hadith.id}`, text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    }
  };

  // Not found state
  if (!collection || !chapter || !hadith) {
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

  // Prepare word arrays
  const arabicWords = hadith.arabic.split(" ");
  const transliterationWords = Array.isArray(hadith.transliteration)
    ? hadith.transliteration
    : hadith.transliteration.split(" ");
  const fullTransliteration = getFullTransliteration(hadith);

  const renderWord = (word: string, idx: number) => {
    const wbwTranslation = hadith.wbw?.[idx];
    const wbwTransliteration = transliterationWords[idx];
    const showInlineTranslation = showHadithInlineTranslation && wbwTranslation;
    const showInlineTransliteration = showHadithInlineTransliteration && wbwTransliteration;
    const hasInline = showInlineTranslation || showInlineTransliteration;

    const tooltipContent = (
      <div className="flex flex-col gap-1 p-1">
        {showHadithHoverTranslation && wbwTranslation && (
          <span className="text-foreground">{wbwTranslation}</span>
        )}
        {showHadithHoverTransliteration && wbwTransliteration && (
          <span className="text-muted-foreground text-sm">{wbwTransliteration}</span>
        )}
      </div>
    );

    const showHover = (showHadithHoverTranslation && wbwTranslation) ||
                      (showHadithHoverTransliteration && wbwTransliteration);

    return (
      <div
        key={idx}
        className="flex flex-col items-center"
        style={hasInline ? { minWidth: "2rem" } : undefined}
      >
        {showHover ? (
          <Tooltip content={tooltipContent} enabled={true} side="top" offset={80}>
            <span
              className={`inline-block cursor-pointer transition-colors duration-150 hover:text-green-600 dark:hover:text-green-400
                ${activeTooltip === idx ? "text-green-600 dark:text-green-400" : ""}
              `}
              onMouseEnter={() => setActiveTooltip(idx)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              {word}{" "}
            </span>
          </Tooltip>
        ) : (
          <span className="inline-block">{word}{" "}</span>
        )}

        {hasInline && (
          <div className="flex flex-col items-start gap-y-0.5 mt-1 w-full" dir="ltr">
            {showInlineTranslation && (
              <span
                className="text-black dark:text-white text-left leading-tight"
                style={{ fontSize: toRem(hadithInlineTranslationFontSize, 0.9) }}
              >
                {wbwTranslation}
              </span>
            )}
            {showInlineTransliteration && (
              <span
                className="text-gray-500 dark:text-gray-400 text-left leading-tight"
                style={{ fontSize: toRem(hadithInlineTransliterationFontSize, 0.8) }}
              >
                {wbwTransliteration}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header with collection, hadith number, chapter name, and narrator */}
        <Container className="p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {collection.name} · Hadith {hadith.id}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Chapter: {chapter.name}
              </p>
              {hadith.narrator && (
                <p className="text-sm text-muted-foreground mt-1">
                  Narrated by: <span className="font-medium">{hadith.narrator}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="w-8 h-8 p-0" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" className="w-8 h-8 p-0" onClick={handleShare}>
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
        </Container>

        {/* Hadith content */}
        <Container className="p-6">
          <div
            className="font-arabic leading-loose"
            dir="rtl"
            style={{ fontSize: toRem(hadithArabicFontSize, 1.4), textAlign: "right" }}
          >
            <div className="flex flex-wrap justify-end items-start gap-x-2 gap-y-3">
              {arabicWords.map((word, idx) => renderWord(word, idx))}
            </div>
          </div>

          {showHadithTransliteration && fullTransliteration && (
            <div className="mt-6 pt-4">
              <p
                className="italic text-muted-foreground"
                style={{ fontSize: toRem(hadithTransliterationFontSize, 1.0) }}
              >
                {fullTransliteration}
              </p>
            </div>
          )}

          {showHadithTranslation && (
            <div className="mt-4">
              <p style={{ fontSize: toRem(hadithTranslationFontSize, 1.0) }}>
                {hadith.translation}
              </p>
            </div>
          )}
        </Container>

        {/* Previous / Next navigation */}
        <div className="flex items-center justify-between mt-6 pt-4">
          {prevHadith ? (
            <Link to={`/Hadith/${collection.slug}/${Chapter}/${prevHadith.id}`}>
              <Button className="px-4 py-2 inline-flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Hadith {prevHadith.id}
              </Button>
            </Link>
          ) : (
            <div />
          )}
          {nextHadith && (
            <Link to={`/Hadith/${collection.slug}/${Chapter}/${nextHadith.id}`}>
              <Button className="px-4 py-2 inline-flex items-center gap-2">
                Hadith {nextHadith.id}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Detail;