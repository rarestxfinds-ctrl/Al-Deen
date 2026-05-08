import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/Middle/Library/utils";
import { useTranslation } from "@/Middle/Hook/Use-Translation";
import { Container } from "@/Top/Component/UI/Container";
import { Button } from "@/Top/Component/UI/Button";
import { 
  CATEGORIES, 
  CATEGORY_MAP, 
  searchPages, 
  searchSurahs, 
  searchHadiths, 
  searchDuas,
  searchVerses,
  getCategoryLabel,
  type SearchCategory,
  type VerseResult
} from "@/Top/Component/Search/Utility";
import type { SearchResult } from "@/Top/Component/Search/Types";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const categoryParam = (searchParams.get("category") || "quran") as SearchCategory;
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [category, setCategory] = useState<SearchCategory>(categoryParam);
  const [verseResults, setVerseResults] = useState<VerseResult[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const { t } = useTranslation();

  // Sync category from URL
  useEffect(() => {
    const cat = searchParams.get("category") as SearchCategory;
    if (cat && CATEGORY_MAP[cat]) {
      setCategory(cat);
    }
  }, [searchParams]);

  const updateSearch = useCallback((newQuery?: string, newCategory?: SearchCategory) => {
    const q = newQuery ?? searchQuery;
    const c = newCategory ?? category;
    if (newCategory) setCategory(c);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("category", c);
    setSearchParams(params, { replace: true });
  }, [searchQuery, category, setSearchParams]);

  // Search results by category
  const pageResults = useMemo(() => searchPages(query), [query]);
  const surahResults = useMemo(() => searchSurahs(query), [query]);
  const hadithResults = useMemo(() => searchHadiths(query), [query]);
  const duaResults = useMemo(() => searchDuas(query), [query]);

  // Verse search (only for Quran category)
  useEffect(() => {
    if (!query || query.length < 2 || category !== "quran") {
      setVerseResults([]);
      return;
    }

    let cancelled = false;
    const searchVersesAsync = async () => {
      setIsLoadingVerses(true);
      try {
        const results = await searchVerses(query);
        if (!cancelled) setVerseResults(results);
      } finally {
        if (!cancelled) setIsLoadingVerses(false);
      }
    };
    searchVersesAsync();
    return () => { cancelled = true; };
  }, [query, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) updateSearch(searchQuery.trim());
  };

  const handleCategoryChange = (newCategory: SearchCategory) => {
    updateSearch(undefined, newCategory);
  };

  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) return text;
    try {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      return text.split(regex).map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="text-primary font-medium bg-primary/10 px-0.5 rounded">{part}</span>
        ) : part
      );
    } catch { return text; }
  };

  const getResultCount = () => {
    switch (category) {
      case "pages": return pageResults.length;
      case "quran": return surahResults.length + verseResults.length;
      case "hadith": return hadithResults.length;
      case "duas": return duaResults.length;
      default: return 0;
    }
  };

  const resultCount = getResultCount();
  const currentCategory = CATEGORY_MAP[category];

  return (
    <Layout>
      <div className="container py-6 max-w-3xl mx-auto px-4">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="mb-4">
          <Container className="!py-0 !px-0 overflow-hidden">
            <div className="flex items-center w-full px-4 py-3 gap-3">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentCategory?.label || "Quran"}...`}
                className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              {searchQuery && (
                <Button 
                  type="button"
                  size="sm"
                  className="w-8 h-8 p-0 rounded-full flex-shrink-0"
                  onClick={() => { setSearchQuery(""); updateSearch(""); }}
                >
                  ×
                </Button>
              )}
            </div>
          </Container>
        </form>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;
            return (
              <Button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                variant={isActive ? "primary" : "secondary"}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 h-auto whitespace-nowrap",
                  isActive ? "bg-primary text-primary-foreground" : ""
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </Button>
            );
          })}
        </div>

        {/* Results */}
        {!query ? (
          <Container className="text-center py-16">
            <Search className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Search {currentCategory?.label || "Quran"}</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Type to search across {currentCategory?.label?.toLowerCase() || "content"}.
            </p>
            {category === "quran" && (
              <div className="flex flex-wrap justify-center gap-2">
                {["Al-Fatihah", "Mercy", "Prayer", "2:255"].map((term) => (
                  <Button 
                    key={term} 
                    variant="secondary" 
                    size="sm"
                    onClick={() => { setSearchQuery(term); updateSearch(term); }}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            )}
          </Container>
        ) : (
          <>
            {/* Summary */}
            {!isLoadingVerses && (
              <p className="text-xs text-muted-foreground mb-4">
                {resultCount} result{resultCount !== 1 ? "s" : ""} in {currentCategory?.label}
              </p>
            )}

            {/* Pages Results */}
            {category === "pages" && pageResults.length > 0 && (
              <div className="space-y-2">
                {pageResults.map((result) => (
                  <Link key={result.id} to={result.path}>
                    <Container className="!py-4 !px-5 hover:scale-[1.01] transition-transform group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {result.type === "Page" && <Search className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium group-hover:text-white dark:group-hover:text-black">
                            {highlightKeyword(result.title, query)}
                          </p>
                          <p className="text-xs text-muted-foreground">{result.path}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Container>
                  </Link>
                ))}
              </div>
            )}

            {/* Quran Results */}
            {category === "quran" && (
              <div className="space-y-3">
                {surahResults.length > 0 && (
                  <div className="space-y-2">
                    {surahResults.map((result) => (
                      <Link key={result.id} to={result.path}>
                        <Container className="!py-4 !px-5 hover:scale-[1.01] transition-transform group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium">{result.id.split("-")[1]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium group-hover:text-white dark:group-hover:text-black">
                                {highlightKeyword(result.title, query)}
                              </p>
                              <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                            </div>
                            {result.arabicName && (
                              <span className="font-arabic text-lg flex-shrink-0" dir="rtl">{result.arabicName}</span>
                            )}
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Container>
                      </Link>
                    ))}
                  </div>
                )}

                {isLoadingVerses ? (
                  <Container className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Searching verses...</span>
                  </Container>
                ) : verseResults.length > 0 ? (
                  <div className="space-y-2">
                    {surahResults.length > 0 && <div className="h-px bg-border/30 my-2" />}
                    {verseResults.map((result) => (
                      <Link key={result.verseKey} to={`/Quran/Surah/${result.surahId}?verse=${result.verseNumber}`}>
                        <Container className="!py-4 !px-5 hover:scale-[1.005] transition-transform group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">{result.surahName}</span>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-muted">{result.verseKey}</span>
                          </div>
                          <p className="font-arabic text-base text-right leading-loose mb-2" dir="rtl">{result.arabic}</p>
                          {result.translation && (
                            <p className="text-sm text-foreground leading-relaxed group-hover:text-white dark:group-hover:text-black">
                              {highlightKeyword(result.translation, query)}
                            </p>
                          )}
                        </Container>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* Hadith Results */}
            {category === "hadith" && hadithResults.length > 0 && (
              <div className="space-y-2">
                {hadithResults.map((result) => (
                  <Link key={result.id} to={result.path}>
                    <Container className="!py-4 !px-5 hover:scale-[1.01] transition-transform group">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium group-hover:text-white dark:group-hover:text-black">
                            {highlightKeyword(result.title, query)}
                          </p>
                          <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                        </div>
                        {result.arabicName && (
                          <span className="font-arabic text-lg flex-shrink-0" dir="rtl">{result.arabicName}</span>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Container>
                  </Link>
                ))}
              </div>
            )}

            {/* Duas Results */}
            {category === "duas" && duaResults.length > 0 && (
              <div className="space-y-2">
                {duaResults.map((result) => (
                  <Link key={result.id} to={result.path}>
                    <Container className="!py-4 !px-5 hover:scale-[1.01] transition-transform group">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium group-hover:text-white dark:group-hover:text-black">
                            {highlightKeyword(result.title, query)}
                          </p>
                          <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                        </div>
                        {result.arabicName && (
                          <span className="font-arabic text-lg flex-shrink-0" dir="rtl">{result.arabicName}</span>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Container>
                  </Link>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoadingVerses && resultCount === 0 && (
              <Container className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-medium mb-1">No results in {currentCategory?.label}</p>
                <p className="text-sm text-muted-foreground">Try a different keyword or category.</p>
              </Container>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}