// @/Top/Component/Quran/Navigator.tsx   (renamed from Navigator)
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ArrowLeft, Check, Search } from "lucide-react";
import { useIsMobile } from "@/Middle/Hook/Use-Mobile";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";
import { Input } from "@/Top/Component/UI/Input";
import { cn } from "@/Middle/Library/utils";
import { surahList, getVerse } from "@/Bottom/API/Quran";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/Top/Component/UI/Dropdown-Menu";

// ----- helpers (unchanged) -----
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

type PickerLevel = "surah" | "ayah" | "kalima" | "juz" | "hizb";

interface DrillState {
  selectedSurah: number;
  selectedAyah: number;
  currentStep: "surah" | "ayah" | "words";
}

export function Quran_Navigator() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const routeInfo = parseQuranRoute(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PickerLevel>(() => {
    if (routeInfo.mode === "juz") return "juz";
    if (routeInfo.mode === "hizb") return "hizb";
    if (routeInfo.kalima) return "kalima";
    if (routeInfo.ayah) return "ayah";
    return "surah";
  });

  const [drill, setDrill] = useState<DrillState>({
    selectedSurah: routeInfo.surah || 1,
    selectedAyah: routeInfo.ayah || 1,
    currentStep: "surah",
  });
  const [wordList, setWordList] = useState<number[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile panel top position
  const [mobileTop, setMobileTop] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click, ignoring dropdown menus
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target) ||
        (target as Element)?.closest?.(".navigator-dropdown")
      )
        return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const toggle = () => {
    if (!isOpen) {
      // Calculate mobile panel top (button bottom + gap)
      if (isMobile && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMobileTop(rect.bottom + 8);
      }
      setSearchQuery("");
      setDrill({
        selectedSurah: routeInfo.surah || 1,
        selectedAyah: routeInfo.ayah || 1,
        currentStep: activeTab === "surah" ? "surah" : "surah",
      });
    }
    setIsOpen((prev) => !prev);
  };

  // Fetch word list when drilling into words
  useEffect(() => {
    if (activeTab !== "kalima" || drill.currentStep !== "words") return;
    if (!drill.selectedSurah || !drill.selectedAyah) return;
    let cancelled = false;
    setLoadingWords(true);
    getVerse(drill.selectedSurah, drill.selectedAyah, { wbw: true })
      .then((verse) => {
        if (!cancelled && verse) setWordList(Array.from({ length: verse.words.length }, (_, i) => i + 1));
      })
      .finally(() => !cancelled && setLoadingWords(false));
    return () => { cancelled = true; };
  }, [activeTab, drill.currentStep, drill.selectedSurah, drill.selectedAyah]);

  // ----- navigation -----
  const commitSurah = useCallback((id: number) => {
    if (activeTab === "surah") {
      navigate(`/Quran/Surah/${id}`);
      setIsOpen(false);
      return;
    }
    setDrill((prev) => ({ ...prev, selectedSurah: id, currentStep: "ayah" }));
  }, [activeTab, navigate]);

  const commitAyah = useCallback((ayah: number) => {
    if (activeTab === "ayah") {
      navigate(`/Quran/Surah/${drill.selectedSurah}/Ayah/${ayah}`);
      setIsOpen(false);
      return;
    }
    setDrill((prev) => ({ ...prev, selectedAyah: ayah, currentStep: "words" }));
  }, [activeTab, drill.selectedSurah, navigate]);

  const commitKalima = useCallback((word: number) => {
    navigate(`/Quran/Surah/${drill.selectedSurah}/Ayah/${drill.selectedAyah}/Kalima/${word}`);
    setIsOpen(false);
  }, [drill, navigate]);

  const goToJuz = useCallback((juz: number) => { navigate(`/Quran/Juz/${juz}`); setIsOpen(false); }, [navigate]);
  const goToHizb = useCallback((hizb: number) => { navigate(`/Quran/Hizb/${hizb}`); setIsOpen(false); }, [navigate]);

  // ---- Filtered surah list for search ----
  const filteredSurahs = (activeTab === "surah" || drill.currentStep === "surah")
    ? surahList.filter(s => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          s.id.toString().includes(q) ||
          (s.englishNameTransliteration || s.englishName).toLowerCase().includes(q)
        );
      })
    : [];

  // ---- Render picker content ----
  const renderPicker = () => {
    switch (activeTab) {
      case "surah":
        return (
          <div className="overflow-y-auto space-y-0.5 max-h-full">
            {filteredSurahs.map((s) => (
              <button
                key={s.id}
                onClick={() => commitSurah(s.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                  "hover:bg-black/10 dark:hover:bg-white/10",
                  routeInfo.surah === s.id && "bg-black/5 dark:bg-white/5 font-medium"
                )}
              >
                {s.id}. {s.englishNameTransliteration || s.englishName}
              </button>
            ))}
          </div>
        );

      case "ayah": {
        if (drill.currentStep === "surah") {
          return (
            <div className="overflow-y-auto space-y-0.5 max-h-full">
              {filteredSurahs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => commitSurah(s.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                    "hover:bg-black/10 dark:hover:bg-white/10",
                    drill.selectedSurah === s.id && "bg-black/5 dark:bg-white/5 font-medium"
                  )}
                >
                  {s.id}. {s.englishNameTransliteration || s.englishName}
                </button>
              ))}
            </div>
          );
        }
        const meta = surahList.find((s) => s.id === drill.selectedSurah);
        if (!meta) return <p className="text-sm p-2">Select a surah first.</p>;
        return (
          <div className="flex flex-col max-h-full">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setDrill((prev) => ({ ...prev, currentStep: "surah" }))} className="p-1 rounded hover:bg-muted/10">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">Surah {drill.selectedSurah}</span>
            </div>
            <div className="overflow-y-auto grid grid-cols-5 gap-1 p-1">
              {Array.from({ length: meta.numberOfAyahs }, (_, i) => i + 1).map((ayah) => (
                <button key={ayah} onClick={() => commitAyah(ayah)}
                  className={cn("px-2 py-1 text-xs rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10",
                    drill.selectedAyah === ayah && "bg-black/5 dark:bg-white/5 font-medium")}>
                  {ayah}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "kalima": {
        if (drill.currentStep === "surah") {
          return (
            <div className="overflow-y-auto space-y-0.5 max-h-full">
              {filteredSurahs.map((s) => (
                <button key={s.id} onClick={() => commitSurah(s.id)}
                  className={cn("w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10",
                    drill.selectedSurah === s.id && "bg-black/5 dark:bg-white/5 font-medium")}>
                  {s.id}. {s.englishNameTransliteration || s.englishName}
                </button>
              ))}
            </div>
          );
        }
        if (drill.currentStep === "ayah") {
          const meta = surahList.find((s) => s.id === drill.selectedSurah);
          if (!meta) return <p className="text-sm p-2">Select a surah first.</p>;
          return (
            <div className="flex flex-col max-h-full">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setDrill((prev) => ({ ...prev, currentStep: "surah" }))} className="p-1 rounded hover:bg-muted/10">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted-foreground">Surah {drill.selectedSurah} → Ayah</span>
              </div>
              <div className="overflow-y-auto grid grid-cols-5 gap-1 p-1">
                {Array.from({ length: meta.numberOfAyahs }, (_, i) => i + 1).map((ayah) => (
                  <button key={ayah} onClick={() => commitAyah(ayah)}
                    className={cn("px-2 py-1 text-xs rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10",
                      drill.selectedAyah === ayah && "bg-black/5 dark:bg-white/5 font-medium")}>
                    {ayah}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (loadingWords) return <p className="text-sm p-2">Loading…</p>;
        return (
          <div className="flex flex-col max-h-full">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setDrill((prev) => ({ ...prev, currentStep: "ayah" }))} className="p-1 rounded hover:bg-muted/10">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">Surah {drill.selectedSurah} · Ayah {drill.selectedAyah}</span>
            </div>
            <div className="overflow-y-auto grid grid-cols-5 gap-1 p-1">
              {wordList.map((word) => (
                <button key={word} onClick={() => commitKalima(word)}
                  className={cn("px-2 py-1 text-xs rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10",
                    routeInfo.kalima === word && "bg-black/5 dark:bg-white/5 font-medium")}>
                  {word}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "juz":
        return (
          <div className="overflow-y-auto grid grid-cols-5 gap-1 p-1 max-h-full">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
              <button key={juz} onClick={() => goToJuz(juz)}
                className={cn("px-2 py-1 text-xs rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10",
                  routeInfo.juz === juz && "bg-black/5 dark:bg-white/5 font-medium")}>
                {juz}
              </button>
            ))}
          </div>
        );

      case "hizb":
        return (
          <div className="overflow-y-auto grid grid-cols-5 gap-1 p-1 max-h-full">
            {Array.from({ length: 60 }, (_, i) => i + 1).map((hizb) => (
              <button key={hizb} onClick={() => goToHizb(hizb)}
                className={cn("px-2 py-1 text-xs rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10",
                  routeInfo.hizb === hizb && "bg-black/5 dark:bg-white/5 font-medium")}>
                {hizb}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const pickerLabels: Record<PickerLevel, string> = {
    surah: "Surah",
    ayah: "Ayah",
    kalima: "Word",
    juz: "Juz",
    hizb: "Hizb",
  };
  const pickerOptions: { id: PickerLevel; label: string; show: boolean }[] = [
    { id: "surah", label: "Surah", show: true },
    { id: "ayah", label: "Ayah", show: routeInfo.mode === "surah" },
    { id: "kalima", label: "Word", show: routeInfo.mode === "surah" && !!routeInfo.surah && !!routeInfo.ayah },
    { id: "juz", label: "Juz", show: true },
    { id: "hizb", label: "Hizb", show: true },
  ].filter((o) => o.show);

  const showSearch = activeTab === "surah" || drill.currentStep === "surah";

  // ---- Mobile panel style (full width, max height) ----
  const mobilePanelStyle = {
    top: `${mobileTop}px`,
    left: 0,
    right: 0,
    maxHeight: `calc(100vh - ${mobileTop}px - 0.5rem)`,
  };

  return (
    <div className={cn("relative", isMobile ? "w-full" : "inline-block")}>
      <Button
        ref={buttonRef}
        onClick={toggle}
        className={cn(
          "relative flex items-center justify-center text-sm font-medium px-3 py-1 h-8 sm:h-9",  // CENTERED TEXT, FULL HEIGHT
          !isMobile && isOpen ? "w-72 rounded-b-none" : "w-auto"
        )}
        variant="ghost"
      >
        <span className="truncate">Surah</span>
        <ChevronDown className="absolute right-3 h-3.5 w-3.5 flex-shrink-0" />  {/* CHEVRON ABSOLUTE RIGHT */}
      </Button>

      {isOpen && (
        <div
          ref={panelRef}
          className={
            isMobile
              ? "fixed z-50 overflow-auto"
              : "absolute top-full left-0 right-0 mt-0 z-50"
          }
          style={isMobile ? mobilePanelStyle : undefined}
        >
          <Container className={cn("!p-3", !isMobile && "!rounded-t-none")}>
            {/* Top bar: dropdown + search */}
            <div className="flex items-center gap-2 mb-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs font-medium px-2 py-1">
                    {pickerLabels[activeTab]}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="navigator-dropdown min-w-[120px]">
                  {pickerOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => {
                        setActiveTab(opt.id);
                        setSearchQuery("");
                        setDrill({
                          selectedSurah: routeInfo.surah || 1,
                          selectedAyah: routeInfo.ayah || 1,
                          currentStep: "surah",
                        });
                      }}
                      className={cn("flex items-center justify-between text-xs", activeTab === opt.id && "font-medium")}
                    >
                      {opt.label}
                      {activeTab === opt.id && <Check className="h-3 w-3 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {showSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-7 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Picker content */}
            <div className="overflow-y-auto" style={{ maxHeight: `calc(${mobilePanelStyle.maxHeight} - 4rem)` }}>
              {renderPicker()}
            </div>
          </Container>
        </div>
      )}
    </div>
  );
}