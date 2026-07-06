import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Textarea } from "@/Component/UI/Textarea";
import { useNotes } from "@/Hook/Use-Notes";
import { useAuth } from "@/Context/Auth";
import { useQuery } from "@tanstack/react-query";
import { Save, Trash2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { useTranslation } from "@/Hook/Use-Translation";
import { ScrollArea } from "@/Component/UI/Scroll-Area";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";
import { useApp } from "@/Context/App";
import { useAudio } from "@/Context/Audio";
import { useBackHandler } from "@/Hook/Use-Back-Handler";
import { WordTooltip, useAudioPlayback } from "../Quran/Layout/Safhah/Utility";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

// Locally explicit structural typing interfaces severed from deprecated server imports
export interface AssembledVerse {
  verseNumber: number;
  arabic: string;
  translation?: string;
  transliteration?: string;
  words: string[];
  wbwTranslation?: string[];
  wbwTranslationHover?: string[];
  wbwTranslationInline?: string[];
}

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahId: number;
  ayahId?: number;
  verse?: AssembledVerse; 
}

export const NotesDialog = memo(function NotesDialog({ 
  open, 
  onOpenChange, 
  surahId, 
  ayahId, 
  verse 
}: NotesDialogProps) {
  const { user } = useAuth();
  const { saveNote, getNote, deleteNote, isLoading } = useNotes();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { hoverTranslation, hoverRecitation, fontSize, quranFont } = useApp();
  const { activeVerse, activeWord, playAyah } = useAudio();
  const { playingKey, playWordAudio, isPlaying } = useAudioPlayback(surahId);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useBackHandler(open, () => onOpenChange(false));

  // Ingest structural database maps over unified reactive query cache
  const { data: corpus } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
    enabled: open && !!user,
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);

  const surah = useMemo(() => {
    if (surahList.length === 0) return null;
    return surahList.find((s: any) => s.id === surahId) || null;
  }, [surahList, surahId]);

  const existingNote = getNote(surahId, ayahId);

  const computedFontClass = (() => {
    switch (quranFont) {
      case "indopak":    return "font-indopak";
      case "uthmani_v1": return "font-uthmani_v1";
      case "uthmani_v2": return "font-uthmani_v2";
      case "uthmani_v4": return "font-uthmani_v4";
      default:           return "font-uthmani";
    }
  })();

  const arabicFontSize = `${(1.5 * fontSize) / 5}rem`;

  useEffect(() => {
    if (open && existingNote) {
      setContent(existingNote.content);
    } else if (open) {
      setContent("");
    }
  }, [open, existingNote]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    const success = await saveNote(surahId, content, ayahId);
    setIsSaving(false);
    if (success) onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!existingNote) return;
    setIsDeleting(true);
    const success = await deleteNote(existingNote.id);
    setIsDeleting(false);
    if (success) {
      setContent("");
      onOpenChange(false);
    }
  };

  if (!open) return null;

  if (!user) {
    setTimeout(() => {
      onOpenChange(false);
    }, 0);
    import("@/Hook/Use-Toast").then(({ toast }) =>
      toast({
        title: "Sign in required",
        description: "Please sign in to save your notes.",
        variant: "destructive",
      })
    );
    return null;
  }

  const renderVerseWithTooltips = () => {
    if (!verse) return null;
    
    return (
      <div className={computedFontClass} style={{ fontSize: arabicFontSize, lineHeight: 1.8 }} dir="rtl">
        {verse.words.map((glyph, idx) => {
          const isVerseEnd = idx === verse.words.length - 1;
          const belongsToVerse = verse.verseNumber;
          const isVerseHighlighted = hoveredVerse !== null && belongsToVerse === hoveredVerse;

          const translation = (!isVerseEnd && verse.wbwTranslation?.[idx]) || undefined;
          const wordKey = `word-${verse.verseNumber}-${idx}`;
          const ayahKey = `ayah-${verse.verseNumber}`;
          const isPlayingAudio = isPlaying(wordKey) || isPlaying(ayahKey);
          const isActive = !isVerseEnd && verse.verseNumber === activeVerse && idx === activeWord;

          let handleClick: (() => void) | undefined;
          if (isVerseEnd) {
            handleClick = () => playAyah(surahId, verse.verseNumber);
          } else {
            handleClick = () => playWordAudio(verse.verseNumber, idx);
          }

          const handleMouseEnter = () => {
            if (isVerseEnd) {
              setHoveredVerse(verse.verseNumber);
            }
          };

          const handleMouseLeave = () => {
            if (isVerseEnd) {
              setHoveredVerse(null);
            }
          };

          let className = "inline select-text transition-colors duration-200 ";
          if (isVerseHighlighted && !isVerseEnd) {
            className += "text-primary";
          } else if (isActive) {
            className += "text-foreground animate-pulse";
          } else if (isPlayingAudio) {
            className += "text-primary animate-pulse";
          } else if (isVerseEnd) {
            className += "text-muted-foreground hover:text-primary cursor-pointer";
          } else {
            className += "text-foreground hover:text-primary";
          }

          let cursorStyle = "text";
          if (isVerseEnd) {
            cursorStyle = "pointer";
          } else if (hoverRecitation) {
            cursorStyle = "pointer";
          }

          return (
            <WordTooltip
              key={idx}
              translation={translation}
              enabled={hoverTranslation}
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <span
                className={className}
                style={{ cursor: cursorStyle }}
                onClick={handleClick}
              >
                {glyph}{' '}
              </span>
            </WordTooltip>
          );
        })}
      </div>
    );
  };

  const renderContent = () => (
    <div className="space-y-4">
      {verse && (
        <Container className="!py-4 !px-5">
          {renderVerseWithTooltips()}
        </Container>
      )}

      <div className="space-y-2">
        <Container className="!p-0 overflow-hidden">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Use this space to save general notes, or to write a reflection..."
            className="min-h-[200px] resize-none bg-transparent border-0 p-4 focus:outline-none focus:ring-0"
          />
        </Container>
      </div>

      <div className="flex items-center justify-between pt-4">
        {existingNote ? (
          <Button 
            variant="secondary" 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t.common.delete}
          </Button>
        ) : <div />}
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !content.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          {t.common.save} Privately
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-40 bg-background pt-12 md:pt-16">
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
          <div className="px-2 sm:px-4 pb-6">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background pt-12 md:pt-16">
      <ScrollArea className="h-full" ref={scrollRef}>
        <div className="px-2 sm:px-4 pb-6">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
});