import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Copy, Share2, ChevronDown } from "lucide-react";
import { toast } from "@/Hook/Use-Toast";
import { Button } from "@Web/Component/UI/Button";
import { Container } from "@Web/Component/UI/Container";
import { Tooltip } from "@Web/Component/UI/Tooltip";
import { Layout } from "@Web/Component/Layout/Index";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@Web/Component/UI/Dropdown-Menu";
import { ShareDialog } from "@Web/Component/Dialog/Share";
import { useApp } from "@Web/Context/App";
import { useState } from "react";

// Local typing matching your corpus structure
interface DuaItem {
  id?: string;
  arabic: string;
  translation: string;
  reference: string;
  transliteration?: string | string[];
  wbw?: string[];
  extraReferences?: string[];
}

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

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
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
  const [shareDua, setShareDua] = useState<DuaItem | null>(null);

  // Grab corpus data asynchronously using React Query
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  const categoryName = categoryId ? formatNameFromId(categoryId) : "";

  if (isLoading) {
    return (
      <Layout>
        <section>
          <div className="mx-auto max-w-3xl space-y-5">
            {[...Array(3)].map((_, idx) => (
              <Container key={idx} className="p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-24"></div>
                  <div className="h-6 bg-muted rounded w-12"></div>
                </div>
                <div className="h-12 bg-muted rounded w-full justify-self-end"></div>
                <div className="h-5 bg-muted rounded w-3/4"></div>
              </Container>
            ))}
          </div>
        </section>
      </Layout>
    );
  }

  // Traverses the precompiled corpus layout safely on the frontend client-side
  const category = corpus?.duas?.find(
    (c: any) => c.name?.toLowerCase() === categoryName?.toLowerCase() || c.id?.toLowerCase() === categoryId?.toLowerCase()
  );

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

  const handleShare = (dua: DuaItem) => {
    setShareDua(dua);
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

    const extras = dua.extraReferences ?? [];
    const allRefs = [dua.reference, ...extras];
    const hasMultiple = allRefs.length > 1;

    const ReferencePill = (
      <Container className="!py-1 !px-3 inline-flex w-auto">
        <ReferenceLink reference={dua.reference} />
      </Container>
    );

    const ReferenceDropdown = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-7 px-3 inline-flex items-center gap-1 text-xs">
            Reference
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          {allRefs.map((ref, i) => (
            <DropdownMenuItem key={i} asChild className="text-xs">
              <div className="w-full"><ReferenceLink reference={ref} /></div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const header = (
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {IndexBadge}
          {hasMultiple ? ReferenceDropdown : ReferencePill}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" className="w-7 h-7 p-0" onClick={() => handleCopy(dua, index)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" className="w-7 h-7 p-0" onClick={() => handleShare(dua)}>
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );

    const extraRefsRow = null;

    // No word‑by‑word data → simple display (no tooltips)
    if (!hasWbw && !hasTransliterationArray) {
      return (
        <Container key={index} className="p-5 space-y-2 group">
          {header}{extraRefsRow}
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
          {header}{extraRefsRow}
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
                          className={`inline-block cursor-pointer transition-colors duration-150 hover:text-emerald-600
                            ${activeTooltip?.duaIndex === index && activeTooltip?.wordIndex === idx ? "text-emerald-600" : ""}
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
        {header}{extraRefsRow}
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
                      className="cursor-pointer transition-colors duration-150 hover:text-emerald-600 inline-block"
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

  const duasList: DuaItem[] = category?.duas || [];

  return (
    <Layout>
      <section>
        <div className="mx-auto max-w-3xl">
          <div className="space-y-5">
            {duasList.map((dua, index) => renderDua(dua, index))}
          </div>
        </div>
      </section>
      <ShareDialog
        open={!!shareDua}
        onOpenChange={(o) => !o && setShareDua(null)}
        surahId={0}
        ayahId={0}
        verseText={shareDua?.arabic}
        translation={shareDua?.translation}
      />
    </Layout>
  );
};

export default Dua_Category;