// @Web/Component/Layout/Header/Navigator/Quran.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@Web/Component/UI/Button";
import { Container } from "@Web/Component/UI/Container";
import { cn } from "@/Library/utils";
import { NavigatorLayout } from "./Utility";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

type PickerLevel = "surah" | "ayah" | "kalima" | "juz" | "hizb";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

async function fetchVerseDetails(surah: number, ayah: number): Promise<{ words: any[] } | null> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/surah/${surah}/ayah/${ayah}?wbw=true`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function parseQuranRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const result: {
    surah?: number;
    ayah?: number;
    kalima?: number;
    juz?: number;
    hizb?: number;
    mode: "surah" | "juz" | "hizb" | "unknown";
  } = { mode: "unknown" };

  if (parts.includes("Juz")) {
    result.juz = parseInt(parts[parts.indexOf("Juz") + 1]) || undefined;
    result.mode = "juz";
  } else if (parts.includes("Hizb")) {
    result.hizb = parseInt(parts[parts.indexOf("Hizb") + 1]) || undefined;
    result.mode = "hizb";
  } else if (parts.includes("Surah")) {
    const idx = parts.indexOf("Surah");
    result.surah = parseInt(parts[idx + 1]) || undefined;
    result.mode = "surah";
    if (parts.includes("Ayah")) {
      const ayahIdx = parts.indexOf("Ayah");
      result.ayah = parseInt(parts[ayahIdx + 1]) || undefined;
      if (parts.includes("Kalima")) {
        result.kalima = parseInt(parts[parts.indexOf("Kalima") + 1]) || undefined;
      }
    }
  }
  return result;
}

export function Quran_Navigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeInfo = parseQuranRoute(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const [isDesktopCategoryOpen, setIsDesktopCategoryOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<PickerLevel>(() => {
    if (routeInfo.mode === "juz") return "juz";
    if (routeInfo.mode === "hizb") return "hizb";
    if (routeInfo.kalima) return "kalima";
    if (routeInfo.ayah) return "ayah";
    return "surah";
  });

  const [drillSurah, setDrillSurah] = useState<number | undefined>(routeInfo.surah || 1);
  const [drillAyah, setDrillAyah] = useState<number | undefined>(routeInfo.ayah || 1);
  const [drillStep, setDrillStep] = useState<PickerLevel>(() => {
    if (routeInfo.mode === "juz") return "juz";
    if (routeInfo.mode === "hizb") return "hizb";
    if (routeInfo.kalima) return "kalima";
    if (routeInfo.ayah) return "ayah";
    return "surah";
  });
  
  const [wordList, setWordList] = useState<number[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ingest structural database maps over unified reactive query cache
  const { data: corpus } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
    enabled: isOpen || !!routeInfo.surah,
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);

  useEffect(() => {
    const activeRoute = parseQuranRoute(location.pathname);
    setDrillSurah(activeRoute.surah || 1);
    setDrillAyah(activeRoute.ayah || 1);

    if (activeRoute.mode === "juz") {
      setActiveTab("juz");
      setDrillStep("juz");
    } else if (activeRoute.mode === "hizb") {
      setActiveTab("hizb");
      setDrillStep("hizb");
    } else if (activeRoute.kalima) {
      setActiveTab("kalima");
      setDrillStep("kalima");
    } else if (activeRoute.ayah) {
      setActiveTab("ayah");
      setDrillStep("ayah");
    } else {
      setActiveTab("surah");
      setDrillStep("surah");
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileCategoryOpen && !isDesktopCategoryOpen) return;

    const handleOutsideClick = () => {
      setIsMobileCategoryOpen(false);
      setIsDesktopCategoryOpen(false);
    };

    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isMobileCategoryOpen, isDesktopCategoryOpen]);

  useEffect(() => {
    if (drillStep !== "kalima" || !drillSurah || !drillAyah) return;
    let cancelled = false;
    setLoadingWords(true);
    
    fetchVerseDetails(drillSurah, drillAyah)
      .then((verse) => {
        if (!cancelled && verse?.words) {
          setWordList(Array.from({ length: verse.words.length }, (_, i) => i + 1));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingWords(false);
      });
      
    return () => { cancelled = true; };
  }, [drillStep, drillSurah, drillAyah]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSearchQuery("");
      const activeRoute = parseQuranRoute(location.pathname);

      setDrillSurah(activeRoute.surah || 1);
      setDrillAyah(activeRoute.ayah || 1);
      
      if (activeRoute.mode === "juz") {
        setActiveTab("juz");
        setDrillStep("juz");
      } else if (activeRoute.mode === "hizb") {
        setActiveTab("hizb");
        setDrillStep("hizb");
      } else if (activeRoute.kalima) {
        setActiveTab("kalima");
        setDrillStep("kalima");
      } else if (activeRoute.ayah) {
        setActiveTab("ayah");
        setDrillStep("ayah");
      } else {
        setActiveTab("surah");
        setDrillStep("surah");
      }
    }
    setIsOpen(open);
  };

  const closeAll = () => {
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery("");
    setIsMobileCategoryOpen(false);
    setIsDesktopCategoryOpen(false);
  };

  const commitSurah = useCallback((id: number) => {
    setDrillSurah(id);
    if (activeTab === "surah") {
      navigate(`/Quran/Surah/${id}`);
      closeAll();
    } else {
      setDrillStep("ayah");
    }
  }, [activeTab, navigate]);

  const commitAyah = useCallback((ayah: number) => {
    if (!drillSurah) return;
    setDrillAyah(ayah);
    if (activeTab === "ayah") {
      navigate(`/Quran/Surah/${drillSurah}/Ayah/${ayah}`);
      closeAll();
    } else {
      setDrillStep("kalima");
    }
  }, [activeTab, drillSurah, navigate]);

  const handleGoBack = useCallback(() => {
    if (drillStep === "kalima") {
      setDrillStep("ayah");
    } else if (drillStep === "ayah") {
      setDrillStep("surah");
    }
  }, [drillStep]);

  const showGoBack = useMemo(() => {
    return (activeTab === "surah" || activeTab === "ayah" || activeTab === "kalima") && drillStep !== "surah";
  }, [activeTab, drillStep]);

  const filteredSurahs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return surahList;
    return surahList.filter((s: any) =>
      s.id.toString().includes(q) ||
      (s.englishNameTransliteration || s.englishName).toLowerCase().includes(q)
    );
  }, [searchQuery, surahList]);

  const buttonLabel = useMemo(() => {
    if (routeInfo.surah && surahList.length > 0) {
      const meta = surahList.find((s: any) => s.id === routeInfo.surah);
      const base = meta ? meta.englishNameTransliteration || meta.englishName : "Surah";
      if (routeInfo.kalima) return `${base} · ${routeInfo.ayah}:${routeInfo.kalima}`;
      if (routeInfo.ayah) return `${base} · ${routeInfo.ayah}`;
      return base;
    }
    if (routeInfo.juz) return `Juz ${routeInfo.juz}`;
    if (routeInfo.hizb) return `Hizb ${routeInfo.hizb}`;
    return "Quran";
  }, [routeInfo, surahList]);

  const pickerOptions = useMemo(() => [
    { id: "surah" as PickerLevel, label: "Surah" },
    { id: "ayah" as PickerLevel, label: "Ayah" },
    { id: "kalima" as PickerLevel, label: "Word" },
    { id: "juz" as PickerLevel, label: "Juz" },
    { id: "hizb" as PickerLevel, label: "Hizb" },
  ], []);

  const nativeButtonBase = "w-full justify-start text-left font-normal truncate text-xs h-12 sm:h-9 rounded-lg px-3 sm:px-4 shrink-0 inline-flex items-center gap-2 py-2 transition-colors duration-200 focus:outline-none border snap-start";

  const getNativeButtonClassName = (isActive: boolean) => {
    return cn(
      nativeButtonBase,
      isActive
        ? "bg-accent text-accent-foreground font-semibold border-border/60"
        : "bg-card border-border/30 text-card-foreground sm:hover:bg-accent sm:hover:text-accent-foreground"
    );
  };

  const handleCategorySelect = (optId: PickerLevel, screenMode: "mobile" | "desktop") => {
    if (screenMode === "mobile") {
      setIsMobileCategoryOpen(false);
    } else {
      setIsDesktopCategoryOpen(false);
    }

    setActiveTab(optId);
    setSearchQuery("");
    
    if (optId === "juz" || optId === "hizb") {
      setDrillStep(optId);
    } else {
      setDrillStep("surah");
    }
  };

  const renderMobileHeaderLeft = () => {
    return (
      <div className="relative inline-block text-left max-w-full z-[10002]">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2.5 text-xs font-medium text-foreground max-w-full justify-between rounded-full bg-[#fafafa]/80 backdrop-blur-sm shadow-sm [.high-contrast_&]:bg-white [.high-contrast_&]:border-black"
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileCategoryOpen((prev) => !prev);
          }}
        >
          {pickerOptions.find((o) => o.id === activeTab)?.label ?? "Browse"}
          <ChevronDown className={cn("h-5 w-5 ml-1 transition-transform duration-200", isMobileCategoryOpen && "rotate-180")} />
        </Button>

        {isMobileCategoryOpen && (
          <div
            className="absolute left-0 top-full mt-1 min-w-[140px] border border-border/40 bg-popover text-popover-foreground shadow-md z-[10003] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {pickerOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategorySelect(opt.id, "mobile");
                }}
                className={cn(
                  "w-full flex items-center justify-between text-left px-4 py-2.5 text-xs font-medium rounded-none h-auto border-0 bg-transparent transition-colors duration-200 focus:outline-none",
                  activeTab === opt.id ? "bg-accent text-accent-foreground font-semibold" : "text-popover-foreground hover:bg-accent/50"
                )}
              >
                {opt.label}
                {activeTab === opt.id && <Check className="h-5 w-5 ml-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDesktopHeaderLeft = () => {
    return (
      <div className="relative inline-block text-left max-w-full z-[10002]">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2.5 text-xs font-medium text-foreground max-w-full justify-between rounded-full bg-[#fafafa]/80 backdrop-blur-sm shadow-sm [.high-contrast_&]:bg-white [.high-contrast_&]:border-black"
          onClick={(e) => {
            e.stopPropagation();
            setIsDesktopCategoryOpen((prev) => !prev);
          }}
        >
          {pickerOptions.find((o) => o.id === activeTab)?.label ?? "Browse"}
          <ChevronDown className={cn("h-5 w-5 ml-1 transition-transform duration-200", isDesktopCategoryOpen && "rotate-180")} />
        </Button>

        {isDesktopCategoryOpen && (
          <div
            className="absolute left-0 top-full mt-1 min-w-[140px] border border-border/40 bg-popover text-popover-foreground shadow-md z-[10003] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {pickerOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategorySelect(opt.id, "desktop");
                }}
                className={cn(
                  "w-full flex items-center justify-between text-left px-4 py-2.5 text-xs font-medium rounded-none h-auto border-0 bg-transparent transition-colors duration-200 focus:outline-none sm:hover:bg-accent sm:hover:text-accent-foreground",
                  activeTab === opt.id && "bg-accent text-accent-foreground font-semibold"
                )}
              >
                {opt.label}
                {activeTab === opt.id && <Check className="h-5 w-5 ml-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <NavigatorLayout
      isOpen={isOpen}
      setIsOpen={handleOpenChange}
      isSearching={isSearching}
      setIsSearching={setIsSearching}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      buttonLabel={buttonLabel}
      inputRef={inputRef}
      renderMobileHeaderLeft={renderMobileHeaderLeft}
      renderDesktopHeaderLeft={renderDesktopHeaderLeft}
      showGoBack={showGoBack}
      onGoBack={handleGoBack}
    >
      <div className="w-full relative">
        {drillStep === "surah" ? (
          <div className="flex flex-col gap-1.5 px-3 pt-2 sm:p-2">
            {filteredSurahs.map((s: any) => {
              const isActive = routeInfo.surah === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => commitSurah(s.id)}
                  className={getNativeButtonClassName(isActive)}
                >
                  <span className="truncate">
                    {s.id}. {s.englishNameTransliteration || s.englishName}
                  </span>
                </button>
              );
            })}
          </div>
        ) : drillStep === "ayah" ? (
          (() => {
            const meta = surahList.find((s: any) => s.id === drillSurah);
            if (!meta) return <p className="text-xs text-muted-foreground p-8 text-center">Select a surah first.</p>;
            return (
              <div className="flex flex-col px-3 pt-2 sm:p-2 snap-start">
                <div className="grid grid-cols-5 gap-2 p-2 bg-background rounded-xl shadow-sm">
                  {Array.from({ length: meta.numberOfAyahs }, (_, i) => i + 1).map((ayah) => {
                    const isActive = routeInfo.ayah === ayah && routeInfo.surah === drillSurah;
                    return (
                      <button
                        key={ayah}
                        type="button"
                        onClick={() => commitAyah(ayah)}
                        className={cn(
                          "h-9 w-full min-w-0 flex items-center justify-center text-xs font-normal focus:outline-none transition-colors duration-200 rounded-full aspect-square",
                          isActive
                            ? "bg-accent text-accent-foreground font-semibold border border-border/60"
                            : "bg-card border border-border/30 text-card-foreground sm:hover:bg-accent sm:hover:text-accent-foreground"
                        )}
                      >
                        {ayah}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : drillStep === "kalima" ? (
          loadingWords ? (
            <p className="text-xs text-muted-foreground p-8 text-center animate-pulse">Loading words…</p>
          ) : (
            <div className="flex flex-col px-3 pt-2 sm:p-2 snap-start">
              <div className="grid grid-cols-5 gap-2 p-2 bg-background rounded-xl shadow-sm">
                {wordList.map((word) => {
                  const isActive = routeInfo.kalima === word && routeInfo.ayah === drillAyah && routeInfo.surah === drillSurah;
                  return (
                    <button
                      key={word}
                      type="button"
                      onClick={() => {
                        navigate(`/Quran/Surah/${drillSurah}/Ayah/${drillAyah}/Kalima/${word}`);
                        closeAll();
                      }}
                      className={cn(
                        "h-9 w-full min-w-0 flex items-center justify-center text-xs font-normal focus:outline-none transition-colors duration-200 rounded-full aspect-square",
                        isActive
                          ? "bg-accent text-accent-foreground font-semibold border border-border/60"
                          : "bg-card border border-border/30 text-card-foreground sm:hover:bg-accent sm:hover:text-accent-foreground"
                      )}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ) : activeTab === "juz" ? (
          <div className="flex flex-col px-3 pt-2 sm:p-2 snap-start">
            <div className="grid grid-cols-5 gap-2 p-2 bg-background rounded-xl shadow-sm">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
                const isActive = routeInfo.juz === juz;
                return (
                  <button
                    key={juz}
                    type="button"
                    onClick={() => {
                      navigate(`/Quran/Juz/${juz}`);
                      closeAll();
                    }}
                    className={cn(
                      "h-9 w-full min-w-0 flex items-center justify-center text-xs font-normal focus:outline-none transition-colors duration-200 rounded-full aspect-square",
                      isActive
                        ? "bg-accent text-accent-foreground font-semibold border border-border/60"
                        : "bg-card border border-border/30 text-card-foreground sm:hover:bg-accent sm:hover:text-accent-foreground"
                    )}
                  >
                    {juz}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col px-3 pt-2 sm:p-2 snap-start">
            <div className="grid grid-cols-5 gap-2 p-2 bg-background rounded-xl shadow-sm">
              {Array.from({ length: 60 }, (_, i) => i + 1).map((hizb) => {
                const isActive = routeInfo.hizb === hizb;
                return (
                  <button
                    key={hizb}
                    type="button"
                    onClick={() => {
                      navigate(`/Quran/Hizb/${hizb}`);
                      closeAll();
                    }}
                    className={cn(
                      "h-9 w-full min-w-0 flex items-center justify-center text-xs font-normal focus:outline-none transition-colors duration-200 rounded-full aspect-square",
                      isActive
                        ? "bg-accent text-accent-foreground font-semibold border border-border/60"
                        : "bg-card border border-border/30 text-card-foreground sm:hover:bg-accent sm:hover:text-accent-foreground"
                    )}
                  >
                    {hizb}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </NavigatorLayout>
  );
}