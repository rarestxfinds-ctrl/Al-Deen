import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Layout } from "@/Component/Layout/Index";
import { AlertCircle, Play, Pause } from "lucide-react";
import { Alert, AlertDescription } from "@/Component/UI/Alert";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";
import { SegmentRenderer } from "@/Component/Quran/Segment-Renderer";
import { AudioPlayer } from "@/Component/Audio-Player/Index";
import { useAudio } from "@/Context/Audio";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Network Fetch Client Handler
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

// ============================================================================
// Client-Side Juz Segment Parser
// ============================================================================
function parseClientJuzSegments(juzMapEntry: string | undefined): any[] | null {
  if (!juzMapEntry) return null;
  
  const segments = juzMapEntry.split('|');
  const result: any[] = [];
  
  for (const segment of segments) {
    const [start, end] = segment.split('-');
    if (!start || !end) continue;
    
    const [startSurah, startVerse] = start.split(':').map(Number);
    const [endSurah, endVerse] = end.split(':').map(Number);
    
    result.push({
      surah: startSurah,
      startVerse,
      endSurah,
      endVerse
    });
  }
  
  return result.length > 0 ? result : null;
}

export default function Juz() {
  const { id: juzParam } = useParams<{ id: string }>();
  const juzNumber = parseInt(juzParam || "1", 10);

  // Ingest entire data block from the distributed backend network cache
  const { data: corpus, isLoading: isCorpusLoading, error } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // Keep cached client-side for 30 minutes
  });

  const { isPlaying, isLoading: isAudioLoading, playAyah, togglePlayPause, stop } = useAudio();
  const [showAudio, setShowAudio] = useState(false);

  // Extract structural segments array safely from backend data string maps
  const juzSegments = useMemo(() => {
    if (!corpus?.juzMap) return null;
    const rawJuzData = corpus.juzMap[juzNumber - 1];
    return parseClientJuzSegments(rawJuzData);
  }, [corpus, juzNumber]);

  // Resolve metadata out of the incoming payload array map
  const firstSurahName = useMemo(() => {
    if (!corpus?.surahs || !juzSegments?.[0]) return "";
    const targetId = juzSegments[0].surah;
    const found = corpus.surahs.find((s: any) => s.id === targetId);
    return found ? found.englishNameTransliteration || found.englishName : "";
  }, [corpus, juzSegments]);

  const handlePlay = () => {
    if (!juzSegments || !juzSegments[0]) return;
    setShowAudio(true);
    if (isPlaying) {
      togglePlayPause();
    } else {
      const first = juzSegments[0];
      playAyah(first.surah, first.startVerse);
    }
  };

  if (isCorpusLoading) {
    return (
      <Layout hideFooter>
        <div className="w-full h-48 flex items-center justify-center animate-pulse">
          <p className="text-sm text-muted-foreground">Streaming Juz structural models...</p>
        </div>
      </Layout>
    );
  }

  if (error || !juzSegments) {
    return (
      <Layout hideFooter>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load Juz {juzNumber}. Please verify backend server state.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="w-full max-w-[19em] mx-auto pt-0 px-0">
        <Container className="!px-6 !py-4 mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">Juz {juzNumber}</h1>
          <Button
            size="sm"
            onClick={handlePlay}
            disabled={isAudioLoading}
            aria-label={isPlaying ? "Pause Juz" : "Play Juz"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </Container>
        <SegmentRenderer segments={juzSegments} />
      </div>

      <AudioPlayer
        isVisible={showAudio}
        onClose={() => {
          stop();
          setShowAudio(false);
        }}
        surahId={juzSegments[0]?.surah}
        surahName={firstSurahName}
      />
    </Layout>
  );
}