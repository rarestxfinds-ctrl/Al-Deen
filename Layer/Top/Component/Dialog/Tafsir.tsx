import { useRef, useState, memo, useEffect } from "react";
import DOMPurify from "dompurify";
import { Skeleton } from "@/Top/Component/UI/Skeleton";
import { ScrollArea } from "@/Top/Component/UI/Scroll-Area";
import { Container } from "@/Top/Component/UI/Container";
import { Button } from "@/Top/Component/UI/Button";
import { 
  ChevronLeft, ChevronRight, 
  AlertCircle, BookOpen 
} from "lucide-react";
import { useIsMobile } from "@/Middle/Hook/Use-Mobile";
import { useApp } from "@/Middle/Context/App";

// ============== TYPES ==============
interface TafsirDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahId: number;
  verseNumber?: number;
  totalVerses?: number;
}

// ============== HELPER TO LOAD CUSTOM TAFSIR ==============
async function fetchCustomTafsir(
  provider: string,
  surahId: number,
  verseNumber: number
): Promise<string | null> {
  try {
    // Dynamic import: /{provider}/{surahId}/{verseNumber}.json
    const tafsirModule = await import(
      `@/Bottom/Data/Quran/Surah/Tafsir/${provider}/${surahId}/${verseNumber}.json`
    );
    const data = tafsirModule.default;
    
    // Handle string format
    if (typeof data === 'string') {
      return data;
    }
    
    // Handle array format where first element is the text
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error loading tafsir for ${provider}/${surahId}:${verseNumber}`, error);
    return null;
  }
}

// ============== MAIN COMPONENT ==============
export const TafsirDialog = memo(function TafsirDialog({
  open,
  onOpenChange,
  surahId,
  verseNumber = 1,
  totalVerses,
}: TafsirDialogProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tafsirProvider, tafsirTextSize } = useApp();
  
  const [currentVerse, setCurrentVerse] = useState(verseNumber);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [isLoadingTafsir, setIsLoadingTafsir] = useState(false);
  const [tafsirError, setTafsirError] = useState<string | null>(null);

  // Reset current verse when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentVerse(verseNumber);
    }
  }, [open, verseNumber, surahId]);

  // Fetch tafsir when verse changes or provider changes
  useEffect(() => {
    if (open && tafsirProvider) {
      setIsLoadingTafsir(true);
      setTafsirError(null);
      
      fetchCustomTafsir(tafsirProvider, surahId, currentVerse)
        .then((text) => {
          setTafsirText(text);
          setIsLoadingTafsir(false);
        })
        .catch((error) => {
          console.error("Error loading tafsir:", error);
          setTafsirError("Failed to load Tafsir");
          setIsLoadingTafsir(false);
        });
    }
  }, [open, tafsirProvider, surahId, currentVerse]);

  const goToPreviousVerse = () => {
    if (currentVerse > 1) {
      setCurrentVerse((prev) => prev - 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToNextVerse = () => {
    if (!totalVerses || currentVerse < totalVerses) {
      setCurrentVerse((prev) => prev + 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  // Map text size to Tailwind classes
  const getTextSizeClass = () => {
    switch (tafsirTextSize) {
      case 2: return "text-xs";
      case 3: return "text-sm";
      case 4: return "text-base";
      case 5: return "text-lg";
      default: return "text-sm";
    }
  };

  if (!open) return null;

  const renderContent = () => (
    <div className="space-y-6">
      {/* Verse Navigation */}
      <Container className="!py-3 !px-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousVerse}
            disabled={currentVerse <= 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Verse {currentVerse} {totalVerses ? `/ ${totalVerses}` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextVerse}
            disabled={totalVerses ? currentVerse >= totalVerses : false}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Container>

      {/* Tafsir Content */}
      <Container className="!py-5 !px-6">
        {isLoadingTafsir ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : tafsirError ? (
          <div className="text-center py-8 text-destructive flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            <p>{tafsirError}</p>
          </div>
        ) : tafsirText ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Commentary by {tafsirProvider}
            </h3>
            <div
              className={`prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap ${getTextSizeClass()}`}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tafsirText) }}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No Tafsir available for this verse from {tafsirProvider}.</p>
          </div>
        )}
      </Container>
    </div>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 z-40 bg-background"
        onClick={handleBackdropClick}
      >
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain pt-12"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div 
      className="fixed inset-0 z-50 bg-background"
      onClick={handleBackdropClick}
    >
      <ScrollArea className="h-full" ref={scrollRef}>
        <div className="p-6 pt-12 mx-auto max-w-2xl">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
});