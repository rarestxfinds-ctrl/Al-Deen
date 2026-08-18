// Client/Web/Component/Quran/Layout/Verse/VerseCard.tsx
import { Copy, MoreHorizontal, Bookmark, FileText, Share2, BookMarked, BookOpen, Video, Code2 } from "lucide-react";
import { cn } from "@/Library/utils";
import { useBookmarks } from "@/Hook/Use-Bookmarks";
import { useAuth } from "@Web/Context/Auth";
import { useTranslation } from "@/Hook/Use-Translation";
import { toast } from "@/Hook/Use-Toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@Web/Component/UI/Dropdown-Menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@Web/Component/UI/tooltip";
import { useAudio } from "@Web/Context/Audio";
import { useApp } from "@Web/Context/App";
import { WordTooltip, useAudioPlayback, getArabicField, pickArabicText } from "../Utils";
import { useState, useMemo, ReactNode } from "react";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { useQuery } from "@tanstack/react-query";
import { Fetch_Page_Sections_Corpus } from "@/Library/Quran-API";
import type { Page_Sections } from "@/Library/Quran-API";
import type { Kalimah } from "@/Library/Quran-Types";
import type { VerseCardProps } from "../Types";

const ARABIC_FONT_FALLBACK = "'Uthmani', 'Amiri', 'Traditional Arabic', serif";

const LATIN_TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  fontFeatureSettings: "normal",
  fontVariant: "normal",
  fontWeight: 400,
};

function InlineFootnote({ index, text }: { index: number; text?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Prevent the click from triggering parent audio playback or tooltip events
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <span className="inline-block align-baseline my-0.5 mx-1">
      <span
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            toggleOpen(e);
          }
        }}
        className={cn(
          "transition-all duration-300 ease-in-out border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 select-none cursor-pointer font-semibold",
          isOpen
            ? "block w-full mt-1.5 p-3 text-left rounded-lg text-xs font-normal text-foreground bg-muted/70 border-emerald-500/20 leading-relaxed shadow-sm animate-in fade-in duration-200"
            : "inline-flex items-center justify-center w-5 h-5 rounded-full text-[0.7rem] p-0 shrink-0"
        )}
        title={isOpen ? "Click to collapse" : `Expand footnote ${index}`}
      >
        {isOpen ? (
          <div className="flex flex-col gap-1 w-full text-left">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
              [{index}] Footnote:
            </span>
            <span className="text-muted-foreground">
              {text ? text : "Footnote content loading..."}
            </span>
          </div>
        ) : (
          <span>{index}</span>
        )}
      </span>
    </span>
  );
}

// The API returns footnotes as an array of objects, e.g.
// [{ Surah, Footnote, Text, Edition }, ...] — not a plain string array.
// Resolve by matching the "Footnote" number field rather than assuming
// array position lines up with footnote number (older callers that pass
// a plain string[] are still supported).
function resolveFootnoteText(
  footnotesList: unknown,
  footnoteNumber: number
): string | undefined {
  if (!Array.isArray(footnotesList) || footnotesList.length === 0) return undefined;

  if (typeof footnotesList[0] === "string") {
    return (footnotesList as string[])[footnoteNumber - 1];
  }

  const entry = (footnotesList as any[]).find(
    (f) => Number(f?.Footnote ?? f?.footnote ?? f?.id) === footnoteNumber
  );

  return entry?.Text ?? entry?.text;
}

function renderParsedTranslation(
  rawTranslation: string,
  footnotesList?: unknown
): ReactNode[] {
  if (!rawTranslation) return [];

  const pattern = /(?:\.|\b)(?:Master)?Footnote-(\d+)|\[(\d+)\]/gi;

  const elements: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawTranslation)) !== null) {
    const matchStart = match.index;
    const matchEnd = pattern.lastIndex;

    if (matchStart > lastIndex) {
      elements.push(rawTranslation.substring(lastIndex, matchStart));
    }

    const footnoteNumber = parseInt(match[1] || match[2], 10);
    const footnoteText = resolveFootnoteText(footnotesList, footnoteNumber);

    elements.push(
      <InlineFootnote
        key={`fn-${matchStart}-${footnoteNumber}`}
        index={footnoteNumber}
        text={footnoteText}
      />
    );

    lastIndex = matchEnd;
  }

  if (lastIndex < rawTranslation.length) {
    elements.push(rawTranslation.substring(lastIndex));
  }

  return elements;
}

export function VerseCard({
  Ayah,
  Kalimah,
  Translation,
  Translations,
  Transliteration,
  Footnote,
  Surah,
  Show_Arabic_Text: ShowArabicText = true,
  Show_Translation: ShowTranslation = true,
  Translation_Font_Size: TranslationFontSize,
  Transliteration_Font_Size: TransliterationFontSize = "0.875rem",
  Show_Transliteration: ShowTransliteration = false,
  Hover_Translation: HoverTranslation,
  Inline_Translation: InlineTranslation,
  Inline_Transliteration: InlineTransliteration,
  Is_Highlighted: IsHighlighted = false,
  Ayah_Ref: AyahRef,
  On_Notes_Click: onNotesClick,
  On_Share_Click: onShareClick,
  On_Tafsir_Click: onTafsirClick,
  On_Embed_Click: onEmbedClick,
  On_Render_Click: onRenderClick,
}: VerseCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addBookmark, removeBookmark, isBookmarked, getBookmarkId } = useBookmarks();

  const surahId = Number(Surah?.Surah ?? Surah?.id ?? 1);
  const ayahNum = Number(
    Ayah?.Ayah ??
    (Ayah as any)?.verseNumber ??
    (Ayah as any)?.verse ??
    (Ayah as any)?.verse_number ??
    1
  );

  const { playAyah, activeVerse, activeWord } = useAudio();
  const { hoverRecitation, fontSize, quranFont, settings } = useApp();
  const { playWordAudio, isPlaying } = useAudioPlayback(surahId);

  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);

  const arabicField = useMemo(() => getArabicField(quranFont), [quranFont]);

  const activeHoverTranslation = settings?.hoverTranslation ?? HoverTranslation;
  const activeHoverTransliteration = settings?.hoverTransliteration ?? ShowTransliteration;

  const activeInlineTranslation = settings?.inlineTranslation ?? InlineTranslation;
  const activeInlineTransliteration = settings?.inlineTransliteration ?? InlineTransliteration;

  const hoverTranslationEnabled = useMemo(() => {
    return activeHoverTranslation !== "None" && Boolean(activeHoverTranslation);
  }, [activeHoverTranslation]);

  const hoverTransliterationEnabled = useMemo(() => {
    return activeHoverTransliteration !== "None" && Boolean(activeHoverTransliteration);
  }, [activeHoverTransliteration]);

  const isHoverFeatureActive = hoverTranslationEnabled || hoverTransliterationEnabled;

  const showInlineTranslation = useMemo(() => {
    return activeInlineTranslation !== "None" && Boolean(activeInlineTranslation);
  }, [activeInlineTranslation]);

  const showInlineTransliteration = useMemo(() => {
    return activeInlineTransliteration !== "None" && Boolean(activeInlineTransliteration);
  }, [activeInlineTransliteration]);

  const hasAnyInlineActive = showInlineTranslation || showInlineTransliteration;

    const { data: pageSectionsMap } = useQuery<Page_Sections>({
    queryKey: ["pageSectionsCorpus"],
    queryFn: Fetch_Page_Sections_Corpus,
    staleTime: 1000 * 60 * 60,
  });

  const pageFontFamily = useMemo(() => {
    if (quranFont === "uthmani_v1" || quranFont === "uthmani_v2" || quranFont === "uthmani_v4") {
      const version = quranFont === "uthmani_v1" ? "1" : quranFont === "uthmani_v2" ? "2" : "4";
      const startPage = Surah?.Start_Page;
      const endPage = Surah?.End_Page;

      if (startPage == null || endPage == null || !pageSectionsMap) {
        return `Uthmani-V${version}`;
      }

            for (let pageNum = Number(startPage); pageNum <= Number(endPage); pageNum++) {
        const segments = (pageSectionsMap as Page_Sections)[pageNum];
        if (!segments) continue;

        const matchingSegment = segments.find(
          (segment) =>
            segment["Surah"] === surahId &&
            ayahNum >= segment["Start_Ayah"] &&
            ayahNum <= segment["End_Ayah"]
        );

        if (matchingSegment) {
          return `Uthmani-V${version}-${pageNum}`;
        }
      }

      return `Uthmani-V${version}-${startPage}`;
    }

    if (quranFont === "indopak") return "IndoPak";
    return "Uthmani";
  }, [quranFont, Surah, surahId, ayahNum, pageSectionsMap]);

  const pageFontFamilyWithFallback = useMemo(
    () => `${pageFontFamily}, ${ARABIC_FONT_FALLBACK}`,
    [pageFontFamily]
  );

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

  const renderedTranslationsList = useMemo(() => {
    if (Array.isArray(Translations) && Translations.length > 0) {
      return Translations.map((item, index) => {
        const footnotesList = item.footnotes || Footnote || (Ayah as any)?.Footnote || (Ayah as any)?.Footnotes;
        return {
          id: item.id || `tr-${index}`,
          content: renderParsedTranslation(item.text, footnotesList),
        };
      });
    }

    if (Translation) {
      const footnotesList = Footnote || (Ayah as any)?.Footnote || (Ayah as any)?.Footnotes;
      return [
        {
          id: "default",
          content: renderParsedTranslation(Translation, footnotesList),
        },
      ];
    }

    return [];
  }, [Translations, Translation, Footnote, Ayah]);

  const hasTranslationBlock = ShowTranslation && renderedTranslationsList.length > 0;
  const hasTransliterationBlock = ShowTransliteration && Boolean(Transliteration);

  const handleBookmark = async () => {
    const bookmarked = isBookmarked(surahId, ayahNum);
    if (bookmarked) {
      const bookmarkId = getBookmarkId(surahId, ayahNum);
      if (bookmarkId) await removeBookmark(bookmarkId);
    } else {
      await addBookmark(surahId, ayahNum);
    }
  };

  const copyVerse = async () => {
    let text = `${pickArabicText(Ayah, arabicField)}\n\n`;
    if (renderedTranslationsList.length > 0) {
      const translationsText = Translations && Translations.length > 0
        ? Translations.map((t) => t.text).join("\n\n")
        : Translation;
      if (translationsText) text += `${translationsText}\n\n`;
    }
    if (ShowTransliteration && Transliteration) {
      text += `${Transliteration}\n\n`;
    }
    const surahTitle = Surah?.Transliteration || Surah?.Translation || "";
    text += `- ${surahTitle} ${surahId}:${ayahNum}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Container 
      ref={AyahRef} 
      className={cn(IsHighlighted && "ring-2 ring-primary")}
    >
      <div className="pt-4 px-6 sm:px-8 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => playAyah(surahId, ayahNum)}
            onMouseEnter={() => setHoveredVerse(ayahNum)}
            onMouseLeave={() => setHoveredVerse(null)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
          >
            {surahId}:{ayahNum}
          </button>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="p-1.5 rounded-lg" onClick={copyVerse}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t?.quran?.copy || "Copy"}</TooltipContent>
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
                    {isBookmarked(surahId, ayahNum)
                      ? <BookMarked className="h-4 w-4 fill-current" />
                      : <Bookmark className="h-4 w-4" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t?.quran?.bookmark || "Bookmark"}</TooltipContent>
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
                    {t?.quran?.myNotes || "My Notes"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onShareClick}>
                    <Share2 className="h-4 w-4" />
                    {t?.quran?.share || "Share"}
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

        {/* Arabic text section: dir="rtl" + justify-start correctly aligns right */}
        {ShowArabicText && (() => {
          const wordsList: Kalimah[] = Array.isArray(Kalimah) ? Kalimah.flat() : [];

          if (wordsList.length === 0) {
            const fullText = pickArabicText(Ayah, arabicField);
            return (
              <div className="flex justify-start mb-4" dir="rtl">
                <div
                  className={computedFontClass}
                  style={{
                    fontSize: arabicFontSize,
                    lineHeight: 2.2,
                    fontFamily: pageFontFamilyWithFallback,
                    width: "100%",
                  }}
                >
                  <span className="text-foreground">{fullText}</span>
                </div>
              </div>
            );
          }

          const wordNodes = wordsList.map((wordRow, idx) => {
            if (!wordRow) return null;

            const isVerseEnd = idx === wordsList.length - 1;
            const isVerseHighlighted = hoveredVerse !== null && ayahNum === hoveredVerse;
            const glyph = pickArabicText(wordRow, arabicField);

            const wordKey = `word-${surahId}-${ayahNum}-${idx}`;
            const ayahKey = `ayah-${surahId}-${ayahNum}`;
            const isPlayingAudio = isPlaying(wordKey) || isPlaying(ayahKey);
            const isActive = !isVerseEnd && ayahNum === activeVerse && idx === activeWord;

            const wordTranslation = !isVerseEnd
              ? (wordRow.translation ?? (wordRow as any).WBW_Translation ?? (wordRow as any).wbwTranslation ?? (wordRow as any).Translation)
              : undefined;

            const wordTransliteration = !isVerseEnd
              ? (wordRow.transliteration ?? (wordRow as any).WBW_Transliteration ?? (wordRow as any).wbwTransliteration ?? (wordRow as any).Transliteration)
              : undefined;

            const handleClick = isVerseEnd
              ? () => playAyah(surahId, ayahNum)
              : () => playWordAudio(ayahNum, idx);

            const handleMouseEnter = () => { if (isVerseEnd) setHoveredVerse(ayahNum); };
            const handleMouseLeave = () => { if (isVerseEnd) setHoveredVerse(null); };

            let className = "inline select-text transition-colors duration-200 ";
            if (isVerseHighlighted && !isVerseEnd) className += "text-emerald-600 dark:text-emerald-400";
            else if (isActive) className += "text-emerald-600 dark:text-emerald-400 animate-pulse";
            else if (isPlayingAudio) className += "text-emerald-600 dark:text-emerald-400 animate-pulse";
            else if (isVerseEnd) className += "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer";
            else className += "text-foreground hover:text-emerald-600 dark:hover:text-emerald-400";

            const cursorStyle = isVerseEnd ? "pointer" : (hoverRecitation ? "pointer" : "text");

            return (
              <div
                key={`${surahId}-${ayahNum}-${idx}`}
                className="relative inline-flex flex-col items-center mx-1 my-1 align-top"
                style={hasAnyInlineActive ? { minWidth: "2rem" } : undefined}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <WordTooltip
                  translation={wordTranslation}
                  transliteration={wordTransliteration}
                  enabled={isHoverFeatureActive}
                  onClick={handleClick}
                >
                  <span
                    className={className}
                    style={{ cursor: cursorStyle, fontSize: arabicFontSize, fontFamily: pageFontFamilyWithFallback, lineHeight: 2.2 }}
                  >
                    {glyph}
                  </span>
                </WordTooltip>

                {hasAnyInlineActive && !isVerseEnd && (
                  <div
                    className="flex flex-col items-center gap-y-0.5 mt-1 w-full"
                    dir="ltr"
                    style={LATIN_TEXT_STYLE}
                  >
                    {showInlineTranslation && wordTranslation && (
                      <span
                        className="text-foreground text-center leading-tight block w-full text-[12px]"
                        style={LATIN_TEXT_STYLE}
                      >
                        {wordTranslation}
                      </span>
                    )}
                    {showInlineTransliteration && wordTransliteration && (
                      <span
                        className="text-muted-foreground text-center leading-tight block w-full text-[12px]"
                        style={LATIN_TEXT_STYLE}
                      >
                        {wordTransliteration}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          });

          return (
            <div className="flex justify-start mb-4" dir="rtl">
              <div
                className={cn(computedFontClass, "flex flex-wrap justify-start gap-x-1 items-start")}
                style={{ width: "100%" }}
              >
                {wordNodes}
              </div>
            </div>
          );
        })()}

        {/* Translation and Transliteration block */}
        <div>
          {hasTranslationBlock && (
            <div className="space-y-3 mt-2">
              {renderedTranslationsList.map((tr) => (
                <div key={tr.id} className="space-y-1">
                  <p className="text-foreground leading-relaxed" style={{ fontSize: TranslationFontSize }}>
                    {tr.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {hasTransliterationBlock && (
            <div className="mt-2 space-y-1">
              <p
                className="text-muted-foreground leading-relaxed italic"
                style={{ fontSize: TransliterationFontSize }}
              >
                {Transliteration}
              </p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}