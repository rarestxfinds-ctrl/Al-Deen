import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GuessGame, BoardItem } from "./Game";

// ============================================================================
// Network Fetch Client Handler
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

export default function GuessSurahIndex() {
  // Ingest entire data block cleanly from the distributed backend network cache
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // Cache client-side for 30 minutes
  });

  // Dynamically assemble the game board items array once data streams in
  const surahs = useMemo<BoardItem[]>(() => {
    if (!corpus?.surahs || !Array.isArray(corpus.surahs)) return [];

    return corpus.surahs.map((surah: any) => {
      const name = surah.englishNameTransliteration || `Surah ${surah.id}`;
      const meaning = surah.englishNameTranslation || "";
      
      return {
        id: `surah-${surah.id - 1}`,
        name,
        rawFacts: [
          meaning,
          `translated meaning is ${meaning}`,
          `index position is ${surah.id}`
        ]
      };
    });
  }, [corpus]);

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center animate-pulse">
        <p className="text-sm text-muted-foreground">Streaming game deck configurations...</p>
      </div>
    );
  }

  return <GuessGame deckItems={surahs} gameType="Surah" />;
}