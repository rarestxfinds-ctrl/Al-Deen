import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/Middle/Library/utils";
import { ScrollArea } from "@/Top/Component/UI/Scroll-Area";
import { Button } from "@/Top/Component/UI/Button";
import { getResultTypeLabel } from "./Utility";
import type { SearchResultsProps } from "./Types";

export function SearchResults({
  query,
  category,
  results,
  selectedIndex,
  onResultClick,
  onSeeAll,
  hideTopBorder = false,
}: SearchResultsProps & { hideTopBorder?: boolean }) {
  const getFontClass = () => "font-tajweed tajweed-colors";

  if (!query) return null;

  return (
    <>
      {!hideTopBorder && <div className="h-px bg-border/50 mx-4" />}
      <ScrollArea className="max-h-[50vh] p-2">
        {results.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {getResultTypeLabel(category)}
              </span>
              <Button 
                variant="secondary"
                size="sm"
                className="text-xs gap-1"
                onClick={onSeeAll}
              >
                See all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => onResultClick(result.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left group cursor-pointer",
                  selectedIndex === index ? "bg-secondary/70" : "hover:bg-secondary/50"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium">{result.type.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    {result.arabicName && (
                      <span className={cn("text-base", getFontClass())} dir="rtl">{result.arabicName}</span>
                    )}
                  </div>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                  )}
                </div>
                <ArrowRight className={cn(
                  "h-4 w-4 text-muted-foreground transition-opacity flex-shrink-0",
                  selectedIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )} />
              </button>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No results for "{query}"</p>
          </div>
        )}
      </ScrollArea>
    </>
  );
}