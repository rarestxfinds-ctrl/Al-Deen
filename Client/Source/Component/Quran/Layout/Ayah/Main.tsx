// @/Component/Quran/Layout/Safhah/Ayah/Main.tsx
import { Copy, MoreHorizontal, Bookmark, FileText, Share2, BookMarked, BookOpen, Video, Code2 } from "lucide-react";
import { cn } from "@/Library/utils";
import { useBookmarks } from "@/Hook/Use-Bookmarks";
import { useAuth } from "@/Context/Auth";
import { useTranslation } from "@/Hook/Use-Translation";
import { toast } from "@/Hook/Use-Toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/Component/UI/Dropdown-Menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Component/UI/tooltip";
import { useAudio } from "@/Context/Audio";
import { useApp } from "@/Context/App";
import { WordTooltip, useAudioPlayback } from "../Safhah/Utility";
import { useState, useMemo } from "react";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";
import { useQuery } from "@tanstack/react-query";
import type { VerseCardProps } from "../Types";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

export function VerseCard({
  verse,
  surah,
  showArabicText,
  verseTranslation,
  translationFontSize,
  transliterationFontSize = "0.875rem",
  showTransliteration = false,
  isHighlighted,
  verseRef,
  onNotesClick,
  onShareClick,
  onTafsirClick,
  onEmbedClick,
  onRenderClick,
  hoverTransliteration,
  inlineTransliteration,
  inlineTranslation,
}: VerseCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addBookmark, removeBookmark, isBookmarked, getBookmarkId } = useBookmarks();
  const { playAyah, activeVerse, activeWord } = useAudio();
  const { hoverTranslation, hoverRecitation, fontSize, quranFont } = useApp();
  const { playingKey, playWordAudio, isPlaying } = useAudioPlayback(surah.id);

  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);

  // Ingest structural segment maps natively using query cache matching patterns
  const { data: corpus } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
  });

  const pageSegmentsMap = useMemo(() => corpus?.pageSegments || [], [corpus]);

  // --------------- Dynamic Font Stack Parser Engine ---------------
  const pageFontFamily = useMemo(() => {
    if (quranFont === "uthmani_v1" || quranFont === "uthmani_v2" || quranFont === "uthmani_v4") {
      const version = quranFont === "uthmani_v1" ? "1" : quranFont === "uthmani_v2" ? "2" : "4";
      const surahPages = surah.pages;
      if (!surahPages) return `Uthmani-V${version}`;

      for (let pageNum = surahPages[0]; pageNum <= surahPages[1]; pageNum++) {
        const segments = pageSegmentsMap?.[pageNum];
        if (segments) {
          const surahSegment = segments.find((seg: any) => seg.surah === surah.id);
          if (
            surahSegment &&
            verse.verseNumber >= surahSegment.startVerse &&
            verse.verseNumber <= surahSegment.endVerse
          ) {
            return `Uthmani-V${version}-${pageNum}`;
          }
        }
      }
      return `Uthmani-V${version}`;
    }

    if (quranFont === "indopak") return "IndoPak";
    return "Uthmani";
  }, [quranFont, surah, verse.verseNumber, pageSegmentsMap]);
  // ------------------------------------------------------------

  const isTooltipEnabled = useMemo(() => {
    const hasTranslation = hoverTranslation !== "None" && hoverTranslation !== false;
    const hasTransliteration = hoverTransliteration !== "None";
    return hasTranslation || hasTransliteration;
  }, [hoverTranslation, hoverTransliteration]);

  const computedFontClass = useMemo(() => {
    switch (quranFont) {
      case "indopak":    return "font-indopak";
      case "uthmani_v1": return "font-uthmani_v1";
      case "uthmani_v2": return "font-uthmani_v2";
      case "uthmani_v4": return "font-uthmani_v4";
      default:           return "font-uthmani";
    }
  }, [quranFont]);

  const arabicFontSize = useMemo(() => `${(1.5 * fontSize) / 5}rem`, [fontSize]);

  const getTransliterationText = useMemo(() => {
    if (!showTransliteration) return null;
    if (verse.wbwTransliteration && verse.wbwTransliteration.length > 0) {
      return verse.wbwTransliteration.join(" ");
    }
    return verse.transliteration || null;
  }, [verse.wbwTransliteration, verse.transliteration, showTransliteration]);

  const handleBookmark = async () => {
    const bookmarked = isBookmarked(surah.id, verse.verseNumber);
    if (bookmarked) {
      const bookmarkId = getBookmarkId(surah.id, verse.verseNumber);
      if (bookmarkId) await removeBookmark(bookmarkId);
    } else {
      await addBookmark(surah.id, verse.verseNumber);
    }
  };

  const copyVerse = async () => {
    let text = `${verse.arabic}\n\n`;
    if (showTransliteration && getTransliterationText) {
      text += `${getTransliterationText}\n\n`;
    }
    text += `${verse.translation}\n\n- ${surah.englishName} ${surah.id}:${verse.verseNumber}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Container 
      ref={verseRef} 
      className={cn(isHighlighted && "ring-2 ring-primary")}
    >
      <div className="pt-4 px-6 sm:px-8 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => playAyah(surah.id, verse.verseNumber)}
            onMouseEnter={() => setHoveredVerse(verse.verseNumber)}
            onMouseLeave={() => setHoveredVerse(null)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {surah.id}:{verse.verseNumber}
          </button>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="p-1.5 rounded-lg" onClick={copyVerse}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t.quran.copy}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm"
                    className="p-1.5 rounded-lg"
                    onClick={() => {
                      if (!user) {
                        toast({ title: "Sign in required", description: "Please sign in to bookmark verses" });
                        return;
                      }
                      handleBookmark();
                    }}
                  >
                    {isBookmarked(surah.id, verse.verseNumber)
                      ? <BookMarked className="h-4 w-4 fill-current" />
                      : <Bookmark className="h-4 w-4" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t.quran.bookmark}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="p-1.5 rounded-lg" onClick={onTafsirClick}>
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Tafsir</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="p-1.5 rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[100]">
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onNotesClick}>
                    <FileText className="h-4 w-4" />
                    {t.quran.myNotes}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onShareClick}>
                    <Share2 className="h-4 w-4" />
                    {t.quran.share}
                  </DropdownMenuItem>
                  {onRenderClick && (
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onRenderClick}>
                      <Video className="h-4 w-4" />
                      Render Ayah
                    </DropdownMenuItem>
                  )}
                  {onEmbedClick && (
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onEmbedClick}>
                      <Code2 className="h-4 w-4" />
                      Embed Ayah
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </div>

        {showArabicText && (() => {
          const showInlineTranslation = inlineTranslation && inlineTranslation !== "None";
          const showInlineTransliteration = inlineTransliteration && inlineTransliteration !== "None";
          const anyInline = showInlineTranslation || showInlineTransliteration;

          const wordNodes = verse.words.map((glyph, idx) => {
            const isVerseEnd = idx === verse.words.length - 1;
            const belongsToVerse = verse.verseNumber;
            const isVerseHighlighted = hoveredVerse !== null && belongsToVerse === hoveredVerse;

            const tooltipTranslation = (!isVerseEnd && verse.wbwTranslationHover?.[idx]) || (!isVerseEnd && verse.wbwTranslation?.[idx]) || undefined;
            const tooltipTransliteration = (!isVerseEnd && verse.wbwTransliterationHover?.[idx]) || (!isVerseEnd && verse.wbwTransliteration?.[idx]) || undefined;

            const inlineTrText = !isVerseEnd && showInlineTranslation
              ? (verse.wbwTranslationInline?.[idx] || verse.wbwTranslation?.[idx])
              : undefined;
            const inlineTlText = !isVerseEnd && showInlineTransliteration
              ? (verse.wbwTransliterationInline?.[idx] || verse.wbwTransliteration?.[idx])
              : undefined;

            const wordKey = `word-${verse.verseNumber}-${idx}`;
            const ayahKey = `ayah-${verse.verseNumber}`;
            const isPlayingAudio = isPlaying(wordKey) || isPlaying(ayahKey);
            const isActive = !isVerseEnd && verse.verseNumber === activeVerse && idx === activeWord;

            const handleClick = isVerseEnd
              ? () => playAyah(surah.id, verse.verseNumber)
              : () => playWordAudio(verse.verseNumber, idx);
            const handleMouseEnter = () => { if (isVerseEnd) setHoveredVerse(verse.verseNumber); };
            const handleMouseLeave = () => { if (isVerseEnd) setHoveredVerse(null); };

            let className = "inline select-text transition-colors duration-200 ";
            if (isVerseHighlighted && !isVerseEnd) className += "text-emerald-600 dark:text-emerald-400";
            else if (isActive) className += "text-emerald-600 dark:text-emerald-400 animate-pulse";
            else if (isPlayingAudio) className += "text-emerald-600 dark:text-emerald-400 animate-pulse";
            else if (isVerseEnd) className += "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer";
            else className += "text-foreground hover:text-emerald-600 dark:hover:text-emerald-400";

            const cursorStyle = isVerseEnd ? "pointer" : (hoverRecitation ? "pointer" : "text");

            const arabicSpan = (
              <WordTooltip
                key={wordKey}
                translation={tooltipTranslation}
                transliteration={tooltipTransliteration}
                enabled={isTooltipEnabled}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <span
                  className={className}
                  style={{ cursor: cursorStyle, fontSize: arabicFontSize, fontFamily: pageFontFamily, lineHeight: anyInline ? 1.6 : 2.2 }}
                  onClick={handleClick}
                >
                  {glyph}{anyInline ? "" : " "}
                </span>
              </WordTooltip>
            );

            if (!anyInline) return arabicSpan;

            return (
              <div key={idx} className="flex flex-col items-center" style={{ minWidth: "2rem" }}>
                {arabicSpan}
                <div className="flex flex-col items-center gap-y-0.5 mt-1 w-full" dir="ltr">
                  {inlineTrText && (
                    <span className="text-foreground text-center leading-tight block w-full" style={{ fontSize: "12px", fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)" }}>
                      {inlineTrText}
                    </span>
                  )}
                  {inlineTlText && (
                    <span className="text-muted-foreground text-center leading-tight block w-full italic" style={{ fontSize: "12px", fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)" }}>
                      {inlineTlText}
                    </span>
                  )}
                </div>
              </div>
            );
          });

          if (anyInline) {
            return (
              <div className={cn("mb-4", computedFontClass)} dir="rtl">
                <div className="flex flex-wrap justify-end items-start gap-x-3 gap-y-2 w-full">
                  {wordNodes}
                </div>
              </div>
            );
          }

          return (
            <div className="flex justify-end mb-4">
              <div
                className={computedFontClass}
                style={{ fontSize: arabicFontSize, lineHeight: 2.2, fontFamily: pageFontFamily, width: "100%" }}
                dir="rtl"
              >
                {wordNodes}
              </div>
            </div>
          );
        })()}

        {showTransliteration && getTransliterationText && (
          <div className="mb-4">
            <p 
              className="text-muted-foreground leading-relaxed text-justify"
              style={{ fontSize: transliterationFontSize }}
            >
              {getTransliterationText}
            </p>
          </div>
        )}

        {verseTranslation && verse.translation && (
          <div>
            <p 
              className="text-foreground leading-relaxed"
              style={{ fontSize: translationFontSize }}
            >
              {verse.translation}
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}