import { useState, useEffect } from "react";
import { Search, Download, Loader2, Trash2 } from "lucide-react";
import { Card } from "@Web/Component/UI/Card";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { Slider } from "@Web/Component/UI/Slider";
import { Input } from "@Web/Component/UI/Input";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { MobileNavigator } from "../Utility";
import { useApp } from "@Web/Context/App";

import {
  Fetch_Transliteration_List,
  Fetch_Hadith_Transliteration,
  Fetch_Collections,
  Get_Chapters,
  Get_Chapter,
  type Transliteration_List_Entry,
} from "@/Library/Hadith-API";

import {
  Get_Saved_Kalimaat,
  Save_Kalimaat_Locally,
  Delete_Saved_Kalimaat,
} from "@/Library/Service-Worker-Cache-Store";

const Build_Download_Marker_Key = (Edition_ID: string) =>
  `Hadith-Transliteration-Download::${Edition_ID}`;

const Is_Transliterator_Downloaded = async (Edition_ID: string): Promise<boolean> => {
  const Marker = await Get_Saved_Kalimaat<boolean>(Build_Download_Marker_Key(Edition_ID));
  return Marker === true;
};

const Download_Transliterator = async (Edition_ID: string): Promise<void> => {
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

  const uniqueHadithIds = Array.from(new Set(allHadithIds));

  if (uniqueHadithIds.length > 0) {
    await Fetch_Hadith_Transliteration(
      uniqueHadithIds,
      Edition_ID,
      true,
      false
    );
  }

  await Save_Kalimaat_Locally(Build_Download_Marker_Key(Edition_ID), true);
};

const Remove_Transliterator_Download = (Edition_ID: string): Promise<void> =>
  Delete_Saved_Kalimaat(Build_Download_Marker_Key(Edition_ID));

export function TransliterationSection() {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [showTransliteratorList, setShowTransliteratorList] = useState(false);
  const [search, setSearch] = useState("");

  const [availableTransliterators, setAvailableTransliterators] = useState<Transliteration_List_Entry[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  const {
    hadithTransliterationFontSize,
    setHadithTransliterationFontSize,
    selectedHadithTransliterationEdition,
    setSelectedHadithTransliterationEdition,
  } = useApp();

  useEffect(() => {
    async function loadTransliterators() {
      try {
        const list = await Fetch_Transliteration_List();
        setAvailableTransliterators(list);
      } catch (err) {
        console.error("Error fetching Hadith transliterator list:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTransliterators();
  }, []);

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

  const handleDeleteDownload = async (id: string) => {
    try {
      await Remove_Transliterator_Download(id);
      setDownloadedIds((prev) => prev.filter((item) => item !== id));
    } catch (err) {
      console.error(`Failed to delete transliterator "${id}":`, err);
    }
  };

  const toggleEdition = (id: string) => {
    if (selectedHadithTransliterationEdition === id) {
      setSelectedHadithTransliterationEdition("");
    } else {
      setSelectedHadithTransliterationEdition(id);
    }
  };

  const filteredItems = availableTransliterators.filter(
    (item) =>
      item.Name.toLowerCase().includes(search.toLowerCase()) ||
      item.Language.toLowerCase().includes(search.toLowerCase())
  );

  const activeList = filteredItems.filter(
    (item) => item.ID === selectedHadithTransliterationEdition
  );
  const inactiveList = filteredItems.filter(
    (item) => item.ID !== selectedHadithTransliterationEdition
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
        selectedId={selectedHadithTransliterationEdition}
        onSelect={(id) => setSelectedHadithTransliterationEdition(id)}
      />
    );
  }

  const hasActive = activeList.length > 0;

  return (
    <div className="space-y-4">
      {/* Title Badge */}
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <p className="text-xs font-medium text-foreground">Transliteration</p>
      </div>

      {/* Font Size Slider */}
      <Card className="py-2.5 px-4 bg-card">
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-sm whitespace-nowrap">
            Font Size: {hadithTransliterationFontSize}
          </span>
          <Slider
            value={[hadithTransliterationFontSize]}
            onValueChange={(value) => setHadithTransliterationFontSize(value[0])}
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

          <div className="space-y-2">
            {activeList.map((item) => {
              const isDownloaded = downloadedIds.includes(item.ID);
              const isDownloading = downloadingIds.includes(item.ID);

              return (
                <div
                  key={item.ID}
                  onClick={() => toggleEdition(item.ID)}
                  className="flex items-center justify-between px-4 py-2.5 rounded-full border-2 border-primary bg-card hover:bg-muted cursor-pointer transition-all"
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
                          handleDownload(item);
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

      {/* Inactive Container */}
      <Container className="p-4 space-y-3 bg-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Inactive
        </h3>

        {inactiveList.length === 0 ? (
          <div className="text-sm text-muted-foreground italic text-center py-2">
            No other transliterators available.
          </div>
        ) : (
          <div className="space-y-2">
            {inactiveList.map((item) => {
              const isDownloaded = downloadedIds.includes(item.ID);
              const isDownloading = downloadingIds.includes(item.ID);

              return (
                <div
                  key={item.ID}
                  onClick={() => toggleEdition(item.ID)}
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
                          handleDownload(item);
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
  );
}