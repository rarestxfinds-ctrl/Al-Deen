import { useRef, memo, useMemo } from "react";
import DOMPurify from "dompurify";
import { BookOpen, MapPin, FileText, Calendar, Hash } from "lucide-react";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { ScrollArea } from "@/Component/UI/Scroll-Area";
import { Container } from "@/Component/UI/Container";
import { useApp } from "@/Context/App";
import { useBackHandler } from "@/Hook/Use-Back-Handler";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Network Fetch Client Handler
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface SurahInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahId: number;
}

export const SurahInfoDialog = memo(function SurahInfoDialog({ open, onOpenChange, surahId }: SurahInfoDialogProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  useBackHandler(open, () => onOpenChange(false));

  const { surahInfoTextSize } = useApp();

  // 🌟 Ingest entire data block cleanly from the distributed backend network cache
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // Cache client-side for 30 minutes
    enabled: open,            // Only trigger request over the wire if modal context is active
  });

  // Resolve target surah metadata directly out of the incoming payload array map
  const surah = useMemo(() => {
    if (!corpus?.surahs) return null;
    return corpus.surahs.find((s: any) => s.id === surahId) || null;
  }, [corpus, surahId]);

  // Derive chapter text information directly from server-side generated payload values
  const chapterInfo = useMemo(() => {
    if (!surah) return null;
    
    // Fallback translation or description content mapped directly on the compiled corpus model
    return {
      chapter_id: surah.id,
      text: surah.englishNameTranslation || "No descriptive summary compiled for this Chapter entry.",
      source: "Clear Quran / Combined Corpus Pipeline"
    };
  }, [surah]);

  if (!open) return null;

  const getTextSizeClass = () => {
    switch (surahInfoTextSize) {
      case 2: return "text-xs";
      case 3: return "text-sm";
      case 4: return "text-base";
      case 5: return "text-lg";
      default: return "text-sm";
    }
  };

  const renderContent = () => {
    if (isLoading || !surah) {
      return (
        <Container className="!py-5 !px-6 text-center animate-pulse">
          <p className="text-sm text-muted-foreground">Streaming metadata corpus...</p>
        </Container>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview Card */}
        <Container className="!py-6 !px-6 text-center">
          <p className="font-surah text-4xl mb-4 text-primary">{surah.surahFontName}</p>
          <p className="text-xl font-semibold [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
            {surah.englishNameTransliteration || "Surah Asset"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 [.high-contrast_&]:group-hover:text-white/70 [.high-contrast_&]:dark:group-hover:text-black/70">
            {surah.englishNameTranslation}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="p-3 rounded-[40px] bg-muted/30 [.high-contrast_&]:group-hover:bg-black/10 [.high-contrast_&]:dark:group-hover:bg-white/10 transition-colors">
              <Hash className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Surah</p>
              <p className="font-semibold [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {String(surahId).padStart(3, '0')}
              </p>
            </div>
            <div className="p-3 rounded-[40px] bg-muted/30 [.high-contrast_&]:group-hover:bg-black/10 [.high-contrast_&]:dark:group-hover:bg-white/10 transition-colors">
              <FileText className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Verses</p>
              <p className="font-semibold [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {surah.numberOfAyahs}
              </p>
            </div>
            <div className="p-3 rounded-[40px] bg-muted/30 [.high-contrast_&]:group-hover:bg-black/10 [.high-contrast_&]:dark:group-hover:bg-white/10 transition-colors">
              <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Revealed</p>
              <p className="font-semibold [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {surah.revelationType === "Meccan" ? "Makkah" : "Madinah"}
              </p>
            </div>
            <div className="p-3 rounded-[40px] bg-muted/30 [.high-contrast_&]:group-hover:bg-black/10 [.high-contrast_&]:dark:group-hover:bg-white/10 transition-colors">
              <Calendar className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Order</p>
              <p className="font-semibold [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {surah.revelationOrder}{getOrdinalSuffix(surah.revelationOrder)}
              </p>
            </div>
          </div>
        </Container>

        {/* Detailed Info */}
        {chapterInfo ? (
          <Container className="!py-5 !px-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2 [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                <BookOpen className="h-5 w-5 text-primary" />About this Surah
              </h2>
              <div
                className={`prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed [.high-contrast_&]:group-hover:text-white/80 [.high-contrast_&]:dark:group-hover:text-black/80 ${getTextSizeClass()}`}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapterInfo.text) }}
              />
              {chapterInfo.source && (
                <p className={`text-xs text-muted-foreground mt-6 pt-4 border-t border-border/50 [.high-contrast_&]:group-hover:text-white/70 [.high-contrast_&]:dark:group-hover:text-black/70 ${getTextSizeClass()}`}>
                  Source: {chapterInfo.source}
                </p>
              )}
            </div>
          </Container>
        ) : (
          <Container className="!py-5 !px-6">
            <p className="text-muted-foreground text-center">No additional information available.</p>
          </Container>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-40 bg-background">
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-4 pt-[72px]">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <ScrollArea className="h-full" ref={scrollRef}>
        <div className="p-6 pt-[72px] mx-auto max-w-2xl">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
});