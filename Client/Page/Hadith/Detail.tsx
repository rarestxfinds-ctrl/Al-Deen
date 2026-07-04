import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query"; // 🌟 Swapped to standard react-query
import { Layout } from "Client/Component/Layout/Index";
import { Copy, Share2, BookmarkPlus, Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "Client/Context/App";
import { useBookmarks } from "Client/Hook/Use-Bookmarks";
import { useAuth } from "Client/Context/Auth";
import { useTranslation } from "Client/Hook/Use-Translation";
import { toast } from "Client/Hook/Use-Toast";
import { Container } from "Client/Component/UI/Container";
import { Button } from "Client/Component/UI/Button";
import { Tooltip } from "Client/Component/UI/Tooltip";
import { ShareDialog } from "Client/Component/Dialog/Share";
import { useState } from "react";

// Fetch utility routing requests to your backend Express server
async function fetchCorpusFromBackend() {
  const response = await fetch("http://localhost:8081/api/hadith-corpus");
  if (!response.ok) throw new Error("Failed to load backend corpus data");
  return response.json();
}

const Detail = () => {
  const { Collection, Chapter, HadithId } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
  const {
    showHadithTranslation,
    showHadithHoverTranslation,
    hadithArabicFontSize,
    hadithTranslationFontSize,
  } = useApp();

  const [shareOpen, setShareOpen] = useState(false);

  // 🌟 Direct connection to Node Server via useQuery
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["hadithCorpusBackend"],
    queryFn: fetchCorpusFromBackend,
    staleTime: 1000 * 60 * 15,
  });

  const toRem = (size: number, base = 1.2) => `${(base * size) / 5}rem`;

  if (isLoading) {
    return (
      <Layout>
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading Hadith details...
        </div>
      </Layout>
    );
  }

  const collection = corpus?.collections?.find(
    (c: any) => c.slug.toLowerCase() === Collection?.toLowerCase()
  );
  const chapter = collection?.chapters?.find((ch: any) => ch.id === Chapter);
  const hadithIdStr = HadithId ?? "";
  const hadith = chapter?.hadiths?.find((h: any) => h.id === hadithIdStr);

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

  const arabicText = hadith.ar || hadith.arabic || "";
  const englishText = hadith.en || hadith.text || hadith.translation || "";

  const currentIndex = chapter.hadiths.findIndex((h: any) => h.id === hadithIdStr);
  const prevHadith = currentIndex > 0 ? chapter.hadiths[currentIndex - 1] : null;
  const nextHadith = currentIndex !== -1 && currentIndex < chapter.hadiths.length - 1
    ? chapter.hadiths[currentIndex + 1]
    : null;

  const isBookmarked = bookmarks.some(b => b.surah_id === 0 && b.ayah_id === hadith.id);
  const getBookmarkId = () => bookmarks.find(b => b.surah_id === 0 && b.ayah_id === hadith.id)?.id;

  const handleBookmark = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to bookmark hadith" });
      return;
    }
    if (isBookmarked) {
      const id = getBookmarkId();
      if (id) await removeBookmark(id);
    } else {
      await addBookmark(0, hadith.id, `Hadith ${hadith.id} - ${chapter.name}`);
    }
  };

  const handleCopy = () => {
    const text = `${arabicText}\n\n${englishText}\n\n— ${collection.name} ${hadith.id}`;
    navigator.clipboard.writeText(text);
    toast({ title: t.quran.copy, description: "Hadith copied to clipboard" });
  };

  const arabicWords = arabicText.split(" ");

  const renderWord = (word: string, idx: number) => {
    const wbwTranslation = hadith.wbw?.[idx];
    
    const tooltipContent = (
      <div className="flex flex-col gap-1 p-1" dir="ltr">
        <span className="text-foreground">{wbwTranslation}</span>
      </div>
    );

    return (
      <span key={idx} className="inline">
        {wbwTranslation ? (
          <Tooltip content={tooltipContent} enabled={true} side="top" offset={80}>
            <span className="cursor-pointer transition-colors duration-150 hover:text-emerald-600">
              {word}
            </span>
          </Tooltip>
        ) : (
          word
        )}
        {" "}
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
                {collection.name} - {chapter.name} - {hadith.id}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {showHadithTranslation && englishText && (
              <div className="order-2 lg:order-1 mt-2 lg:mt-0" dir="ltr">
                <p
                  className="text-justify leading-relaxed text-muted-foreground dark:text-neutral-200"
                  style={{ fontSize: toRem(hadithTranslationFontSize, 1.0) }}
                >
                  {englishText}
                </p>
              </div>
            )}

            {arabicText && (
              <div
                className="order-1 lg:order-2 leading-loose text-justify"
                dir="rtl"
                style={{ 
                  fontFamily: "'KFGQPC-Uthmani', sans-serif",
                  fontSize: toRem(hadithArabicFontSize, 1.4), 
                  textAlign: "justify",
                  textJustify: "inter-word"
                }}
              >
                {showHadithHoverTranslation ? (
                  arabicWords.map((word, idx) => renderWord(word, idx))
                ) : (
                  arabicText
                )}
              </div>
            )}
          </div>
        </Container>

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
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        surahId={0}
        ayahId={hadith.id}
        verseText={arabicText}
        translation={englishText}
      />
    </Layout>
  );
};

export default Detail;