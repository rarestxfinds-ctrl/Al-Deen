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
// Client-Side Hizb Segment Parser
// ============================================================================
function parseClientHizbSegments(hizbMapEntry: string | undefined): any[] | null {
  if (!hizbMapEntry) return null;
  
  const segments = hizbMapEntry.split('|');
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

export default function Hizb() {
  const { id: hizbParam } = useParams<{ id: string }>();
  const hizbNumber = parseInt(hizbParam || "1", 10);

  // Ingest entire data block from the distributed backend network cache
  const { data: corpus, isLoading: isCorpusLoading, error } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // Keep cached client-side for 30 minutes
  });

  const { isPlaying, isLoading: isAudioLoading, playAyah, togglePlayPause, stop } = useAudio();
  const [showAudio, setShowAudio] = useState(false);

  // Extract structural segments array safely from backend data
  const hizbSegments = useMemo(() => {
    if (!corpus?.hizbMap) return null;
    const rawHizbData = corpus.hizbMap[hizbNumber - 1];
    return parseClientHizbSegments(rawHizbData);
  }, [corpus, hizbNumber]);

  // Resolve metadata out of the incoming payload array map
  const firstSurahName = useMemo(() => {
    if (!corpus?.surahs || !hizbSegments?.[0]) return "";
    const targetId = hizbSegments[0].surah;
    const found = corpus.surahs.find((s: any) => s.id === targetId);
    return found ? found.englishNameTransliteration || found.englishName : "";
  }, [corpus, hizbSegments]);

  const handlePlay = () => {
    if (!hizbSegments || !hizbSegments[0]) return;
    setShowAudio(true);
    if (isPlaying) {
      togglePlayPause();
    } else {
      const first = hizbSegments[0];
      playAyah(first.surah, first.startVerse);
    }
  };

  if (isCorpusLoading) {
    return (
      <Layout hideFooter>
        <div className="w-full h-48 flex items-center justify-center animate-pulse">
          <p className="text-sm text-muted-foreground">Streaming Hizb structural models...</p>
        </div>
      </Layout>
    );
  }

  if (error || !hizbSegments) {
    return (
      <Layout hideFooter>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load Hizb {hizbNumber}. Please verify backend server state.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="w-full max-w-[19em] mx-auto pt-0 px-0">
        <Container className="!px-6 !py-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Hizb {hizbNumber}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Juz {Math.ceil(hizbNumber / 2)} • Part {hizbNumber % 2 === 1 ? "1" : "2"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handlePlay}
            disabled={isAudioLoading}
            aria-label={isPlaying ? "Pause Hizb" : "Play Hizb"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </Container>
        <SegmentRenderer segments={hizbSegments} />
      </div>

      <AudioPlayer
        isVisible={showAudio}
        onClose={() => {
          stop();
          setShowAudio(false);
        }}
        surahId={hizbSegments[0]?.surah}
        surahName={firstSurahName}
      />
    </Layout>
  );
}