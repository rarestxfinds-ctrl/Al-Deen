// Client/Web/Component/Quran/Layout/Page/PageCard.tsx
import React, { memo, useMemo, useState, useRef, useLayoutEffect } from "react";
import { Container } from "@Web/Component/UI/Container";
import { useApp } from "@Web/Context/App";
import { useAudio } from "@Web/Context/Audio";
import { WordTooltip, useAudioPlayback, extractVerseNumberFromMarker } from "../Utils";
import { Bismillah } from "@Web/Component/Quran/Bismillah";
import type { PageLinesProps, ResolvedWord, PageCardProps } from "../Types";

const LATIN_TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  fontFeatureSettings: "normal",
  fontVariant: "normal",
  fontWeight: 400,
};

const ARABIC_FONT_FALLBACK = "'Uthmani', 'Amiri', 'Traditional Arabic', serif";

export const PageLines = memo(function PageLines({
  ResolvedLines,
  FontClass,
  ArabicFontSize,
  WordSpacing = "1.8px",
  SurahNumber,
  AyahRefs,
  HighlightedAyah,
  setHighlightedAyah,
  ShowTransliteration,
  TransliterationFontSize,
  HoverTranslation,
  InlineTranslation,
  InlineTransliteration,
  HideVerses = false,
  HideVerseMarkers = false,
  BasmalahWords = [],
  BasmalahFontFamily,
  BasmalahFontClass = FontClass,
  BasmalahFontSize = ArabicFontSize,
  PageFontFamily,
  IsIndoPakFont = false,
  VerseMarkerOverrides = [],
  IsUthmaniV4Font = false,
  JustifyLines = true,
  ShowBasmalah = false,
}: PageLinesProps & { ShowBasmalah?: boolean }) {
  const { hifz } = useApp();
  const { activeVerse, activeWord, playAyah } = useAudio();
  const { playWordAudio, isPlaying } = useAudioPlayback(SurahNumber);

  const inlineTranslationFontSize = 12;
  const inlineTransliterationFontSize = 12;

  // Respect exactly what was passed down through props from the parent
  // chain (Surah/Index.tsx -> PageView -> PageCard -> PageLines). Do not
  // override with a separate `settings` object from useApp() — it isn't
  // guaranteed to be in sync with what the user actually selected upstream,
  // and silently preferring it here is what made this component ignore the
  // parent's actual Hover_Translation / Inline_Translation /
  // Inline_Transliteration / Show_Transliteration values.
  const isHoverTranslationEnabled = useMemo(
    () => HoverTranslation !== "None" && HoverTranslation !== false && HoverTranslation !== undefined,
    [HoverTranslation]
  );

  const isHoverTransliterationEnabled = useMemo(
    () => ShowTransliteration !== "None" && ShowTransliteration !== false && ShowTransliteration !== undefined,
    [ShowTransliteration]
  );

  const showInlineTranslation = InlineTranslation !== "None" && !!InlineTranslation;
  const showInlineTransliteration = InlineTransliteration !== "None" && !!InlineTransliteration;
  const hasActiveInline = showInlineTranslation || showInlineTransliteration;

  const pageFontFamilyWithFallback = useMemo(() => {
    const base = PageFontFamily || FontClass;
    return base ? `${base}, ${ARABIC_FONT_FALLBACK}` : ARABIC_FONT_FALLBACK;
  }, [PageFontFamily, FontClass]);

  const isWordCompleted = (ayah: any, wordIndex: number): boolean => {
    if (!ayah) return false;
    const ayahNumber = Number(ayah["Al-Ayah"] ?? ayah.verseNumber ?? ayah.Ayah);
    return hifz.isWordCompleted(SurahNumber, ayahNumber, wordIndex);
  };

  const buildWordClassName = (
    isAyahHighlighted: boolean,
    isVerseMarker: boolean,
    isVerseEnd: boolean,
    isActive: boolean,
    isAudioPlaying: boolean
  ): string => {
    let className = "select-text transition-colors duration-200 inline print:text-black ";
    if (isAyahHighlighted && !isVerseMarker) {
      className += "text-[hsl(var(--quran-hover))]";
    } else if (isActive) {
      className += "text-foreground animate-pulse print:animate-none";
    } else if (isAudioPlaying) {
      className += "text-[hsl(var(--quran-hover))] animate-pulse print:animate-none";
    } else if (isVerseEnd || isVerseMarker) {
      className += "text-muted-foreground hover:text-[hsl(var(--quran-hover))] cursor-pointer print:text-black";
    } else {
      if (!IsUthmaniV4Font) {
        className += "text-foreground hover:text-[hsl(var(--quran-hover))]";
      }
    }
    return className;
  };

  const buildEventHandlers = (word: ResolvedWord) => {
    const { Glyph, Ayah, WordIndex, IsVerseEnd, IsVerseMarker, AyahNumber } = word;

    const resolvedAyahNumber = Ayah
      ? Number((Ayah as any)["Al-Ayah"] ?? (Ayah as any).verseNumber ?? Ayah.Ayah)
      : AyahNumber;

    let onClick: (() => void) | undefined;
    if (Ayah && resolvedAyahNumber !== null && resolvedAyahNumber !== undefined) {
      onClick = IsVerseEnd
        ? () => playAyah(SurahNumber, resolvedAyahNumber)
        : () => playWordAudio(resolvedAyahNumber, WordIndex);
    } else if (IsVerseMarker) {
      const verseNumber = extractVerseNumberFromMarker(Glyph);
      if (verseNumber !== null) onClick = () => playAyah(SurahNumber, verseNumber);
    }

    const onMouseEnter = () => {
      if (IsVerseMarker) {
        const verseNumber = extractVerseNumberFromMarker(Glyph);
        if (verseNumber !== null) setHighlightedAyah(verseNumber);
      } else if (IsVerseEnd && resolvedAyahNumber !== null && resolvedAyahNumber !== undefined) {
        setHighlightedAyah(resolvedAyahNumber);
      }
    };

    const onMouseLeave = () => {
      if (IsVerseMarker || IsVerseEnd) {
        setHighlightedAyah(null);
      }
    };

    return { onClick, onMouseEnter, onMouseLeave };
  };

  const renderWord = (word: ResolvedWord, index: number, isFirstInLine = false) => {
    const { Glyph, Ayah, WordIndex, IsVerseEnd, IsVerseMarker, AyahNumber } = word;

    const resolvedAyahNumber = Ayah
      ? Number((Ayah as any)["Al-Ayah"] ?? (Ayah as any).verseNumber ?? Ayah.Ayah)
      : AyahNumber;

    const isVerseMarker = IsVerseEnd;
    const shouldHide = (HideVerses && !isVerseMarker) || (HideVerseMarkers && isVerseMarker);
    const isWordComplete = Ayah ? isWordCompleted(Ayah, WordIndex) : false;
    const shouldBeVisible = !shouldHide || isWordComplete;
    const opacityClass = shouldBeVisible ? "opacity-100" : "opacity-0 print:opacity-100";
    const transitionClass = "transition-opacity duration-300";

    const isAyahHighlighted = HighlightedAyah !== null && resolvedAyahNumber === HighlightedAyah;

    const rawTranslation = !IsVerseEnd && Ayah
      ? (Ayah as any).wbwTranslation?.[WordIndex]
      : undefined;

    const rawTransliteration = !IsVerseEnd && Ayah
      ? (Ayah as any).wbwTransliteration?.[WordIndex]
      : undefined;

    const inlineTranslationText = showInlineTranslation ? rawTranslation : undefined;
    const inlineTransliterationText = showInlineTransliteration ? rawTransliteration : undefined;

    const wordKey = resolvedAyahNumber !== undefined ? `word-${resolvedAyahNumber}-${WordIndex}` : null;
    const ayahKey = resolvedAyahNumber !== undefined ? `ayah-${resolvedAyahNumber}` : null;
    const isAudioPlaying =
      (wordKey !== null && isPlaying(wordKey)) ||
      (ayahKey !== null && isPlaying(ayahKey));

    const isActive =
      !IsVerseEnd &&
      !isVerseMarker &&
      resolvedAyahNumber === activeVerse &&
      WordIndex === activeWord;

    const { onClick, onMouseEnter, onMouseLeave } = buildEventHandlers(word);

    const handleWordClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      if (HideVerses && Ayah && resolvedAyahNumber !== null && resolvedAyahNumber !== undefined && !isVerseMarker) {
        if (isWordComplete) {
          hifz.unmarkWordCompleted(SurahNumber, resolvedAyahNumber, WordIndex);
        } else {
          hifz.markWordCompleted(SurahNumber, resolvedAyahNumber, WordIndex);
        }
      }
      if (onClick) onClick();
    };

    let elementClassName = buildWordClassName(
      isAyahHighlighted,
      isVerseMarker,
      IsVerseEnd,
      isActive,
      isAudioPlaying
    );

    if (IsUthmaniV4Font && (isActive || isAudioPlaying)) {
      elementClassName += " uthmani-glyph-highlighted";
    }

    const elementRef = (el: HTMLSpanElement | null) => {
      if (el && isFirstInLine && resolvedAyahNumber && index === 0) {
        if (AyahRefs?.current) {
          AyahRefs.current.set(resolvedAyahNumber, el as unknown as HTMLDivElement);
        }
      }
    };

    const showInlineTranslationColumn = showInlineTranslation && !!inlineTranslationText;
    const showInlineTransliterationColumn = showInlineTransliteration && !!inlineTransliterationText;
    const hasInline = showInlineTranslationColumn || showInlineTransliterationColumn;

    const dataAttributes: Record<string, string | number | undefined> = {
      "data-verse": resolvedAyahNumber,
      "data-word": WordIndex,
    };
    if (isVerseMarker) dataAttributes["data-is-verse-marker"] = "true";

    let displayText = Glyph;
    if (IsIndoPakFont && isVerseMarker && resolvedAyahNumber) {
      const override = VerseMarkerOverrides[resolvedAyahNumber - 1];
      if (override && override !== "") {
        displayText = override;
      }
    }

    return (
      <div
        key={index}
        className={`relative flex flex-col items-center ${opacityClass} ${transitionClass} print:break-inside-avoid`}
        style={hasActiveInline ? { minWidth: "2rem" } : undefined}
        data-word={WordIndex}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <WordTooltip
          translation={rawTranslation}
          transliteration={rawTransliteration}
          enabled={isHoverTranslationEnabled || isHoverTransliterationEnabled}
          onClick={handleWordClick}
        >
          <span
            ref={elementRef}
            className={elementClassName}
            style={{ cursor: "pointer" }}
            {...dataAttributes}
          >
            {displayText}{" "}
          </span>
        </WordTooltip>

        {hasInline && (
          <div
            className="flex flex-col items-center gap-y-0.5 mt-1 w-full print:text-black"
            dir="ltr"
            style={LATIN_TEXT_STYLE}
          >
            {showInlineTranslationColumn && (
              <span
                className="text-black dark:text-white print:text-black text-center leading-tight block w-full"
                style={{ ...LATIN_TEXT_STYLE, fontSize: `${inlineTranslationFontSize}px` }}
              >
                {inlineTranslationText}
              </span>
            )}
            {showInlineTransliterationColumn && (
              <span
                className="text-gray-500 dark:text-gray-400 print:text-gray-700 text-center leading-tight block w-full"
                style={{ ...LATIN_TEXT_STYLE, fontSize: `${inlineTransliterationFontSize}px` }}
              >
                {inlineTransliterationText}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const justifyClass = JustifyLines ? "justify-between" : "justify-center";
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWrapMode, setIsWrapMode] = useState(false);
  const [minWidthThreshold, setMinWidthThreshold] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const checkOverflow = () => {
      const width = el.clientWidth;
      if (isWrapMode) {
        if (minWidthThreshold !== null && width >= minWidthThreshold) {
          setIsWrapMode(false);
          setMinWidthThreshold(null);
        }
        return;
      }
      const lines = el.querySelectorAll<HTMLElement>("[data-line-container]");
      let hasOverflow = false;
      lines.forEach((line) => {
        const firstElement = line.firstElementChild as HTMLElement | null;
        if (!firstElement) return;
        if (line.offsetHeight > firstElement.offsetHeight * 1.4) hasOverflow = true;
      });
      if (hasOverflow) {
        setMinWidthThreshold(width + 60);
        setIsWrapMode(true);
      }
    };
    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [isWrapMode, minWidthThreshold, ResolvedLines]);

  const flattenedWords = useMemo(() => ResolvedLines.flat(), [ResolvedLines]);

  return (
    <div className="space-y-2 p-4 print:p-0 print:space-y-0">
      {ShowBasmalah && (
        <div className="my-4 text-center">
          {BasmalahWords && BasmalahWords.length > 0 ? (
            <Bismillah
              words={BasmalahWords}
              fontClass={BasmalahFontClass}
              fontSize={BasmalahFontSize}
              fontFamily={BasmalahFontFamily}
              wordSpacing={WordSpacing}
              showInlineTranslation={showInlineTranslation}
              showInlineTransliteration={showInlineTransliteration}
              hoverTranslationEnabled={isHoverTranslationEnabled}
              inlineTranslationSize={inlineTranslationFontSize}
              inlineTransliterationSize={inlineTransliterationFontSize}
            />
          ) : (
            <div
              className={`text-center my-2 text-foreground ${BasmalahFontClass || FontClass || ""}`}
              style={{
                fontSize: ArabicFontSize || "1.75rem",
                fontFamily: BasmalahFontFamily || pageFontFamilyWithFallback,
              }}
              dir="rtl"
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className={`${FontClass} print:text-black`}
        style={{
          fontSize: ArabicFontSize,
          lineHeight: 1.8,
          fontFamily: pageFontFamilyWithFallback,
        }}
        dir="rtl"
      >
        {isWrapMode ? (
          <div
            className={`flex flex-wrap items-start ${hasActiveInline ? "gap-x-3" : ""}`}
            style={{ width: "100%" }}
            dir="rtl"
          >
            {flattenedWords.map((word, index) => renderWord(word, index, false))}
          </div>
        ) : (
          ResolvedLines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className={`flex ${justifyClass} items-start flex-wrap ${hasActiveInline ? "gap-x-3 mb-6" : "mb-0"} print:break-inside-avoid`}
              style={{ width: "100%" }}
              dir="rtl"
              data-line-container
            >
              {line.map((word, wordIndex) => renderWord(word, wordIndex, true))}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export const PageCard = memo(function PageCard({
  PageData,
  RawPageData,
  PageIndex,
  SurahNumber,
  ResolvedLines = [],
  ContainerClass,
  ShowArabicText = true,
  ShowTransliteration,
  ShowBasmalahOnPage: ProvidedShowBasmalah,
  BasmalahWords = [],
  PageFontFamily,
  // Font family locked to mushaf page 1, used ONLY for the Basmalah. Must
  // stay separate from PageFontFamily (the CURRENTLY DISPLAYED page's font):
  // glyph-based fonts (uthmani_v1/v2/v4) bind specific ligature codepoints to
  // a specific page's custom font file, and the Basmalah's glyphs are always
  // sourced from Surah 1 / mushaf page 1, regardless of which surah or page
  // is actually being rendered here. Reusing PageFontFamily for the Basmalah
  // (e.g. "Uthmani-V4-51" on Surah 2's first page) produces wrong glyph
  // shapes even though the underlying Arabic text/data is correct.
  BasmalahPageFontFamily,
  FontClass,
  ArabicFontSize,
  WordSpacing,
  AyahRefs,
  HighlightedAyah,
  setHighlightedAyah,
  TransliterationFontSize,
  HoverTranslation,
  InlineTranslation,
  InlineTransliteration,
  HideVerses,
  HideVerseMarkers,
  IsIndoPakFont,
  VerseMarkerOverrides,
  IsUthmaniV4Font,
  PageFooter,
  Layout,
}: PageCardProps) {
  const pageNum = Number((PageData as any)?.pageNumber ?? (PageData as any)?.Page ?? PageIndex ?? 0);

  const inferredSurahNumber = useMemo(() => {
    if (SurahNumber) return Number(SurahNumber);
    if ((PageData as any)?.surahNumber) return Number((PageData as any).surahNumber);
    if ((PageData as any)?.verses?.[0]?.surahNumber) return Number((PageData as any).verses[0].surahNumber);
    return 1;
  }, [SurahNumber, PageData]);

  const shouldShowBasmalah = useMemo(() => {
    if (ProvidedShowBasmalah !== undefined) {
      return ProvidedShowBasmalah;
    }
    const isNotTawbahOrFatihah = inferredSurahNumber !== 1 && inferredSurahNumber !== 9;
    const firstVerseNumber =
      (PageData as any)?.verses?.[0]?.verseNumber ??
      (PageData as any)?.verses?.[0]?.Ayah ??
      ResolvedLines[0]?.[0]?.AyahNumber;

    return Number(firstVerseNumber) === 1 && isNotTawbahOrFatihah;
  }, [ProvidedShowBasmalah, inferredSurahNumber, PageData, ResolvedLines]);

  return (
    <Container className={`w-full ${ContainerClass} print:bg-white print:text-black print:shadow-none print:border-none print:m-0 print:p-0 print:break-after-page`}>
      <div className="relative print:static">
        {ShowArabicText && ResolvedLines.length > 0 ? (
          <PageLines
            ResolvedLines={ResolvedLines}
            FontClass={FontClass || ""}
            ArabicFontSize={ArabicFontSize || "1.5rem"}
            WordSpacing={WordSpacing || "1.8px"}
            SurahNumber={inferredSurahNumber}
            AyahRefs={AyahRefs}
            HighlightedAyah={HighlightedAyah ?? null}
            setHighlightedAyah={setHighlightedAyah || (() => {})}
            ShowTransliteration={ShowTransliteration}
            HoverTranslation={HoverTranslation || false}
            InlineTranslation={InlineTranslation || "None"}
            InlineTransliteration={InlineTransliteration || "None"}
            HideVerses={HideVerses}
            HideVerseMarkers={HideVerseMarkers}
            BasmalahWords={BasmalahWords}
            ShowBasmalah={shouldShowBasmalah}
            BasmalahFontFamily={shouldShowBasmalah ? (BasmalahPageFontFamily || PageFontFamily) : undefined}
            BasmalahFontClass={FontClass}
            BasmalahFontSize={ArabicFontSize}
            PageFontFamily={PageFontFamily}
            IsIndoPakFont={IsIndoPakFont}
            VerseMarkerOverrides={VerseMarkerOverrides}
            IsUthmaniV4Font={IsUthmaniV4Font}
            JustifyLines={false}
          />
        ) : (
          <div className="p-4 text-xs font-mono bg-red-500/10 text-red-500 border border-red-500/30 rounded my-2">
            ⚠️ PageLines Failed to Render! 
            {!ShowArabicText && " (Reason: ShowArabicText is false)"}
            {ResolvedLines.length === 0 && " (Reason: ResolvedLines is empty)"}
          </div>
        )}

        {!ShowArabicText && ShowTransliteration && PageData && (
          <div className="space-y-1 p-4 print:p-0">
            {(PageData as any).verses?.map((ayah: any) => {
              const ayahNumber = Number(ayah["Al-Ayah"] ?? ayah.verseNumber ?? ayah.Ayah);
              const verseText = ayah["Al-Arabiyyah"] || ayah.arabic;
              if (!verseText) return null;
              return (
                <p
                  key={`translit-${ayahNumber}`}
                  className={`text-muted-foreground print:text-black leading-relaxed text-center transition-colors duration-200 ${
                    HighlightedAyah === ayahNumber ? "bg-primary/10 print:bg-transparent rounded px-1" : ""
                  }`}
                  style={{ fontSize: TransliterationFontSize }}
                  onMouseEnter={() => setHighlightedAyah && setHighlightedAyah(ayahNumber)}
                  onMouseLeave={() => setHighlightedAyah && setHighlightedAyah(null)}
                >
                  {verseText}
                </p>
              );
            })}
          </div>
        )}
      </div>

      {PageFooter && (
        <div className="flex items-center justify-center pb-2 pt-1 print:pb-0 print:pt-2">
          {typeof PageFooter === "function" ? PageFooter((PageData as any)?.pageNumber) : PageFooter}
        </div>
      )}
    </Container>
  );
});