import { useState, useRef } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/Middle/Library/utils";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/Top/Component/UI/Dropdown-Menu";
import { CATEGORIES } from "./Utility";
import { SearchResults } from "./Results";
import type { SearchCategory, SearchResult } from "./Types";

export interface SearchInputProps {
  query: string;
  setQuery: (query: string) => void;
  category: SearchCategory;
  setCategory: (category: SearchCategory) => void;
  onSearch: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  results: SearchResult[];
  selectedIndex: number;
  onResultClick: (path: string) => void;
  onSeeAll: () => void;
  dropdownMenuRef?: React.RefObject<HTMLDivElement>;
  isMobile?: boolean;
}

export function SearchInput({
  query,
  setQuery,
  category,
  setCategory,
  onSearch,
  inputRef,
  onKeyDown,
  results,
  selectedIndex,
  onResultClick,
  onSeeAll,
  dropdownMenuRef,
  isMobile = false,
}: SearchInputProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentCategory = CATEGORIES.find(c => c.id === category)!;

  const handleClear = () => {
    setQuery("");
    inputRef?.current?.focus();
  };

  const showResults = !isMobile && query.length > 0 && results.length > 0;

  return (
    <div
      className={cn(
        "bg-white dark:bg-black border-2 border-black dark:border-white w-full max-w-none shadow-sm overflow-hidden transition-all duration-200",
        showResults ? "rounded-xl" : "rounded-[40px]"
      )}
    >
      <Container className="!bg-transparent !border-0 !rounded-none px-2 sm:px-3 h-8 sm:h-9 flex items-center w-full">
        <div className="flex items-center w-full gap-2 min-w-0" onKeyDown={onKeyDown}>
          <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
              onKeyDown(e);
            }}
            placeholder={currentCategory.placeholder}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] sm:text-sm placeholder:text-muted-foreground text-foreground"
            aria-label="Search"
          />

          {/* Fixed-width slot to prevent container from shrinking */}
          <div className="flex-shrink-0 w-20 sm:w-24 flex justify-end items-center h-full">
            {!query ? (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="flex items-center gap-1 px-1.5 h-6 rounded-full text-[10px] font-medium transition-colors"
                  >
                    {currentCategory.label}
                    <ChevronDown className={cn("h-3 w-3 transition-transform", dropdownOpen && "rotate-180")} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal container={containerRef.current}>
                  <DropdownMenuContent
                    ref={dropdownMenuRef}
                    align="end"
                    sideOffset={4}
                    className="min-w-[130px] bg-white dark:bg-black border-2 border-black dark:border-white rounded-md shadow-lg z-50"
                  >
                    {CATEGORIES.map((cat) => (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => {
                          setCategory(cat.id);
                          setDropdownOpen(false);
                          inputRef?.current?.focus();
                        }}
                        className="cursor-pointer flex items-center gap-2 px-2 py-1 text-[11px]"
                      >
                        <cat.icon className="h-3 w-3" />
                        <span className="flex-1">{cat.label}</span>
                        {category === cat.id && <Check className="h-3 w-3" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="w-6 h-6 p-0 rounded-full flex-shrink-0"
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Container>

      {showResults && (
        <>
          <div className="h-px bg-border/50 w-full" />
          <SearchResults
            query={query}
            category={category}
            results={results}
            selectedIndex={selectedIndex}
            onResultClick={onResultClick}
            onSeeAll={onSeeAll}
            hideTopBorder
          />
        </>
      )}
    </div>
  );
}