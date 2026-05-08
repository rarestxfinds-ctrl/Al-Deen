import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { Copy, Share2 } from "lucide-react";
import { getDuaCategory, type DuaItem } from "@/Bottom/API/Aid";
import { toast } from "@/Middle/Hook/Use-Toast";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";
import { Tooltip } from "@/Top/Component/UI/Tooltip";
import { useApp } from "@/Middle/Context/App";
import { useState } from "react";

function formatNameFromId(id: string): string {
  return id
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const toRem = (size: number, base = 1.2) => `${(base * size) / 5}rem`;

function ReferenceLink({ reference }: { reference: string }) {
  if (reference.toLowerCase().startsWith("quran")) {
    return <span className="text-xs text-muted-foreground">{reference}</span>;
  }

  const parts = reference.split("/");
  if (parts.length === 3) {
    const [collectionSlug, chapterSlug, number] = parts;

    const formatSlug = (slug: string) => {
      return slug
        .split("-")
        .map(word => {
          if (word.toLowerCase() === "al") return "al";
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
    };

    const collectionDisplay = formatSlug(collectionSlug);
    const chapterDisplay = formatSlug(chapterSlug);
    const link = `/Hadith/${collectionSlug}/${chapterSlug}/${number}`;

    return (
      <Link to={link} className="text-xs text-muted-foreground hover:underline">
        {collectionDisplay} - {chapterDisplay} - {number}
      </Link>
    );
  }

  const cleanRef = reference.replace(/#/g, "").trim();
  return <span className="text-xs text-muted-foreground">{cleanRef}</span>;
}

const Dua_Category = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const {
    showDuaTranslation,
    showDuaTransliteration,
    showDuaInlineTranslation,
    showDuaInlineTransliteration,
    showDuaHoverTranslation,
    showDuaHoverTransliteration,
    duaArabicFontSize,
    duaTranslationFontSize,
    duaTransliterationFontSize,
    duaInlineTranslationFontSize,
    duaInlineTransliterationFontSize,
  } = useApp();

  const [activeTooltip, setActiveTooltip] = useState<{ duaIndex: number; wordIndex: number } | null>(null);

  const categoryName = categoryId ? formatNameFromId(categoryId) : "";
  const category = categoryName ? getDuaCategory(categoryName) : null;

  if (!category) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <Container className="max-w-md mx-auto">
            <div className="p-8 text-center">
              <h1 className="text-2xl font-semibold mb-4">Category Not Found</h1>
              <Link to="/Aid/Dua" className="inline-block">
                <Button>Back to Duas</Button>
              </Link>
            </div>
          </Container>
        </div>
      </Layout>
    );
  }

  const handleCopy = (dua: DuaItem, index: number) => {
    const text = `${dua.arabic}\n\n${dua.translation}\n\n— ${dua.reference}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Dua copied to clipboard" });
  };

  const handleShare = async (dua: DuaItem, index: number) => {
    const text = `${dua.arabic}\n\n${dua.translation}\n\n— ${dua.reference}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: category.name, text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    }
  };

  const getFullTransliteration = (dua: DuaItem): string => {
    if (!dua.transliteration) return "";
    if (Array.isArray(dua.transliteration)) return dua.transliteration.join(" ");
    return dua.transliteration;
  };

  const renderDua = (dua: DuaItem, index: number) => {
    const hasWbw = dua.wbw && Array.isArray(dua.wbw) && dua.wbw.length > 0;
    const hasTransliterationArray = Array.isArray(dua.transliteration) && dua.transliteration.length > 0;

    const IndexBadge = (
      <Container className="!w-auto min-w-7 h-7 px-1 rounded-full flex items-center justify-center">
        {index + 1}
      </Container>
    );

    // Header with index badge, reference, and action buttons
    const header = (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {IndexBadge}
          <ReferenceLink reference={dua.reference} />
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" className="w-7 h-7 p-0" onClick={() => handleCopy(dua, index)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="w-7 h-7 p-0" onClick={() => handleShare(dua, index)}>
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );

    // No word‑by‑word data → simple display (no tooltips)
    if (!hasWbw && !hasTransliterationArray) {
      return (
        <Container key={index} className="p-5 space-y-2 group">
          {header}
          <p className="font-arabic text-right leading-loose" dir="rtl" style={{ fontSize: toRem(duaArabicFontSize, 1.4) }}>
            {dua.arabic}
          </p>
          {showDuaTransliteration && dua.transliteration && (
            <p className="italic text-muted-foreground" style={{ fontSize: toRem(duaTransliterationFontSize, 1.0) }}>
              {getFullTransliteration(dua)}
            </p>
          )}
          {showDuaTranslation && (
            <p className="text-foreground" style={{ fontSize: toRem(duaTranslationFontSize, 1.0) }}>
              {dua.translation}
            </p>
          )}
        </Container>
      );
    }

    // Word‑by‑word data exists – prepare arrays
    const arabicWords = dua.arabic.split(" ");
    const translitWords = Array.isArray(dua.transliteration) ? dua.transliteration : [];
    const wbwWords = dua.wbw || [];
    const showInline = showDuaInlineTranslation || showDuaInlineTransliteration;

    const getTooltipContent = (wbwTranslation?: string, wbwTransliteration?: string) => (
      <div className="flex flex-col gap-1 p-1">
        {showDuaHoverTranslation && wbwTranslation && (
          <span className="text-foreground">{wbwTranslation}</span>
        )}
        {showDuaHoverTransliteration && wbwTransliteration && (
          <span className="text-muted-foreground text-sm">{wbwTransliteration}</span>
        )}
      </div>
    );

    // ----- INLINE ON: column layout with translation/transliteration below each word -----
    if (showInline) {
      return (
        <Container key={index} className="p-5 space-y-2 group">
          {header}
          <div className="font-arabic leading-loose" style={{ fontSize: toRem(duaArabicFontSize, 1.4) }}>
            <div className="flex flex-row-reverse flex-wrap justify-start items-start gap-x-3 gap-y-3">
              {arabicWords.map((word, idx) => {
                const wbwTranslation = wbwWords[idx];
                const wbwTransliteration = translitWords[idx];
                const showInlineTranslation = showDuaInlineTranslation && wbwTranslation;
                const showInlineTransliteration = showDuaInlineTransliteration && wbwTransliteration;
                const hasInline = showInlineTranslation || showInlineTransliteration;
                const showHoverTooltip = (showDuaHoverTranslation && wbwTranslation) ||
                                         (showDuaHoverTransliteration && wbwTransliteration);

                return (
                  <div key={idx} className="flex flex-col items-center" style={hasInline ? { minWidth: "2rem" } : undefined}>
                    {showHoverTooltip ? (
                      <Tooltip content={getTooltipContent(wbwTranslation, wbwTransliteration)} enabled={true} side="top" offset={80}>
                        <span
                          className={`inline-block cursor-pointer transition-colors duration-150 hover:text-green-600 dark:hover:text-green-400
                            ${activeTooltip?.duaIndex === index && activeTooltip?.wordIndex === idx ? "text-green-600 dark:text-green-400" : ""}
                          `}
                          onMouseEnter={() => setActiveTooltip({ duaIndex: index, wordIndex: idx })}
                          onMouseLeave={() => setActiveTooltip(null)}
                        >
                          {word}{" "}
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="inline-block">{word}{" "}</span>
                    )}
                    {hasInline && (
                      <div className="flex flex-col items-center gap-y-0.5 mt-1 w-full">
                        {showInlineTranslation && (
                          <span className="text-black dark:text-white text-center leading-tight" style={{ fontSize: toRem(duaInlineTranslationFontSize, 0.9) }}>
                            {wbwTranslation}
                          </span>
                        )}
                        {showInlineTransliteration && (
                          <span className="text-gray-500 dark:text-gray-400 text-center leading-tight" style={{ fontSize: toRem(duaInlineTransliterationFontSize, 0.8) }}>
                            {wbwTransliteration}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {showDuaTransliteration && dua.transliteration && (
            <p className="italic text-muted-foreground" style={{ fontSize: toRem(duaTransliterationFontSize, 1.0) }}>
              {getFullTransliteration(dua)}
            </p>
          )}
          {showDuaTranslation && (
            <p className="text-foreground" style={{ fontSize: toRem(duaTranslationFontSize, 1.0) }}>
              {dua.translation}
            </p>
          )}
        </Container>
      );
    }

    // ----- INLINE OFF: word‑by‑word layout with tooltips, but NO extra lines below each word -----
    return (
      <Container key={index} className="p-5 space-y-2 group">
        {header}
        <div className="font-arabic leading-loose" style={{ fontSize: toRem(duaArabicFontSize, 1.4) }}>
          <div className="flex flex-row-reverse flex-wrap justify-start items-start gap-x-3 gap-y-3">
            {arabicWords.map((word, idx) => {
              const wbwTranslation = wbwWords[idx];
              const wbwTransliteration = translitWords[idx];
              const showHoverTooltip = (showDuaHoverTranslation && wbwTranslation) ||
                                       (showDuaHoverTransliteration && wbwTransliteration);

              if (showHoverTooltip) {
                return (
                  <Tooltip
                    key={idx}
                    content={getTooltipContent(wbwTranslation, wbwTransliteration)}
                    enabled={true}
                    side="top"
                    offset={80}
                  >
                    <span
                      className="cursor-pointer transition-colors duration-150 hover:text-green-600 dark:hover:text-green-400 inline-block"
                      onMouseEnter={() => setActiveTooltip({ duaIndex: index, wordIndex: idx })}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      {word}
                    </span>
                  </Tooltip>
                );
              }
              return (
                <span key={idx} className="inline-block">
                  {word}
                </span>
              );
            })}
          </div>
        </div>
        {showDuaTransliteration && dua.transliteration && (
          <p className="italic text-muted-foreground" style={{ fontSize: toRem(duaTransliterationFontSize, 1.0) }}>
            {getFullTransliteration(dua)}
          </p>
        )}
        {showDuaTranslation && (
          <p className="text-foreground" style={{ fontSize: toRem(duaTranslationFontSize, 1.0) }}>
            {dua.translation}
          </p>
        )}
      </Container>
    );
  };

  return (
    <Layout>
      <section>
        <div className="mx-auto max-w-3xl">
          <div className="space-y-5">
            {category.duas.map((dua, index) => renderDua(dua, index))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Dua_Category;