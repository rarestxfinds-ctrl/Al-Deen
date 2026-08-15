// Component/Settings/Content/Quran/Section/Kalimah-Bi-Kalimah.tsx
import { useState, useEffect } from "react";
import { Search, Download, ChevronDown, ChevronRight, Loader2, Trash2, Check } from "lucide-react";
import { Card } from "@Web/Component/UI/Card";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { Slider } from "@Web/Component/UI/Slider";
import { Input } from "@Web/Component/UI/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@Web/Component/UI/Dropdown-Menu";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { MobileNavigator } from "../Utility";
import { useApp } from "@Web/Context/App";

import {
  Jalb_Qaimat_At_Tarjamaat_Kalimah,
  Jalb_Qaimat_An_Naqharat_Kalimah,
} from "@Web/../Source/Library/Quran-API";

type DisplayMode = "hover" | "inline" | "both";

interface WBWTranslationItem {
  id: string;
  name: string;
  language: string;
}

export function WBW() {
  const isMobile = useIsMobile();

  const {
    // Transliteration
    hoverTransliteration,
    setHoverTransliteration,
    inlineTransliteration,
    setInlineTransliteration,
    inlineTransliterationSize,
    setInlineTransliterationSize,
    
    // Translation
    hoverTranslation,
    setHoverTranslation,
    inlineTranslation,
    setInlineTranslation,
    inlineTranslationSize,
    setInlineTranslationSize,
  } = useApp();

  // Dynamic state initialized to empty arrays
  const [wbwTranslations, setWbwTranslations] = useState<WBWTranslationItem[]>([]);
  const [availableTransliterations, setAvailableTransliterations] = useState<
    { id: string; label: string }[]
  >([{ id: "None", label: "None" }]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);

  // Search & Download states
  const [search, setSearch] = useState("");
  const [downloadedIds, setDownloadedIds] = useState<string[]>(["en.sahih"]);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  // Accordion Expand States
  const [expandedActiveLangs, setExpandedActiveLangs] = useState<string[]>(["English"]);
  const [expandedInactiveLangs, setExpandedInactiveLangs] = useState<string[]>(["English"]);

  // Transliteration navigation state
  const [showHoverTransliterationList, setShowHoverTransliterationList] = useState(false);
  const [showInlineTransliterationList, setShowInlineTransliterationList] = useState(false);

  // --- Derived State for Active Translations ---
  const activeIds = Array.from(
    new Set(
      [hoverTranslation, inlineTranslation].filter(
        (id): id is string => Boolean(id) && id !== "None"
      )
    )
  );

  const getDisplayMode = (id: string): DisplayMode => {
    const isHover = hoverTranslation === id;
    const isInline = inlineTranslation === id;

    if (isHover && isInline) return "both";
    if (isHover) return "hover";
    if (isInline) return "inline";
    return "both";
  };

  // Check if any active translation requires an inline font size setting
  const hasInlineTranslation = inlineTranslation && inlineTranslation !== "None";

  // --- Handlers for Translation Mode Changes ---
  const handleSetMode = (id: string, mode: DisplayMode) => {
    if (mode === "hover") {
      setHoverTranslation(id);
      if (inlineTranslation === id) {
        setInlineTranslation("None");
      }
    } else if (mode === "inline") {
      setInlineTranslation(id);
      if (hoverTranslation === id) {
        setHoverTranslation("None");
      }
    } else if (mode === "both") {
      setHoverTranslation(id);
      setInlineTranslation(id);
    }
  };

  const toggleActive = (id: string) => {
    if (activeIds.includes(id)) {
      // Deactivate: remove from both modes
      if (hoverTranslation === id) setHoverTranslation("None");
      if (inlineTranslation === id) setInlineTranslation("None");
    } else {
      // Activate: default to "both" when selected from Inactive
      setHoverTranslation(id);
      setInlineTranslation(id);
    }
  };

  // Fetch available translations and transliterations on mount
  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      setIsLoadingList(true);
      try {
        const [translations, transliterations] = await Promise.all([
          Jalb_Qaimat_At_Tarjamaat_Kalimah(),
          Jalb_Qaimat_An_Naqharat_Kalimah(),
        ]);

        if (isMounted) {
          if (translations && Array.isArray(translations) && translations.length > 0) {
            setWbwTranslations(
              translations.map((t: any) => ({
                id: t.id || t.identifier || t.key || t["Al-Muraqqim"],
                name: t.name || t.englishName || t.displayName || t["Al-Ism"],
                language: t.language || t["Al-Lughah"] || "English",
              }))
            );
          }

          if (transliterations && Array.isArray(transliterations) && transliterations.length > 0) {
            const mappedTransliterations = transliterations
              .map((n: any) => ({
                id: n.id || n.identifier || n.key || n["Al-Muraqqim"] || n["An-Naqharah"],
                label: n.name || n.englishName || n.displayName || n["Al-Ism"] || n.label,
              }))
              .filter((item) => !!(item.id && item.label));

            setAvailableTransliterations([
              { id: "None", label: "None" },
              ...mappedTransliterations,
            ]);
          }
        }
      } catch (err) {
        // Essential network error log left for safety
        console.error("Failed to fetch WBW metadata:", err);
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleActiveLang = (lang: string) => {
    setExpandedActiveLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const toggleInactiveLang = (lang: string) => {
    setExpandedInactiveLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleDownload = (id: string) => {
    setDownloadingIds((prev) => [...prev, id]);
    setTimeout(() => {
      setDownloadingIds((prev) => prev.filter((item) => item !== id));
      setDownloadedIds((prev) => [...prev, id]);
    }, 1200);
  };

  const handleDeleteDownload = (id: string) => {
    setDownloadedIds((prev) => prev.filter((item) => item !== id));
  };

  const filteredItems = wbwTranslations.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.language.toLowerCase().includes(search.toLowerCase())
  );

  const activeList = filteredItems.filter((item) => activeIds.includes(item.id));
  const inactiveList = filteredItems.filter((item) => !activeIds.includes(item.id));

  const activeByLanguage = activeList.reduce<Record<string, WBWTranslationItem[]>>((acc, item) => {
    acc[item.language] = acc[item.language] || [];
    acc[item.language].push(item);
    return acc;
  }, {});

  const inactiveByLanguage = inactiveList.reduce<Record<string, WBWTranslationItem[]>>((acc, item) => {
    acc[item.language] = acc[item.language] || [];
    acc[item.language].push(item);
    return acc;
  }, {});

  const renderDropdown = (
    items: { id: string; label: string }[],
    currentValue: string,
    currentLabel: string,
    onChange: (value: string) => void,
    label: string
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="w-full flex items-center justify-between px-4 py-2 h-auto group bg-card hover:bg-muted"
          fullWidth
        >
          <span className="text-sm font-medium">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{currentLabel}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex items-center justify-between cursor-pointer hover:bg-muted"
          >
            <span>{item.label}</span>
            {currentValue === item.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderMobileButton = (onClick: () => void, currentLabel: string, label: string) => (
    <Button
      onClick={onClick}
      variant="secondary"
      className="w-full flex items-center justify-between px-4 py-2 h-auto group bg-card hover:bg-muted"
      fullWidth
    >
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{currentLabel}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </Button>
  );

  const currentHoverTransliterationLabel =
    availableTransliterations.find((t) => t.id === hoverTransliteration)?.label || "None";
  const currentInlineTransliterationLabel =
    availableTransliterations.find((t) => t.id === inlineTransliteration)?.label || "None";

  if (isMobile && showHoverTransliterationList) {
    return (
      <MobileNavigator
        isOpen={showHoverTransliterationList}
        onClose={() => setShowHoverTransliterationList(false)}
        title="Select Hover Transliteration"
        options={availableTransliterations}
        selectedId={hoverTransliteration}
        onSelect={(id) => setHoverTransliteration(id)}
      />
    );
  }

  if (isMobile && showInlineTransliterationList) {
    return (
      <MobileNavigator
        isOpen={showInlineTransliterationList}
        onClose={() => setShowInlineTransliterationList(false)}
        title="Select Inline Transliteration"
        options={availableTransliterations}
        selectedId={inlineTransliteration}
        onSelect={(id) => setInlineTransliteration(id)}
      />
    );
  }

  const hasActive = activeList.length > 0;

  return (
    <div className="space-y-6">
      {/* ----------------- SECTION 1: TRANSLATION ----------------- */}
      <div className="space-y-4">
        <div className="relative rounded-[40px] bg-card border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">WBW Translation</p>
        </div>

        {/* Inline Translation Font Size Slider */}
        {hasInlineTranslation && (
          <Card className="py-2.5 px-4 bg-card">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-sm whitespace-nowrap">
                Inline Translation Size: {inlineTranslationSize || 5}
              </span>
              <Slider
                value={[inlineTranslationSize || 5]}
                onValueChange={(value) => setInlineTranslationSize(value[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
            </div>
          </Card>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search languages or WBW translators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-2 border-black dark:border-white rounded-full focus:border-primary transition-colors"
          />
        </div>

        {/* Active WBW Container */}
        {hasActive && (
          <Container className="p-4 space-y-3 bg-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active
            </h3>

            <div className="space-y-3">
              {Object.entries(activeByLanguage).map(([language, items]) => {
                const isExpanded = expandedActiveLangs.includes(language);

                return (
                  <div
                    key={language}
                    className={`border border-border bg-card transition-all duration-150 overflow-hidden ${
                      isExpanded ? "rounded-2xl shadow-sm" : "rounded-full hover:bg-muted"
                    }`}
                  >
                    <button
                      onClick={() => toggleActiveLang(language)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{language}</span>
                        <span className="flex items-center justify-center text-xs font-semibold h-5 min-w-[20px] px-1.5 rounded-full border border-border bg-card text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 transition-transform duration-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4 transition-transform duration-300" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                        isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-3 pb-3 pt-1 space-y-2">
                          {items.map((item) => {
                            const isDownloaded = downloadedIds.includes(item.id);
                            const isDownloading = downloadingIds.includes(item.id);
                            const currentMode = getDisplayMode(item.id);

                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleActive(item.id)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-[20px] sm:rounded-full border-2 border-primary bg-card hover:bg-muted cursor-pointer transition-all"
                              >
                                <span className="text-sm font-medium">{item.name}</span>

                                <div
                                  className="flex items-center gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center bg-muted p-1 rounded-full text-xs border border-border">
                                    <button
                                      type="button"
                                      onClick={() => handleSetMode(item.id, "hover")}
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                                        currentMode === "hover"
                                          ? "bg-card text-foreground font-semibold shadow-xs"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      Hover
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetMode(item.id, "inline")}
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                                        currentMode === "inline"
                                          ? "bg-card text-foreground font-semibold shadow-xs"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      Inline
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetMode(item.id, "both")}
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                                        currentMode === "both"
                                          ? "bg-card text-foreground font-semibold shadow-xs"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      Both
                                    </button>
                                  </div>

                                  {isDownloading ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled
                                      className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                                    >
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      <span>Downloading...</span>
                                    </Button>
                                  ) : isDownloaded ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-full gap-1.5 px-3 py-1 text-xs text-destructive bg-card hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeleteDownload(item.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                                      onClick={() => handleDownload(item.id)}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>Download</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        )}

        {/* Inactive WBW Container */}
        <Container className="p-4 space-y-3 bg-card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Inactive
          </h3>

          {isLoadingList ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading available translations...</span>
            </div>
          ) : Object.keys(inactiveByLanguage).length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-2">
              All available WBW translations are active.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(inactiveByLanguage).map(([language, items]) => {
                const isExpanded = expandedInactiveLangs.includes(language);

                return (
                  <div
                    key={language}
                    className={`border border-border bg-card transition-all duration-150 overflow-hidden ${
                      isExpanded ? "rounded-2xl shadow-sm" : "rounded-full hover:bg-muted"
                    }`}
                  >
                    <button
                      onClick={() => toggleInactiveLang(language)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{language}</span>
                        <span className="flex items-center justify-center text-xs font-semibold h-5 min-w-[20px] px-1.5 rounded-full border border-border bg-card text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 transition-transform duration-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4 transition-transform duration-300" />
                      )}
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                        isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-3 pb-3 pt-1 space-y-2">
                          {items.map((item) => {
                            const isDownloaded = downloadedIds.includes(item.id);
                            const isDownloading = downloadingIds.includes(item.id);

                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleActive(item.id)}
                                className="flex items-center justify-between px-4 py-2 rounded-full border border-border bg-card hover:bg-muted cursor-pointer transition-all"
                              >
                                <span className="text-sm font-medium">{item.name}</span>

                                <div onClick={(e) => e.stopPropagation()}>
                                  {isDownloading ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled
                                      className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                                    >
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      <span>Downloading...</span>
                                    </Button>
                                  ) : isDownloaded ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-full gap-1.5 px-3 py-1 text-xs text-destructive bg-card hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeleteDownload(item.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                                      onClick={() => handleDownload(item.id)}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>Download</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Container>
      </div>

      {/* ----------------- SECTION 2: TRANSLITERATION ----------------- */}
      <div className="space-y-3">
        <div className="relative rounded-[40px] bg-card border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">WBW Transliteration</p>
        </div>

        {/* Hover Transliteration Dropdown */}
        {isMobile
          ? renderMobileButton(
              () => setShowHoverTransliterationList(true),
              currentHoverTransliterationLabel,
              "Hover Transliteration"
            )
          : renderDropdown(
              availableTransliterations,
              hoverTransliteration,
              currentHoverTransliterationLabel,
              (id) => setHoverTransliteration(id),
              "Hover Transliteration"
            )}

        {/* Inline Transliteration Dropdown */}
        {isMobile
          ? renderMobileButton(
              () => setShowInlineTransliterationList(true),
              currentInlineTransliterationLabel,
              "Inline Transliteration"
            )
          : renderDropdown(
              availableTransliterations,
              inlineTransliteration,
              currentInlineTransliterationLabel,
              (id) => setInlineTransliteration(id),
              "Inline Transliteration"
            )}

        {/* Transliteration Font Size Slider when enabled */}
        {inlineTransliteration !== "None" && (
          <Card className="py-2.5 px-4 bg-card">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-sm whitespace-nowrap">
                Transliteration Size: {inlineTransliterationSize || 5}
              </span>
              <Slider
                value={[inlineTransliterationSize || 5]}
                onValueChange={(val) => setInlineTransliterationSize(val[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}