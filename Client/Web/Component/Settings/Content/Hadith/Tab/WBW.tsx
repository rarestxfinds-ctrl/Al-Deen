import { useState, useEffect } from "react";
import { Search, Download, ChevronDown, Loader2, Trash2, Check } from "lucide-react";
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
  Fetch_Word_Translation_List,
  Fetch_Transliteration_List,
  Fetch_Hadith_Translation,
  Fetch_Collections,
  Get_Chapters,
  Get_Chapter,
  type Translation_List_Entry,
  type Transliteration_List_Entry,
} from "@/Library/Hadith-API";

import {
  Get_Saved_Kalimaat,
  Save_Kalimaat_Locally,
  Delete_Saved_Kalimaat,
} from "@/Library/Service-Worker-Cache-Store";

type DisplayMode = "hover" | "inline" | "both";
type WBWTranslationItem = Translation_List_Entry;

const Build_WBW_Translation_Marker_Key = (Edition_ID: string) => `Hadith-WBW-Translation-Download::${Edition_ID}`;

const Is_WBW_Downloaded = async (Marker_Key: string): Promise<boolean> => {
  const Marker = await Get_Saved_Kalimaat<boolean>(Marker_Key);
  return Marker === true;
};

const Get_All_Hadith_Ids = async (): Promise<number[]> => {
  const collections = await Fetch_Collections();
  const allHadithIds: number[] = [];

  for (const collection of collections) {
    const chapters = await Get_Chapters(collection.ID);
    if (!chapters) continue;

    for (const chapter of chapters) {
      const chapterData = await Get_Chapter(collection.ID, chapter.ID);
      if (chapterData?.Narrations) {
        for (const narration of chapterData.Narrations) {
          allHadithIds.push(narration.ID);
        }
      }
    }
  }

  return Array.from(new Set(allHadithIds));
};

const Download_WBW_Translation = async (Edition_ID: string): Promise<void> => {
  const hadithIds = await Get_All_Hadith_Ids();

  if (hadithIds.length > 0) {
    await Fetch_Hadith_Translation(
      hadithIds,
      Edition_ID,
      /* Need_Verse */ false,
      /* Need_Word */ true
    );
  }

  await Save_Kalimaat_Locally(Build_WBW_Translation_Marker_Key(Edition_ID), true);
};

export function WBWSection() {
  const isMobile = useIsMobile();

  const {
    // Selected edition state for Word-by-Word
    selectedHadithHoverTranslationEdition,
    setSelectedHadithHoverTranslationEdition,
    selectedHadithInlineTranslationEdition,
    setSelectedHadithInlineTranslationEdition,

    selectedHadithHoverTransliterationEdition,
    setSelectedHadithHoverTransliterationEdition,
    selectedHadithInlineTransliterationEdition,
    setSelectedHadithInlineTransliterationEdition,

    // Size state
    hadithInlineTranslationFontSize,
    setHadithInlineTranslationFontSize,
    hadithInlineTransliterationFontSize,
    setHadithInlineTransliterationFontSize,
  } = useApp();

  const [wbwTranslations, setWbwTranslations] = useState<WBWTranslationItem[]>([]);
  const [availableTransliterations, setAvailableTransliterations] = useState<
    { id: string; label: string }[]
  >([{ id: "None", label: "None" }]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);

  const [search, setSearch] = useState("");
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  const [showHoverTransliterationList, setShowHoverTransliterationList] = useState(false);
  const [showInlineTransliterationList, setShowInlineTransliterationList] = useState(false);

  const activeIds = Array.from(
    new Set(
      [selectedHadithHoverTranslationEdition, selectedHadithInlineTranslationEdition].filter(
        (id): id is string => Boolean(id) && id !== "None"
      )
    )
  );

  const getDisplayMode = (id: string): DisplayMode => {
    const isHover = selectedHadithHoverTranslationEdition === id;
    const isInline = selectedHadithInlineTranslationEdition === id;

    if (isHover && isInline) return "both";
    if (isHover) return "hover";
    if (isInline) return "inline";
    return "both";
  };

  const hasInlineTranslation =
    selectedHadithInlineTranslationEdition &&
    selectedHadithInlineTranslationEdition !== "None";

  const hasInlineTransliteration =
    selectedHadithInlineTransliterationEdition &&
    selectedHadithInlineTransliterationEdition !== "None";

  const handleSetMode = (id: string, mode: DisplayMode) => {
    if (mode === "hover") {
      setSelectedHadithHoverTranslationEdition(id);
      if (selectedHadithInlineTranslationEdition === id) {
        setSelectedHadithInlineTranslationEdition("None");
      }
    } else if (mode === "inline") {
      setSelectedHadithInlineTranslationEdition(id);
      if (selectedHadithHoverTranslationEdition === id) {
        setSelectedHadithHoverTranslationEdition("None");
      }
    } else if (mode === "both") {
      setSelectedHadithHoverTranslationEdition(id);
      setSelectedHadithInlineTranslationEdition(id);
    }
  };

  const toggleActive = (id: string) => {
    if (activeIds.includes(id)) {
      if (selectedHadithHoverTranslationEdition === id)
        setSelectedHadithHoverTranslationEdition("None");
      if (selectedHadithInlineTranslationEdition === id)
        setSelectedHadithInlineTranslationEdition("None");
    } else {
      setSelectedHadithHoverTranslationEdition(id);
      setSelectedHadithInlineTranslationEdition(id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      setIsLoadingList(true);
      try {
        const [translations, transliterations] = await Promise.all([
          Fetch_Word_Translation_List(),
          // Uses the exact same transliteration list API as TransliterationSection
          Fetch_Transliteration_List(),
        ]);

        if (isMounted) {
          if (translations && Array.isArray(translations) && translations.length > 0) {
            setWbwTranslations(translations);
          }

          if (transliterations && Array.isArray(transliterations) && transliterations.length > 0) {
            const mappedTransliterations = transliterations.map(
              (n: Transliteration_List_Entry) => ({
                id: n.ID,
                label: n.Name ? `${n.Language} - ${n.Name}` : n.Language,
              })
            );

            setAvailableTransliterations([
              { id: "None", label: "None" },
              ...mappedTransliterations,
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch Hadith WBW metadata:", err);
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingDownloads() {
      if (wbwTranslations.length === 0) return;

      const checks = await Promise.all(
        wbwTranslations.map(async (item) => {
          const downloaded = await Is_WBW_Downloaded(
            Build_WBW_Translation_Marker_Key(item.ID)
          );
          return downloaded ? item.ID : null;
        })
      );

      if (!cancelled) {
        setDownloadedIds((prev) =>
          Array.from(
            new Set([...prev, ...checks.filter((id): id is string => id !== null)])
          )
        );
      }
    }

    checkExistingDownloads();
    return () => {
      cancelled = true;
    };
  }, [wbwTranslations]);

  const handleDownload = async (id: string) => {
    setDownloadingIds((prev) => [...prev, id]);

    try {
      await Download_WBW_Translation(id);
      setDownloadedIds((prev) => [...prev, id]);
    } catch (err) {
      console.error(`Failed to download Hadith WBW translation "${id}":`, err);
    } finally {
      setDownloadingIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDeleteDownload = async (id: string) => {
    try {
      await Delete_Saved_Kalimaat(Build_WBW_Translation_Marker_Key(id));
      setDownloadedIds((prev) => prev.filter((item) => item !== id));
    } catch (err) {
      console.error(`Failed to delete Hadith WBW translation "${id}":`, err);
    }
  };

  const filteredItems = wbwTranslations.filter(
    (item) =>
      item.Name.toLowerCase().includes(search.toLowerCase()) ||
      item.Language.toLowerCase().includes(search.toLowerCase())
  );

  const activeList = filteredItems.filter((item) => activeIds.includes(item.ID));
  const inactiveList = filteredItems.filter((item) => !activeIds.includes(item.ID));

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
            {String(currentValue) === String(item.id) && (
              <Check className="h-4 w-4 text-primary" />
            )}
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

  // Loose ID comparisons prevent mismatching values when fetching entries
  const currentHoverTransliterationLabel =
    availableTransliterations.find(
      (t) => String(t.id).toLowerCase() === String(selectedHadithHoverTransliterationEdition).toLowerCase()
    )?.label || (selectedHadithHoverTransliterationEdition || "None");

  const currentInlineTransliterationLabel =
    availableTransliterations.find(
      (t) => String(t.id).toLowerCase() === String(selectedHadithInlineTransliterationEdition).toLowerCase()
    )?.label || (selectedHadithInlineTransliterationEdition || "None");

  if (isMobile && showHoverTransliterationList) {
    return (
      <MobileNavigator
        isOpen={showHoverTransliterationList}
        onClose={() => setShowHoverTransliterationList(false)}
        title="Select Hover Transliteration"
        options={availableTransliterations}
        selectedId={selectedHadithHoverTransliterationEdition}
        onSelect={(id) => setSelectedHadithHoverTransliterationEdition(id)}
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
        selectedId={selectedHadithInlineTransliterationEdition}
        onSelect={(id) => setSelectedHadithInlineTransliterationEdition(id)}
      />
    );
  }

  const hasActive = activeList.length > 0;

  return (
    <div className="space-y-6">
      {/* WBW Translation Section */}
      <div className="space-y-4">
        <div className="relative rounded-[40px] bg-card border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">WBW Translation</p>
        </div>

        {hasInlineTranslation && (
          <Card className="py-2.5 px-4 bg-card">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-sm whitespace-nowrap">
                Inline Translation Size: {hadithInlineTranslationFontSize || 5}
              </span>
              <Slider
                value={[hadithInlineTranslationFontSize || 5]}
                onValueChange={(value) => setHadithInlineTranslationFontSize(value[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
            </div>
          </Card>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search languages or WBW translators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-2 border-black dark:border-white rounded-full focus:border-primary transition-colors"
          />
        </div>

        {hasActive && (
          <Container className="p-4 space-y-3 bg-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active
            </h3>

            <div className="space-y-2">
              {activeList.map((item) => {
                const isDownloaded = downloadedIds.includes(item.ID);
                const isDownloading = downloadingIds.includes(item.ID);
                const currentMode = getDisplayMode(item.ID);

                return (
                  <div
                    key={item.ID}
                    onClick={() => toggleActive(item.ID)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-[20px] sm:rounded-full border-2 border-primary bg-card hover:bg-muted cursor-pointer transition-all"
                  >
                    <span className="text-sm font-medium">{item.Language}</span>

                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center bg-muted p-1 rounded-full text-xs border border-border">
                        <button
                          type="button"
                          onClick={() => handleSetMode(item.ID, "hover")}
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
                          onClick={() => handleSetMode(item.ID, "inline")}
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
                          onClick={() => handleSetMode(item.ID, "both")}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDownload(item.ID);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item.ID);
                          }}
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
          </Container>
        )}

        <Container className="p-4 space-y-3 bg-card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Inactive
          </h3>

          {isLoadingList ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading available translations...</span>
            </div>
          ) : inactiveList.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-2">
              All available WBW translations are active.
            </div>
          ) : (
            <div className="space-y-2">
              {inactiveList.map((item) => {
                const isDownloaded = downloadedIds.includes(item.ID);
                const isDownloading = downloadingIds.includes(item.ID);

                return (
                  <div
                    key={item.ID}
                    onClick={() => toggleActive(item.ID)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-full border border-border bg-card hover:bg-muted cursor-pointer transition-all"
                  >
                    <span className="text-sm font-medium">{item.Language}</span>

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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDownload(item.ID);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item.ID);
                          }}
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
          )}
        </Container>
      </div>

      {/* WBW Transliteration Section */}
      <div className="space-y-4">
        <div className="relative rounded-[40px] bg-card border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">WBW Transliteration</p>
        </div>

        <Container className="p-4 space-y-3 bg-card">
          {/* Hover Transliteration Selection */}
          {isMobile
            ? renderMobileButton(
                () => setShowHoverTransliterationList(true),
                currentHoverTransliterationLabel,
                "Hover Transliteration"
              )
            : renderDropdown(
                availableTransliterations,
                selectedHadithHoverTransliterationEdition,
                currentHoverTransliterationLabel,
                setSelectedHadithHoverTransliterationEdition,
                "Hover Transliteration"
              )}

          {/* Inline Transliteration Selection */}
          {isMobile
            ? renderMobileButton(
                () => setShowInlineTransliterationList(true),
                currentInlineTransliterationLabel,
                "Inline Transliteration"
              )
            : renderDropdown(
                availableTransliterations,
                selectedHadithInlineTransliterationEdition,
                currentInlineTransliterationLabel,
                setSelectedHadithInlineTransliterationEdition,
                "Inline Transliteration"
              )}

          {hasInlineTransliteration && (
            <Card className="py-2.5 px-4 bg-card mt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-sm whitespace-nowrap">
                  Inline Transliteration Size: {hadithInlineTransliterationFontSize || 5}
                </span>
                <Slider
                  value={[hadithInlineTransliterationFontSize || 5]}
                  onValueChange={(value) => setHadithInlineTransliterationFontSize(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="flex-1"
                />
              </div>
            </Card>
          )}
        </Container>
      </div>
    </div>
  );
}