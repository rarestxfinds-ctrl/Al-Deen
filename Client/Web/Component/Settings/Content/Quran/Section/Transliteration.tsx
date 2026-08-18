// Component/Settings/Content/Quran/Section/Transliteration.tsx
import { useState, useEffect } from "react";
import { Search, Download, ChevronDown, ChevronRight, Loader2, Trash2, Check } from "lucide-react";
import { Card } from "@Web/Component/UI/Card";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { Slider } from "@Web/Component/UI/Slider";
import { Input } from "@Web/Component/UI/Input";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { MobileNavigator } from "../Utility";
import { useApp } from "@Web/Context/App";

// FIX: the previous import used camelCase names (`fetchTransliterationList`,
// `TransliterationListEntry`) that don't exist in Quran-API.ts. The real
// exports are `Fetch_Transliteration_List` and `Transliteration_List_Entry`,
// and the entry shape is capitalized: { ID, Name, Language }.
import {
  Fetch_Transliteration_List,
  Fetch_Surah_Transliteration,
  type Transliteration_List_Entry,
} from "@Web/../Source/Library/Quran-API";

// FIX: Offline-DB.ts (buildTransliterationPath / isAvailableOffline /
// downloadForOfflineUse) isn't a real module — there's no standalone
// offline-file abstraction. Service-Worker-Cache-Store.ts is what actually
// persists data, and it only exposes namespaced get/save/delete helpers
// (Suwar-Metadata, Surah, Ayaat, Kalimaat), keyed via Build_Surah_Key.
//
// "Downloading" a transliterator now means: fetch that edition's verse
// text for every Surah (which Fetch_Surah_Transliteration already caches
// into the "Ayaat" namespace via Save_Ayaat_Locally internally), then
// record a completion marker under the "Kalimaat" namespace since that's
// the only generic write-a-value-under-a-key primitive that's exported.
//
// NOTE: there is no Delete_Saved_Ayaat export, so deleting a download can
// only remove the completion marker below — it can't purge the underlying
// per-Surah ayah cache entries. That's a real gap in Service-Worker-Cache-Store,
// not an oversight here.
import {
  Get_Saved_Kalimaat,
  Save_Kalimaat_Locally,
  Delete_Saved_Kalimaat,
} from "@Web/../Source/Library/Service-Worker-Cache-Store";

const NONE_ID = "None";
const TOTAL_SURAH_COUNT = 114;

const Build_Download_Marker_Key = (Edition_ID: string) => `Transliteration-Download::${Edition_ID}`;

const Is_Transliterator_Downloaded = async (Edition_ID: string): Promise<boolean> => {
  const Marker = await Get_Saved_Kalimaat<boolean>(Build_Download_Marker_Key(Edition_ID));
  return Marker === true;
};

const Download_Transliterator = async (Edition_ID: string): Promise<void> => {
  const Surah_Numbers = Array.from({ length: TOTAL_SURAH_COUNT }, (_, Idx) => Idx + 1);

  const Results = await Promise.allSettled(
    Surah_Numbers.map((Surah_Number) =>
      Fetch_Surah_Transliteration(Surah_Number, Edition_ID, /* Need_Ayah */ true, /* Need_Word */ false)
    )
  );

  const Failed = Results.filter((R) => R.status === "rejected");
  if (Failed.length > 0) {
    throw new Error(`Failed to cache ${Failed.length}/${TOTAL_SURAH_COUNT} Surahs for "${Edition_ID}".`);
  }

  await Save_Kalimaat_Locally(Build_Download_Marker_Key(Edition_ID), true);
};

const Remove_Transliterator_Download = (Edition_ID: string): Promise<void> =>
  Delete_Saved_Kalimaat(Build_Download_Marker_Key(Edition_ID));

export function Transliteration() {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [showTransliteratorList, setShowTransliteratorList] = useState(false);
  const [search, setSearch] = useState("");

  const [availableTransliterators, setAvailableTransliterators] = useState<Transliteration_List_Entry[]>([]);

  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  const [expandedActiveLangs, setExpandedActiveLangs] = useState<string[]>([]);
  const [expandedInactiveLangs, setExpandedInactiveLangs] = useState<string[]>([]);

  const {
    selectedAyahTransliterator,
    setSelectedAyahTransliterator,
    transliterationSize,
    setTransliterationSize,
  } = useApp();

  useEffect(() => {
    async function loadTransliterators() {
      try {
        const list = await Fetch_Transliteration_List();
        setAvailableTransliterators(list);

        if (list.length > 0) {
          setExpandedInactiveLangs([list[0].Language]);
        }
      } catch (err) {
        console.error("Error fetching transliterator list:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (availableTransliterators.length === 0) {
      loadTransliterators();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FIX: check the real completion marker in Service-Worker-Cache-Store
  // instead of assuming everything starts "not downloaded" after remount.
  useEffect(() => {
    let cancelled = false;

    async function checkExistingDownloads() {
      if (availableTransliterators.length === 0) return;

      const checks = await Promise.all(
        availableTransliterators.map(async (item) => {
          const downloaded = await Is_Transliterator_Downloaded(item.ID);
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
  }, [availableTransliterators]);

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

  // FIX: real download — pulls every Surah's verse text through
  // Fetch_Surah_Transliteration (which caches via Save_Ayaat_Locally),
  // then writes a completion marker, instead of faking a delay.
  const handleDownload = async (item: Transliteration_List_Entry) => {
    setDownloadingIds((prev) => [...prev, item.ID]);

    try {
      await Download_Transliterator(item.ID);
      setDownloadedIds((prev) => [...prev, item.ID]);
    } catch (err) {
      console.error(`Failed to download transliterator "${item.ID}":`, err);
    } finally {
      setDownloadingIds((prev) => prev.filter((i) => i !== item.ID));
    }
  };

  // FIX: clears the real completion marker via Delete_Saved_Kalimaat.
  // (Underlying per-Surah Ayaat cache entries aren't purged — see the
  // note above on the missing Delete_Saved_Ayaat export.)
  const handleDeleteDownload = async (id: string) => {
    try {
      await Remove_Transliterator_Download(id);
    } catch (err) {
      console.error(`Failed to remove download marker for "${id}":`, err);
    } finally {
      setDownloadedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const filteredItems = availableTransliterators.filter(
    (item) =>
      item.Name.toLowerCase().includes(search.toLowerCase()) ||
      item.Language.toLowerCase().includes(search.toLowerCase())
  );

  // Single-select: "active" is just the one currently selected transliterator.
  const activeList = filteredItems.filter((item) => item.ID === selectedAyahTransliterator);
  const inactiveList = filteredItems.filter((item) => item.ID !== selectedAyahTransliterator);

  const activeByLanguage = activeList.reduce<Record<string, Transliteration_List_Entry[]>>(
    (acc, item) => {
      acc[item.Language] = acc[item.Language] || [];
      acc[item.Language].push(item);
      return acc;
    },
    {}
  );

  const inactiveByLanguage = inactiveList.reduce<Record<string, Transliteration_List_Entry[]>>(
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
        <span>Loading transliterators...</span>
      </div>
    );
  }

  if (isMobile && showTransliteratorList) {
    return (
      <MobileNavigator
        isOpen={showTransliteratorList}
        onClose={() => setShowTransliteratorList(false)}
        title="Select Transliterator"
        options={availableTransliterators.map((t) => ({
          id: t.ID,
          label: `${t.Language} - ${t.Name}`,
        }))}
        selectedId={selectedAyahTransliterator}
        onSelect={setSelectedAyahTransliterator}
      />
    );
  }

  const hasActive = activeList.length > 0 && selectedAyahTransliterator !== NONE_ID;

  return (
    <div className="space-y-4">
      {/* Font Size Slider */}
      {selectedAyahTransliterator !== NONE_ID && (
        <Card className="py-2.5 px-4 bg-card">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-sm whitespace-nowrap">
              Font Size: {transliterationSize}
            </span>
            <Slider
              value={[transliterationSize]}
              onValueChange={(value) => setTransliterationSize(value[0])}
              min={1}
              max={10}
              step={1}
              className="flex-1"
            />
          </div>
        </Card>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search languages or transliterators..."
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
                              onClick={() =>
                                setSelectedAyahTransliterator(
                                  item.ID === selectedAyahTransliterator ? NONE_ID : item.ID
                                )
                              }
                              className="flex items-center justify-between px-4 py-2.5 rounded-full border-2 border-primary bg-card hover:bg-muted cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-primary" />
                                <span className="text-sm font-medium">{item.Name}</span>
                              </div>

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
            No other transliterators available.
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
                              onClick={() => setSelectedAyahTransliterator(item.ID)}
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