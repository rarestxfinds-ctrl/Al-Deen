import { useRef, memo, useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { BookOpen, MapPin, FileText, Calendar, Hash } from "lucide-react";
import { surahList } from "@/Bottom/API/Quran";
import { useIsMobile } from "@/Middle/Hook/Use-Mobile";
import { ScrollArea } from "@/Top/Component/UI/Scroll-Area";
import { Container } from "@/Top/Component/UI/Container";
import { useApp } from "@/Middle/Context/App";

interface ChapterInfo {
  chapter_id: number;
  text: string;
  source: string;
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
  const surah = surahList.find((s) => s.id === surahId);

  const { surahInfoProvider, surahInfoTextSize } = useApp();

  const [chapterInfo, setChapterInfo] = useState<ChapterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && surahId) {
      setIsLoading(true);
      import(`@/Bottom/Data/Quran/Surah/Info/${surahInfoProvider}/${surahId}.json`)
        .then((module) => {
          const data = module.default;
          if (Array.isArray(data) && data.length >= 2) {
            setChapterInfo({ chapter_id: surahId, text: data[0], source: data[1] });
          } else if (data && typeof data === "object" && data.text) {
            setChapterInfo({ chapter_id: data.chapter_id || surahId, text: data.text, source: data.source || "" });
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error(`Error loading surah info for ${surahId} from ${surahInfoProvider}:`, error);
          setIsLoading(false);
        });
    }
  }, [open, surahId, surahInfoProvider]);

  if (!open || !surah) return null;

  const getTextSizeClass = () => {
    switch (surahInfoTextSize) {
      case 2: return "text-xs";
      case 3: return "text-sm";
      case 4: return "text-base";
      case 5: return "text-lg";
      default: return "text-sm";
    }
  };

  const renderContent = () => (
    <div className="space-y-6">
      {/* Overview Card */}
      <Container className="!py-6 !px-6 text-center">
        <p className="font-surah text-4xl mb-4 text-primary">{surah.surahFontName}</p>
        <p className="text-xl font-semibold group-hover:text-white dark:group-hover:text-black">{surah.englishName}</p>
        <p className="text-sm text-muted-foreground mt-1 group-hover:text-white/70 dark:group-hover:text-black/70">{surah.englishNameTranslation}</p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="p-3 rounded-[40px] bg-muted/30 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
            <Hash className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Surah</p>
            <p className="font-semibold group-hover:text-white dark:group-hover:text-black">{String(surahId).padStart(3, '0')}</p>
          </div>
          <div className="p-3 rounded-[40px] bg-muted/30 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
            <FileText className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Verses</p>
            <p className="font-semibold group-hover:text-white dark:group-hover:text-black">{surah.numberOfAyahs}</p>
          </div>
          <div className="p-3 rounded-[40px] bg-muted/30 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
            <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Revealed</p>
            <p className="font-semibold group-hover:text-white dark:group-hover:text-black">{surah.revelationType === "Meccan" ? "Makkah" : "Madinah"}</p>
          </div>
          <div className="p-3 rounded-[40px] bg-muted/30 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
            <Calendar className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Order</p>
            <p className="font-semibold group-hover:text-white dark:group-hover:text-black">{surahId}{getOrdinalSuffix(surahId)}</p>
          </div>
        </div>
      </Container>

      {/* Detailed Info – no skeletons */}
      {isLoading ? (
        <Container className="!py-5 !px-6 text-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </Container>
      ) : chapterInfo ? (
        <Container className="!py-5 !px-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2 group-hover:text-white dark:group-hover:text-black">
              <BookOpen className="h-5 w-5 text-primary" />About this Surah
            </h2>
            <div
              className={`prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed group-hover:text-white/80 dark:group-hover:text-black/80 ${getTextSizeClass()}`}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapterInfo.text) }}
            />
            {chapterInfo.source && (
              <p className={`text-xs text-muted-foreground mt-6 pt-4 border-t border-border/50 group-hover:text-white/70 dark:group-hover:text-black/70 ${getTextSizeClass()}`}>
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

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-40 bg-background pt-[72px]">
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background pt-[72px]">
      <ScrollArea className="h-full" ref={scrollRef}>
        <div className="p-6 mx-auto max-w-2xl">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
});