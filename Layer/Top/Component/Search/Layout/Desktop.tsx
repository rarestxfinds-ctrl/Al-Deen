import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { cn } from "@/Middle/Library/utils";
import { SearchInput } from ".././Input";
import { SearchResults } from ".././Results";
import type { SearchCategory, SearchResult } from "../Types";

export function Desktop({
  open,
  onClose,
  query,
  setQuery,
  category,
  setCategory,
  results,
  selectedIndex,
  onSearch,
  onResultClick,
  onSeeAll,
  inputRef,
}: DesktopProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isResultsVisible, setIsResultsVisible] = useState(false);

  // Show results when query is non‑empty
  useEffect(() => {
    setIsResultsVisible(query.length > 0);
  }, [query]);

  // Measure the content height for smooth transitions
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    if (!isResultsVisible) {
      setContentHeight(64); // minimal height (only input row)
      return;
    }
    const height = contentRef.current.scrollHeight;
    setContentHeight(Math.max(height, 64));
  }, [query, results, isDropdownOpen, isResultsVisible]);

  // Reset when modal closes
  useLayoutEffect(() => {
    if (!open) {
      setContentHeight(0);
      setIsResultsVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = () => onClose();
  const handleModalClick = (e: React.MouseEvent) => e.stopPropagation();
  const shouldFlattenBottomRight = isDropdownOpen && query.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      {/* Modal – fixed top position, only expands downward */}
      <div
        className="fixed left-[50%] z-50 w-[calc(100%-2rem)] max-w-lg sm:max-w-[520px] transition-all duration-300 ease-out"
        style={{
          top: '15vh',          // adjust this value as needed
          transform: 'translateX(-50%)',
        }}
        role="dialog"
        aria-label="Search"
        onClick={handleModalClick}
      >
        <div
          ref={contentRef}
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            "bg-white dark:bg-black border-2 border-black dark:border-white shadow-2xl",
            query.length > 0 ? "rounded-2xl" : "rounded-full",
            shouldFlattenBottomRight && "rounded-br-none"
          )}
          style={{
            height: contentHeight > 0 ? contentHeight : 'auto',
            transition: 'height 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1), border-radius 0.2s ease-out',
          }}
        >
          <SearchInput
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            onSearch={onSearch}
            inputRef={inputRef}
            onDropdownOpenChange={setIsDropdownOpen}
          />
          {isResultsVisible && (
            <div className="pt-2 transition-all duration-300 ease-out">
              <SearchResults
                query={query}
                category={category}
                results={results}
                selectedIndex={selectedIndex}
                onResultClick={onResultClick}
                onSeeAll={onSeeAll}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}