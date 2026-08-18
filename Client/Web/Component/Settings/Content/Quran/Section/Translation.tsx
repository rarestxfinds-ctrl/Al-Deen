// Component/Settings/Content/Quran/Section/Translation.tsx
import { useState, useEffect } from "react";
import { Search, Download, ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Card } from "@Web/Component/UI/Card";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { Slider } from "@Web/Component/UI/Slider";
import { Input } from "@Web/Component/UI/Input";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { MobileNavigator } from "../Utility";
import { useApp } from "@Web/Context/App";

// FIX: previous import used camelCase names (`fetchTranslationList`,
// `TranslationListEntry`) that don't exist. Quran-API.ts exports
// `Fetch_Translation_List`, and the real list-entry shape is capitalized:
// { ID, Name, Language } — defined and exported directly from Quran-API.ts,
// not from Quran-Types.ts.
import {
  Fetch_Translation_List,
  Fetch_Surah_Translation,
  type Translation_List_Entry,
} from "@Web/../Source/Library/Quran-API";

// FIX: Offline-DB.ts (buildTranslationPath / isAvailableOffline /
// downloadForOfflineUse / removeSavedDbFile — the last of which wasn't even
// imported in the original, just called out of thin air) isn't a real
// module. Service-Worker-Cache-Store.ts only exposes namespaced get/save/
// delete helpers. "Downloading" a translation edition now means: fetch its
// verse text for every Surah (Fetch_Surah_Translation caches this into the
// "Ayaat" namespace via Save_Ayaat_Locally internally), then record a
// completion marker in the "Kalimaat" namespace — the only generic
// write-a-value-under-a-key primitive that's exported.
import {
  Get_Saved_Kalimaat,
  Save_Kalimaat_Locally,
  Delete_Saved_Kalimaat,
} from "@Web/../Source/Library/Service-Worker-Cache-Store";

const TOTAL_SURAH_COUNT = 114;

const Build_Download_Marker_Key = (Edition_ID: string) => `Translation-Download::${Edition_ID}`;

const Is_Translation_Downloaded = async (Edition_ID: string): Promise<boolean> => {
  const Marker = await Get_Saved_Kalimaat<boolean>(Build_Download_Marker_Key(Edition_ID));
  return Marker === true;
};

const Download_Translation = async (Edition_ID: string): Promise<void> => {
  const Surah_Numbers = Array.from({ length: TOTAL_SURAH_COUNT }, (_, Idx) => Idx + 1);

  const Results = await Promise.allSettled(
    Surah_Numbers.map((Surah_Number) =>
      Fetch_Surah_Translation(Surah_Number, Edition_ID, /* Need_Ayah */ true, /* Need_Word */ false)
    )
  );

  const Failed = Results.filter((R) => R.status === "rejected");
  if (Failed.length > 0) {
    throw new Error(`Failed to cache ${Failed.length}/${TOTAL_SURAH_COUNT} Surahs for "${Edition_ID}".`);
  }

  await Save_Kalimaat_Locally(Build_Download_Marker_Key(Edition_ID), true);
};

const Remove_Translation_Download = (Edition_ID: string): Promise<void> =>
  Delete_Saved_Kalimaat(Build_Download_Marker_Key(Edition_ID));

export function Translation() {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [showTranslatorList, setShowTranslatorList] = useState(false);
  const [search, setSearch] = useState("");

  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  const [expandedActiveLangs, setExpandedActiveLangs] = useState<string[]>([]);
  const [expandedInactiveLangs, setExpandedInactiveLangs] = useState<string[]>([]);

  const {
    translationFontSize,
    setTranslationFontSize,
    availableTranslations,
    setAvailableTranslations,
    activeTranslationIds,
    toggleTranslation,
  } = useApp();

  useEffect(() => {
    async function loadTranslations() {
      try {
        const list = await Fetch_Translation_List();
        setAvailableTranslations(list);

        if (list.length > 0) {
          setExpandedInactiveLangs([list[0].Language]);
        }
      } catch (err) {
        console.error("Error fetching translation list:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (availableTranslations.length === 0) {
      loadTranslations();
    } else {
      setIsLoading(false);
    }
  }, [availableTranslations.length, setAvailableTranslations]);

  // FIX: check the real completion marker in Service-Worker-Cache-Store
  // instead of a nonexistent isAvailableOffline path check.
  useEffect(() => {
    let cancelled = false;

    async function checkExistingDownloads() {
      if (availableTranslations.length === 0) return;

      const checks = await Promise.all(
        availableTranslations.map(async (item) => {
          const downloaded = await Is_Translation_Downloaded(item.ID);
          return downloaded ? item.ID : null;
        })
      );

      if (!cancelled) {
        setDownloadedIds(checks.filter((id): id is string => id !== null));
      }
    }

    checkExistingDownloads();
    return () => {
      cancelled = true;
    };
  }, [availableTranslations]);

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

  // FIX: real download via Fetch_Surah_Translation across all Surahs, then
  // a completion marker, instead of a fake Offline-DB call.
  const handleDownload = async (item: Translation_List_Entry) => {
    setDownloadingIds((prev) => [...prev, item.ID]);

    try {
      await Download_Translation(item.ID);
      setDownloadedIds((prev) => [...prev, item.ID]);
    } catch (err) {
      console.error(`Failed to download translation "${item.ID}":`, err);
    } finally {
      setDownloadingIds((prev) => prev.filter((i) => i !== item.ID));
    }
  };

  // FIX: removeSavedDbFile didn't exist anywhere in scope — this was a
  // guaranteed runtime crash on click. Replaced with the real marker
  // deletion. As with Transliteration.tsx, underlying per-Surah Ayaat
  // cache entries aren't purged since there's no Delete_Saved_Ayaat export.
  const handleDeleteDownload = async (id: string) => {
    try {
      await Remove_Translation_Download(id);
      setDownloadedIds((prev) => prev.filter((item) => item !== id));
    } catch (err) {
      console.error(`Failed to delete translation "${id}":`, err);
    }
  };

  const filteredItems = availableTranslations.filter(
    (item) =>
      item.Name.toLowerCase().includes(search.toLowerCase()) ||
      item.Language.toLowerCase().includes(search.toLowerCase())
  );

  const activeList = filteredItems.filter((item) =>
    activeTranslationIds.includes(item.ID)
  );
  const inactiveList = filteredItems.filter(
    (item) => !activeTranslationIds.includes(item.ID)
  );

  const activeByLanguage = activeList.reduce<Record<string, Translation_List_Entry[]>>(
    (acc, item) => {
      acc[item.Language] = acc[item.Language] || [];
      acc[item.Language].push(item);
      return acc;
    },
    {}
  );

  const inactiveByLanguage = inactiveList.reduce<Record<string, Translation_List_Entry[]>>(
    (acc, item) => {
      acc[item.Language] = acc[item.Language] || [];
      acc[item.Language].push(item);
      return acc;
    },
    {}
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading translations...</span>
      </div>
    );
  }

  if (isMobile && showTranslatorList) {
    return (
      <MobileNavigator
        isOpen={showTranslatorList}
        onClose={() => setShowTranslatorList(false)}
        title="Select Translators"
        options={availableTranslations.map((t) => ({
          id: t.ID,
          label: `${t.Language} - ${t.Name}`,
        }))}
        selectedId={activeTranslationIds[0]}
        onSelect={toggleTranslation}
      />
    );
  }

  const hasActive = activeList.length > 0;

  return (
    <div className="space-y-4">
      {/* Font Size Slider */}
      <Card className="py-2.5 px-4 bg-card">
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-sm whitespace-nowrap">
            Font Size: {translationFontSize}
          </span>
          <Slider
            value={[translationFontSize]}
            onValueChange={(value) => setTranslationFontSize(value[0])}
            min={1}
            max={10}
            step={1}
            className="flex-1"
          />
        </div>
      </Card>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search languages or translators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-2 border-black dark:border-white rounded-full focus:border-primary transition-colors"
        />
      </div>

      {/* Active Container */}
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
                          const isDownloaded = downloadedIds.includes(item.ID);
                          const isDownloading = downloadingIds.includes(item.ID);

                          return (
                            <div
                              key={item.ID}
                              onClick={() => toggleTranslation(item.ID)}
                              className="flex items-center justify-between px-4 py-2.5 rounded-full border-2 border-primary bg-card hover:bg-muted cursor-pointer transition-all"
                            >
                              <span className="text-sm font-medium">{item.Name}</span>

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
                                    onClick={() => handleDeleteDownload(item.ID)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                                    onClick={() => handleDownload(item)}
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

      {/* Inactive Container */}
      <Container className="p-4 space-y-3 bg-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Inactive
        </h3>

        {Object.keys(inactiveByLanguage).length === 0 ? (
          <div className="text-sm text-muted-foreground italic text-center py-2">
            All available translations are active.
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
                          const isDownloaded = downloadedIds.includes(item.ID);
                          const isDownloading = downloadingIds.includes(item.ID);

                          return (
                            <div
                              key={item.ID}
                              onClick={() => toggleTranslation(item.ID)}
                              className="flex items-center justify-between px-4 py-2 rounded-full border border-border bg-card hover:bg-muted cursor-pointer transition-all"
                            >
                              <span className="text-sm font-medium">{item.Name}</span>

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
                                    onClick={() => handleDeleteDownload(item.ID)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full gap-1.5 px-3 py-1 text-xs bg-card hover:bg-muted"
                                    onClick={() => handleDownload(item)}
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
  );
}