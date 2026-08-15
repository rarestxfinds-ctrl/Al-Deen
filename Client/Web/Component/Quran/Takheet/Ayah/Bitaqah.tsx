// Client/Web/Component/Quran/Takheet/Ayah/Bitaqah.tsx
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
import { WordTooltip, useAudioPlayback, getArabicField, pickArabicText } from "../Adawat";
import { useState, useMemo, ReactNode, useEffect } from "react";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { useQuery } from "@tanstack/react-query";
import { Jalb_Aqsam_As_Safahat_Corpus } from "@/Library/Quran-API";
import type { Aqsam_As_Safahat, Al_Kalimah } from "@/Library/Quran-Types";
import type { Sifat_Bitaqat_Al_Ayah } from "../Anwaa";

const ARABIC_FONT_FALLBACK = "'Uthmani', 'Amiri', 'Traditional Arabic', serif";

const NAMAT_KHATT_LATINI: React.CSSProperties = {
  fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  fontFeatureSettings: "normal",
  fontVariant: "normal",
  fontWeight: 400,
};

/**
 * Sub-component: Starts as a trigger badge inline next to the word.
 * Upon click, expands to display footnote content.
 */
function InlineFootnote({ index, text }: { index: number; text?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="inline-block align-baseline my-0.5 mx-1">
      <Container
        as="button"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
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
      </Container>
    </span>
  );
}

/**
 * Parses footnote references from raw text and renders interactive InlineFootnote components.
 */
function renderParsedTranslation(
  rawTranslation: string,
  haashiyahList?: string[]
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
    const footnoteText = haashiyahList?.[footnoteNumber - 1];

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

export function Bitaqah_Al_Ayah({
  Al_Ayah,
  Kalimaat,
  At_Tarjamah,
  At_Tarajim,
  Haashiyah,
  Surah,
  Izhaar_An_Nass_Al_Arabi = true,
  Tarjamat_Al_Ayah = true,
  Hajm_Khatt_At_Tarjamah,
  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah = "0.875rem",
  Izhaar_Al_Kitabah_As_Sawtiyyah = false,
  Tarjamah_Ind_Al_Tamreer,
  At_Tarjamah_Al_Mudmajah,
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah,
  Hal_Huwa_Muayyaz = false,
  Marji_Al_Ayah,
  An_Naqr_Ala_Al_Mulahazaat,
  An_Naqr_Ala_Al_Musharakah,
  An_Naqr_Ala_At_Tafseer,
  An_Naqr_Ala_At_Tadmeen,
  An_Naqr_Ala_Al_Muayanah,
}: Sifat_Bitaqat_Al_Ayah & { At_Tarajim?: Array<{ id?: string; name?: string; text: string; haashiyah?: string[] }> }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addBookmark, removeBookmark, isBookmarked, getBookmarkId } = useBookmarks();

  const surahId = Number(Surah?.["As-Surah"] ?? (Surah as any)?.id ?? 1);
  const ayahNum = Number(Al_Ayah?.["Al-Ayah"] ?? (Al_Ayah as any)?.Ayah ?? 1);

  const { playAyah, activeVerse, activeWord } = useAudio();
  const { hoverRecitation, fontSize, quranFont, settings } = useApp();
  const { playWordAudio, isPlaying } = useAudioPlayback(surahId);

  const [hoveredVerse, setHoveredVerse] = useState<number | null>(null);

  const arabicField = useMemo(() => getArabicField(quranFont), [quranFont]);

  // Fallback to props when settings are undefined (matching Safhah/Bitaqah behavior)
  const activeHoverTranslation = settings?.hoverTranslation ?? Tarjamah_Ind_Al_Tamreer;
  const activeHoverTransliteration = settings?.hoverTransliteration ?? Izhaar_Al_Kitabah_As_Sawtiyyah;

  const activeInlineTranslation = settings?.inlineTranslation ?? At_Tarjamah_Al_Mudmajah;
  const activeInlineTransliteration = settings?.inlineTransliteration ?? Al_Kitabah_As_Sawtiyyah_Al_Mudmajah;

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

  // Print resolved feature states for debugging
  useEffect(() => {
    console.log(`[DEBUG][Bitaqah_Al_Ayah ${surahId}:${ayahNum}] Settings Resolution:`, {
      settingsContext: settings,
      resolvedHoverTranslation: activeHoverTranslation,
      resolvedHoverTransliteration: activeHoverTransliteration,
      resolvedInlineTranslation: activeInlineTranslation,
      resolvedInlineTransliteration: activeInlineTransliteration,
      isHoverFeatureActive,
      hasAnyInlineActive,
    });
  }, [
    surahId,
    ayahNum,
    settings,
    activeHoverTranslation,
    activeHoverTransliteration,
    activeInlineTranslation,
    activeInlineTransliteration,
    isHoverFeatureActive,
    hasAnyInlineActive,
  ]);

  const { data: pageSegmentsMap } = useQuery<Aqsam_As_Safahat>({
    queryKey: ["aqsamAsSafahat"],
    queryFn: Jalb_Aqsam_As_Safahat_Corpus,
    staleTime: 1000 * 60 * 60,
  });

  const pageFontFamily = useMemo(() => {
    if (quranFont === "uthmani_v1" || quranFont === "uthmani_v2" || quranFont === "uthmani_v4") {
      const version = quranFont === "uthmani_v1" ? "1" : quranFont === "uthmani_v2" ? "2" : "4";
      const startPage = Surah?.["Bidayat-As-Safhah"];
      const endPage = Surah?.["Nihayat-As-Safhah"];

      if (startPage == null || endPage == null || !pageSegmentsMap) {
        return `Uthmani-V${version}`;
      }

      for (let pageNum = Number(startPage); pageNum <= Number(endPage); pageNum++) {
        const rawPageSegments = (pageSegmentsMap as Record<string, any>)[String(pageNum)];

        if (!rawPageSegments) continue;

        let pageSegmentsStr = "";
        if (typeof rawPageSegments === "string") {
          pageSegmentsStr = rawPageSegments;
        } else if (Array.isArray(rawPageSegments)) {
          pageSegmentsStr = rawPageSegments.join("|");
        } else if (typeof rawPageSegments === "object") {
          pageSegmentsStr = rawPageSegments.segments || rawPageSegments.text || "";
        }

        if (!pageSegmentsStr || typeof pageSegmentsStr.split !== "function") continue;

        const segments = pageSegmentsStr.split("|");
        for (const seg of segments) {
          const [bidayah, nihayah] = seg.split("-");
          if (!bidayah || !nihayah) continue;

          const [startSurahStr, startAyahStr] = bidayah.split(".")[0].split(":");
          const [endSurahStr, endAyahStr] = nihayah.split(".")[0].split(":");

          const startSurah = parseInt(startSurahStr, 10);
          const startAyah = parseInt(startAyahStr, 10);
          const endAyah = parseInt(endAyahStr, 10);

          if (surahId === startSurah && ayahNum >= startAyah && ayahNum <= endAyah) {
            return `Uthmani-V${version}-${pageNum}`;
          }
        }
      }

      return `Uthmani-V${version}-${startPage}`;
    }

    if (quranFont === "indopak") return "IndoPak";
    return "Uthmani";
  }, [quranFont, Surah, surahId, ayahNum, pageSegmentsMap]);

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
    if (Array.isArray(At_Tarajim) && At_Tarajim.length > 0) {
      return At_Tarajim.map((item, index) => {
        const haashiyahList = item.haashiyah || Haashiyah || (Al_Ayah as any)?.Haashiyah;
        return {
          id: item.id || `tr-${index}`,
          name: item.name,
          content: renderParsedTranslation(item.text, haashiyahList),
        };
      });
    }

    if (At_Tarjamah) {
      const haashiyahList = Haashiyah || (Al_Ayah as any)?.Haashiyah;
      return [
        {
          id: "default",
          name: undefined,
          content: renderParsedTranslation(At_Tarjamah, haashiyahList),
        },
      ];
    }

    return [];
  }, [At_Tarajim, At_Tarjamah, Haashiyah, Al_Ayah]);

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
    let text = `${pickArabicText(Al_Ayah, arabicField)}\n\n`;
    if (renderedTranslationsList.length > 0) {
      const translationsText = At_Tarajim && At_Tarajim.length > 0
        ? At_Tarajim.map((t) => (t.name ? `[${t.name}]\n${t.text}` : t.text)).join("\n\n")
        : At_Tarjamah;
      if (translationsText) text += `${translationsText}\n\n`;
    }
    const surahTitle = Surah?.["At-Tansiq"] || Surah?.["At-Tarjamah"] || "";
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
      ref={Marji_Al_Ayah} 
      className={cn(Hal_Huwa_Muayyaz && "ring-2 ring-primary")}
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
                  <Button size="sm" className="p-1.5 rounded-lg" onClick={An_Naqr_Ala_At_Tafseer}>
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
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={An_Naqr_Ala_Al_Mulahazaat}>
                    <FileText className="h-4 w-4" />
                    {t?.quran?.myNotes || "My Notes"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={An_Naqr_Ala_Al_Musharakah}>
                    <Share2 className="h-4 w-4" />
                    {t?.quran?.share || "Share"}
                  </DropdownMenuItem>
                  {An_Naqr_Ala_Al_Muayanah && (
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={An_Naqr_Ala_Al_Muayanah}>
                      <Video className="h-4 w-4" />
                      Render Ayah
                    </DropdownMenuItem>
                  )}
                  {An_Naqr_Ala_At_Tadmeen && (
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={An_Naqr_Ala_At_Tadmeen}>
                      <Code2 className="h-4 w-4" />
                      Embed Ayah
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </div>

        {Izhaar_An_Nass_Al_Arabi && (() => {
          const wordsList = Kalimaat || [];

          if (wordsList.length === 0) {
            const fullText = pickArabicText(Al_Ayah, arabicField);
            return (
              <div className="flex justify-end mb-4">
                <div
                  className={computedFontClass}
                  style={{
                    fontSize: arabicFontSize,
                    lineHeight: 2.2,
                    fontFamily: pageFontFamilyWithFallback,
                    width: "100%",
                  }}
                  dir="rtl"
                >
                  <span className="text-foreground">{fullText}</span>
                </div>
              </div>
            );
          }

          const wordNodes = wordsList.map((wordRow: Al_Kalimah, idx) => {
            const isVerseEnd = idx === wordsList.length - 1;
            const isVerseHighlighted = hoveredVerse !== null && ayahNum === hoveredVerse;
            const glyph = pickArabicText(wordRow, arabicField);

            const wordNumber = wordRow["Al-Kalimah"] ?? idx;
            const wordKey = `word-${surahId}-${ayahNum}-${wordNumber}`;
            const ayahKey = `ayah-${surahId}-${ayahNum}`;
            const isPlayingAudio = isPlaying(wordKey) || isPlaying(ayahKey);
            const isActive = !isVerseEnd && ayahNum === activeVerse && idx === activeWord;

            const wordTranslation = !isVerseEnd 
              ? (wordRow.translation || (wordRow as any).wbwTranslation || (wordRow as any).At_Tarjamah) 
              : undefined;

            const wordTransliteration = !isVerseEnd 
              ? (wordRow.transliteration || (wordRow as any).wbwTransliteration || (wordRow as any).Al_Kitabah_As_Sawtiyyah) 
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
                key={wordKey}
                className="relative inline-flex flex-col items-center mx-1 my-1 align-top"
                style={hasAnyInlineActive ? { minWidth: "2rem" } : undefined}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <WordTooltip
                  At_Tarjamah={wordTranslation}
                  Al_Kitabah_As_Sawtiyyah={wordTransliteration}
                  Hal_Mufallat={isHoverFeatureActive}
                  Ind_An_Naqr={handleClick}
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
                    style={NAMAT_KHATT_LATINI}
                  >
                    {showInlineTranslation && wordTranslation && (
                      <span
                        className="text-foreground text-center leading-tight block w-full text-[12px]"
                        style={NAMAT_KHATT_LATINI}
                      >
                        {wordTranslation}
                      </span>
                    )}
                    {showInlineTransliteration && wordTransliteration && (
                      <span
                        className="text-muted-foreground text-center leading-tight block w-full text-[12px]"
                        style={NAMAT_KHATT_LATINI}
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
            <div className="flex justify-end mb-4">
              <div
                className={cn(computedFontClass, "flex flex-wrap justify-end gap-x-1 items-start")}
                style={{ width: "100%" }}
                dir="rtl"
              >
                {wordNodes}
              </div>
            </div>
          );
        })()}

        {Tarjamat_Al_Ayah && renderedTranslationsList.length > 0 && (
          <div className="mt-4 mb-2 space-y-3 border-t pt-3">
            {renderedTranslationsList.map((tr) => (
              <div key={tr.id} className="space-y-1">
                {tr.name && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    {tr.name}
                  </span>
                )}
                <p className="text-foreground leading-relaxed" style={{ fontSize: Hajm_Khatt_At_Tarjamah }}>
                  {tr.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}

export { Bitaqah_Al_Ayah as Bitaqah, Bitaqah_Al_Ayah as VerseCard };