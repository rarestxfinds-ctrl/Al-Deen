import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { surahList } from "@/Bottom/API/Quran";
import { Container } from "@/Top/Component/UI/Container";
import { Button } from "@/Top/Component/UI/Button";
import { cn } from "@/Middle/Library/utils";

type SurahSortOrder = "ascending" | "descending" | "revelation";

interface FilterProps {
  isOpen: boolean;
  onClose: () => void;
  filterType: "surah" | "juz" | "hizb" | "page" | null;
  setFilterType: (type: "surah" | "juz" | "hizb" | "page" | null) => void;

  selectedSurah: number | null;
  setSelectedSurah: (surah: number | null) => void;
  selectedAyah: number | null;
  setSelectedAyah: (ayah: number | null) => void;
  surahSortOrder: SurahSortOrder;
  setSurahSortOrder: (order: SurahSortOrder) => void;

  selectedJuz?: number | null;
  selectedHizb?: number | null;
  selectedPage?: number | null;

  onApply: () => void;
  onReset: () => void;
}

function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export function Filter({
  isOpen,
  onClose,
  filterType,
  setFilterType,
  selectedSurah,
  setSelectedSurah,
  selectedAyah,
  setSelectedAyah,
  surahSortOrder,
  setSurahSortOrder,
  selectedJuz,
  selectedHizb,
  selectedPage,
  onApply,
  onReset,
}: FilterProps) {
  const [showSurahDropdown, setShowSurahDropdown] = useState(false);
  const [showAyahDropdown, setShowAyahDropdown] = useState(false);
  const [showFilterTypeDropdown, setShowFilterTypeDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const surahDropdownRef = useRef<HTMLDivElement>(null);
  const ayahDropdownRef = useRef<HTMLDivElement>(null);
  const filterTypeDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);   // whole filter panel

  useClickOutside(surahDropdownRef, () => setShowSurahDropdown(false));
  useClickOutside(ayahDropdownRef, () => setShowAyahDropdown(false));
  useClickOutside(filterTypeDropdownRef, () => setShowFilterTypeDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));

  // Close the whole filter panel when clicking outside of it
  useClickOutside(panelRef, onClose);

  const selectedSurahMeta = selectedSurah
    ? surahList.find((s) => s.id === selectedSurah)
    : null;
  const ayahs = selectedSurahMeta
    ? Array.from({ length: selectedSurahMeta.numberOfAyahs }, (_, i) => i + 1)
    : [];

  const hasActiveFilter = (() => {
    if (filterType === "surah") return selectedSurah !== null;
    if (filterType === "juz") return selectedJuz !== null && selectedJuz !== undefined;
    if (filterType === "hizb") return selectedHizb !== null && selectedHizb !== undefined;
    if (filterType === "page") return selectedPage !== null && selectedPage !== undefined;
    return false;
  })();

  if (!isOpen) return null;

  const handleFilterTypeChange = (type: typeof filterType) => {
    setFilterType(type);
    setShowFilterTypeDropdown(false);
    if (type !== "surah") {
      setSelectedSurah(null);
      setSelectedAyah(null);
    }
  };

  const getFilterTypeLabel = () => {
    if (filterType === "surah") return "Surah";
    if (filterType === "juz") return "Juz";
    if (filterType === "hizb") return "Hizb";
    if (filterType === "page") return "Page";
    return "Select type";
  };

  const getSortLabel = () => {
    if (surahSortOrder === "ascending") return "Ascending";
    if (surahSortOrder === "descending") return "Descending";
    return "Revelation";
  };

  const sortOptions = [
    { id: "ascending", label: "Ascending" },
    { id: "descending", label: "Descending" },
    { id: "revelation", label: "Revelation" },
  ];

  // Custom reset that preserves filterType = "surah"
  const handleReset = () => {
    onReset();
    setFilterType("surah");
    setSelectedSurah(null);
    setSelectedAyah(null);
  };

  return (
    <>
      {/* Backdrop overlay – closes filter on click, blocks interaction */}
      <div
        className="fixed inset-0 z-999"
        onClick={onClose}
      />

      {/* Filter panel */}
      <div
        ref={panelRef}
        className="absolute right-0 mt-2 w-80 z-50"
      >
        <Container className="!p-4 space-y-2">
          {/* Show section with clear button */}
          <div className="flex items-center justify-between">
            <Container className="!p-0 !bg-transparent inline-block w-auto">
              <p className="text-xs font-medium text-muted-foreground px-1">Show</p>
            </Container>
            {(filterType || selectedSurah || selectedAyah) && (
              <Button onClick={handleReset} size="sm" className="text-xs">
                Clear
              </Button>
            )}
          </div>

          {/* Dropdown for filter type */}
          <div ref={filterTypeDropdownRef} className="relative">
            <Button
              onClick={() => setShowFilterTypeDropdown(!showFilterTypeDropdown)}
              className="w-full justify-between"
              fullWidth
              active={filterType !== null}
            >
              <span>{getFilterTypeLabel()}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showFilterTypeDropdown && "rotate-180")}
              />
            </Button>
            {showFilterTypeDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 z-[100]">
                <Container className="!p-1">
                  {[
                    { id: "surah", label: "Surah" },
                    { id: "juz", label: "Juz" },
                    { id: "hizb", label: "Hizb" },
                    { id: "page", label: "Page" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleFilterTypeChange(option.id as any)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                        "text-black dark:text-white",
                        filterType === option.id
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : "hover:bg-black/10 dark:hover:bg-white/10"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </Container>
              </div>
            )}
          </div>

          {/* Conditional UI (Surah/Ayah) - above Sort */}
          {filterType === "surah" && (
            <div className="space-y-2">
              {/* Surah Dropdown */}
              <div ref={surahDropdownRef} className="relative">
                <Button
                  onClick={() => setShowSurahDropdown(!showSurahDropdown)}
                  className="w-full justify-between"
                  fullWidth
                >
                  <span>
                    {selectedSurahMeta
                      ? `${selectedSurahMeta.id} ${selectedSurahMeta.englishName}`
                      : "Select Surah"}
                  </span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", showSurahDropdown && "rotate-180")}
                  />
                </Button>
                {showSurahDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto z-[100]">
                    <Container className="!p-1">
                      {surahList.map((surah) => (
                        <button
                          key={surah.id}
                          onClick={() => {
                            setSelectedSurah(surah.id);
                            setSelectedAyah(null);
                            setShowSurahDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                            "text-black dark:text-white",
                            selectedSurah === surah.id
                              ? "bg-black dark:bg-white text-white dark:text-black"
                              : "hover:bg-black/10 dark:hover:bg-white/10"
                          )}
                        >
                          {surah.id} {surah.englishName}
                        </button>
                      ))}
                    </Container>
                  </div>
                )}
              </div>

              {/* Ayah Dropdown */}
              {selectedSurah && (
                <div ref={ayahDropdownRef} className="relative">
                  <Button
                    onClick={() => setShowAyahDropdown(!showAyahDropdown)}
                    className="w-full justify-between"
                    fullWidth
                  >
                    <span>{selectedAyah ? `Ayah ${selectedAyah}` : "All Ayahs"}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", showAyahDropdown && "rotate-180")}
                    />
                  </Button>
                  {showAyahDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto z-[100]">
                      <Container className="!p-1">
                        <button
                          onClick={() => {
                            setSelectedAyah(null);
                            setShowAyahDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                            "text-black dark:text-white",
                            selectedAyah === null
                              ? "bg-black dark:bg-white text-white dark:text-black"
                              : "hover:bg-black/10 dark:hover:bg-white/10"
                          )}
                        >
                          All Ayahs
                        </button>
                        {ayahs.map((ayah) => (
                          <button
                            key={ayah}
                            onClick={() => {
                              setSelectedAyah(ayah);
                              setShowAyahDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                              "text-black dark:text-white",
                              selectedAyah === ayah
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "hover:bg-black/10 dark:hover:bg-white/10"
                            )}
                          >
                            Ayah {ayah}
                          </button>
                        ))}
                      </Container>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sort By section - dropdown */}
          <div className="space-y-1">
            <Container className="!p-0 !bg-transparent inline-block w-auto">
              <p className="text-xs font-medium text-muted-foreground px-1">Sort By</p>
            </Container>
            <div ref={sortDropdownRef} className="relative">
              <Button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full justify-between"
                fullWidth
              >
                <span>{getSortLabel()}</span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", showSortDropdown && "rotate-180")}
                />
              </Button>
              {showSortDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 z-[100]">
                  <Container className="!p-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSurahSortOrder(option.id as SurahSortOrder);
                          setShowSortDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                          "text-black dark:text-white",
                          surahSortOrder === option.id
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "hover:bg-black/10 dark:hover:bg-white/10"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </Container>
                </div>
              )}
            </div>
          </div>

          {/* Apply button */}
          {hasActiveFilter && (
            <Button onClick={onApply} fullWidth className="mt-2">
              Apply
            </Button>
          )}
        </Container>
      </div>
    </>
  );
}