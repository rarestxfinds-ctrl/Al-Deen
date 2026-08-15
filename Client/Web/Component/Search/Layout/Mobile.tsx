import { X, Search, ArrowRight } from "lucide-react";
import { Sheet, SheetContent } from "@Web/Component/UI/Sheet";
import { ScrollArea } from "@Web/Component/UI/Scroll-Area";
import { Button } from "@Web/Component/UI/Button";
import { SearchInput } from ".././Input";
import { SearchResults } from ".././Results";
import { NavigationLinks } from ".././Navigation";
import type { SearchCategory, SearchResult } from "../Types";

interface MobileProps {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (query: string) => void;
  category: SearchCategory;
  setCategory: (category: SearchCategory) => void;
  results: SearchResult[];
  onSearch: () => void;
  onResultClick: (path: string) => void;
  onSeeAll: () => void;
  onLinkClick: (path: string) => void;
  navLinks: Array<{ name: string; path: string; icon: React.ElementType }>;
  supportLinks: Array<{ name: string; path: string; icon: React.ElementType }>;
  inputRef: React.RefObject<HTMLInputElement>;
  isRtl?: boolean;
}

export function Mobile({
  open,
  onClose,
  query,
  setQuery,
  category,
  setCategory,
  results,
  onSearch,
  onResultClick,
  onSeeAll,
  onLinkClick,
  navLinks,
  supportLinks,
  inputRef,
  isRtl,
}: MobileProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side={isRtl ? "right" : "left"} className="p-0 w-full border-0" hideCloseButton>
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold text-foreground text-lg">Search</span>
            <Button size="sm" className="w-9 h-9 p-0 rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-border bg-muted/30">
            <SearchInput
              query={query}
              setQuery={setQuery}
              category={category}
              setCategory={setCategory}
              onSearch={onSearch}
              inputRef={inputRef}
            />
          </div>

          {/* Results or Navigation */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {query.length > 0 ? (
                <>
                  {results.length > 0 ? (
                    <SearchResults
                      query={query}
                      category={category}
                      results={results}
                      selectedIndex={-1}
                      onResultClick={onResultClick}
                      onSeeAll={onSeeAll}
                    />
                  ) : (
                    <div className="p-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No results for "{query}"</p>
                    </div>
                  )}
                </>
              ) : (
                <NavigationLinks
                  navLinks={navLinks}
                  supportLinks={supportLinks}
                  onLinkClick={onLinkClick}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}