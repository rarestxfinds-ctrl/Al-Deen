import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { useArabicBookmarks } from "@/Hook/Use-Arabic-Bookmarks";
import { useTranslation } from "@/Hook/Use-Translation";
import { Bookmark, BookmarkCheck, Volume2 } from "lucide-react";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function ArabicWordPage() {
  const { vocabId, categoryId, subId, wordId } = useParams<{
    vocabId: string;
    categoryId: string;
    subId: string;
    wordId: string;
  }>();

  const bookmarkKey = `${vocabId}/${categoryId}/${subId}/${wordId}`;
  const { isBookmarked, toggle } = useArabicBookmarks();
  const { isRtl } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  // Use React Query to manage the asset lifecycle smoothly and read from cache if available
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <Container className="w-full !rounded-[48px] p-8 text-center">
          <p className="text-muted-foreground animate-pulse">Loading word details...</p>
        </Container>
      </Layout>
    );
  }

  // Deep structural search across the precompiled vocabulary slice inside the corpus
  let word: any = null;
  if (Array.isArray(corpus?.arabicVocabulary)) {
    // Traverse targeting either a parent wrapper or the direct root list array matching the utility definitions
    const mainVocab = corpus.arabicVocabulary.find((v: any) => v.id === "Arabic");
    const subCategories = mainVocab?.subcategories || corpus.arabicVocabulary;

    const targetCategory = subCategories.find((c: any) => c.id === categoryId);
    const targetSub = targetCategory?.subcategories?.find((s: any) => s.id === subId);
    if (targetSub?.words) {
      word = targetSub.words.find((w: any) => w.id === wordId);
    }
  }

  if (!word) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-8">
          <p className="text-muted-foreground">Word not found</p>
          <Link to={`/Aid/Arabic/${vocabId}/${categoryId}/${subId}`}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const playAudio = () => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(word.arabic);
    utter.lang = "ar-SA";
    utter.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const L = isRtl
    ? { translation: "الترجمة", transliteration: "النقحرة", definition: "التعريف", root: "الجذر" }
    : { translation: "Translation", transliteration: "Transliteration", definition: "Definition", root: "Root" };

  return (
    <Layout>
      <Container className="w-full !rounded-[48px] p-8 space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={playAudio}
            aria-label="Play pronunciation"
            title="Play pronunciation"
            className="w-9 h-9 p-0 rounded-full"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggle(bookmarkKey)}
            aria-label="Bookmark"
            className="w-9 h-9 p-0 rounded-full"
          >
            {isBookmarked(bookmarkKey) ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>

        <button
          onClick={() => setRevealed((r) => !r)}
          className={`w-full block cursor-pointer select-none transition-all ${
            revealed ? "text-left" : "text-center"
          }`}
          aria-label="Reveal details"
        >
          <span
            className="font-arabic text-6xl md:text-7xl inline-block hover:text-emerald-600 transition-colors"
            dir="rtl"
          >
            {word.arabic}
          </span>
        </button>

        {revealed && (
          <div className="space-y-4 border-t border-border pt-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{L.translation}</p>
              <p className="text-2xl font-semibold">{word.english}</p>
            </div>
            {word.transliteration && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{L.transliteration}</p>
                <p className="text-base italic">{word.transliteration}</p>
              </div>
            )}
            {word.definition && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{L.definition}</p>
                <p className="text-base leading-relaxed">{word.definition}</p>
              </div>
            )}
            {word.root && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{L.root}</p>
                <p className="text-base font-mono tracking-wider">{word.root}</p>
              </div>
            )}
          </div>
        )}
      </Container>
    </Layout>
  );
}