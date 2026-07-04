// Client/Component/Layout/Header/Navigator/Hadith.tsx
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query"; // 🌟 Swapped for global state query engine
import { Check, ChevronDown } from "lucide-react";
import { Button } from "Client/Component/UI/Button";
import { Container } from "Client/Component/UI/Container";
import { cn } from "Client/Library/utils";
import { NavigatorLayout } from "./Utility";

type HadithLevel = "collection" | "chapter" | "hadith";

// 🌟 Local placeholder tracking array for immediate client fallback structures
const baselineFallbackCollections = [
  {
    id: "Sahih-Muslim",
    slug: "Sahih-Muslim",
    name: "Sahih Muslim",
    author: "Muslim",
    topFolder: "Sahih",
    authorFolder: "Muslim",
    hadithCount: 0, 
    description: "Sahih collection compiled by Muslim."
  }
];

// Fetch matching endpoint declared on your central Node infrastructure instance
async function fetchCorpusFromBackend() {
  const response = await fetch("http://localhost:8081/api/hadith-corpus");
  if (!response.ok) throw new Error("Failed to load backend corpus data");
  return response.json();
}

function parseRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "Hadith") {
    return {
      collectionSlug: parts[1],
      chapterId: parts[2],
      hadithId: parts[3],
    };
  }
  return null;
}

export function isHadithPath(pathname: string) {
  return parseRoute(pathname) !== null;
}

export function Hadith_Navigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const route = parseRoute(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const [isDesktopCategoryOpen, setIsDesktopCategoryOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<HadithLevel>(() => {
    if (route?.hadithId) return "hadith";
    if (route?.chapterId) return "chapter";
    return "collection";
  });

  const [drillCollection, setDrillCollection] = useState<string | undefined>(route?.collectionSlug);
  const [drillChapter, setDrillChapter] = useState<string | undefined>(route?.chapterId);
  
  const [drillStep, setDrillStep] = useState<HadithLevel>(() => {
    if (route?.hadithId) return "hadith";
    if (route?.chapterId) return "chapter";
    return "collection";
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // 🌟 Read data directly from Node backend query engine
  const { data: corpus } = useQuery({
    queryKey: ["hadithCorpusBackend"],
    queryFn: fetchCorpusFromBackend,
    staleTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    const activeRoute = parseRoute(location.pathname);
    setDrillCollection(activeRoute?.collectionSlug);
    setDrillChapter(activeRoute?.chapterId);

    if (activeRoute?.hadithId) {
      setActiveTab("hadith");
      setDrillStep("hadith");
    } else if (activeRoute?.chapterId) {
      setActiveTab("chapter");
      setDrillStep("chapter");
    } else {
      setActiveTab("collection");
      setDrillStep("collection");
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

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSearchQuery("");
      const activeRoute = parseRoute(location.pathname);

      setDrillCollection(activeRoute?.collectionSlug);
      setDrillChapter(activeRoute?.chapterId);
      
      if (activeRoute?.hadithId) {
        setActiveTab("hadith");
        setDrillStep("hadith");
      } else if (activeRoute?.chapterId) {
        setActiveTab("chapter");
        setDrillStep("chapter");
      } else {
        setActiveTab("collection");
        setDrillStep("collection");
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

  const commitCollection = useCallback((slug: string) => {
    setDrillCollection(slug);
    if (activeTab === "collection") {
      navigate(`/Hadith/${slug}`);
      closeAll();
    } else {
      setDrillStep("chapter");
    }
  }, [activeTab, navigate]);

  const commitChapter = useCallback((chapterId: string) => {
    setDrillChapter(chapterId);
    if (activeTab === "chapter") {
      if (!drillCollection) return;
      navigate(`/Hadith/${drillCollection}/${chapterId}`);
      closeAll();
    } else {
      setDrillStep("hadith");
    }
  }, [activeTab, drillCollection, navigate]);

  const commitHadith = useCallback((hadithId: string) => {
    if (!drillCollection || !drillChapter) return;
    navigate(`/Hadith/${drillCollection}/${drillChapter}/${hadithId}`);
    closeAll();
  }, [drillCollection, drillChapter, navigate]);

  const handleGoBack = useCallback(() => {
    if (drillStep === "hadith") {
      setDrillStep("chapter");
    } else if (drillStep === "chapter") {
      setDrillStep("collection");
    }
  }, [drillStep]);

  const showGoBack = useMemo(() => {
    return drillStep !== "collection";
  }, [drillStep]);

  const filteredCollections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    // 🌟 Safely point source mapping parameters to cache or fallback array
    const sourceCollections = corpus?.collections || baselineFallbackCollections;
    return sourceCollections.filter((c: any) =>
      !q ? true : c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [corpus, searchQuery]);

  const chaptersForDrill = useMemo(() => {
    if (!drillCollection || !corpus?.collections) return [];
    const targetColl = corpus.collections.find((c: any) => c.slug.toLowerCase() === drillCollection.toLowerCase());
    const list = targetColl?.chapters || [];
    const q = searchQuery.toLowerCase().trim();
    return q ? list.filter((c: any) => c.name.toLowerCase().includes(q) || c.id.toString().includes(q)) : list;
  }, [drillCollection, corpus, searchQuery]);

  const hadithIdsForDrill = useMemo(() => {
    if (!drillCollection || !drillChapter || !corpus?.collections) return [];
    const targetColl = corpus.collections.find((c: any) => c.slug.toLowerCase() === drillCollection.toLowerCase());
    const targetChap = targetColl?.chapters?.find((ch: any) => ch.id === drillChapter);
    return targetChap?.hadiths?.map((h: any) => h.id) ?? [];
  }, [drillCollection, drillChapter, corpus]);

  const buttonLabel = useMemo(() => {
    if (route?.hadithId) return `Hadith ${route.hadithId}`;
    if (route?.chapterId) {
      const targetColl = corpus?.collections?.find((c: any) => c.slug.toLowerCase() === route.collectionSlug?.toLowerCase());
      const targetChap = targetColl?.chapters?.find((ch: any) => ch.id === route.chapterId);
      return targetChap?.name ?? `Chapter ${route.chapterId}`;
    }
    if (route?.collectionSlug) {
      // 🌟 Point inline label compiler to correct data source safely
      const sourceCollections = corpus?.collections || baselineFallbackCollections;
      const c = sourceCollections.find((x: any) => x.slug.toLowerCase() === route.collectionSlug?.toLowerCase());
      return c?.name ?? route.collectionSlug;
    }
    return "Hadith";
  }, [route, corpus]);

  const tabOptions = useMemo(() => [
    { id: "collection" as HadithLevel, label: "Collection" },
    { id: "chapter" as HadithLevel, label: "Chapter" },
    { id: "hadith" as HadithLevel, label: "Hadith" }
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
          {tabOptions.find((o) => o.id === activeTab)?.label ?? "Browse"}
          <ChevronDown className={cn("h-5 w-5 ml-1 transition-transform duration-200", isMobileCategoryOpen && "rotate-180")} />
        </Button>

        {isMobileCategoryOpen && (
          <div
            className="absolute left-0 top-full mt-1 min-w-[140px] border border-border/40 bg-popover text-popover-foreground shadow-md z-[10003] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {tabOptions.map((opt) => (
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
          {tabOptions.find((o) => o.id === activeTab)?.label ?? "Browse"}
          <ChevronDown className={cn("h-5 w-5 ml-1 transition-transform duration-200", isDesktopCategoryOpen && "rotate-180")} />
        </Button>

        {isDesktopCategoryOpen && (
          <div
            className="absolute left-0 top-full mt-1 min-w-[140px] border border-border/40 bg-popover text-popover-foreground shadow-md z-[10003] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {tabOptions.map((opt) => (
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

  const handleCategorySelect = (optId: HadithLevel, screenMode: "mobile" | "desktop") => {
    if (screenMode === "mobile") {
      setIsMobileCategoryOpen(false);
    } else {
      setIsDesktopCategoryOpen(false);
    }

    setActiveTab(optId);
    setSearchQuery("");
    setDrillStep("collection");
  };

  if (route && !route.collectionSlug) {
    return (
      <Container className="!py-1 !px-3 inline-flex w-auto max-w-[70%]">
        <span className="text-sm font-medium truncate">{buttonLabel}</span>
      </Container>
    );
  }

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
        {drillStep === "collection" ? (
          <div className="flex flex-col gap-1.5 px-3 pt-2 sm:p-2">
            {filteredCollections.map((c: any) => {
              const isActive = drillCollection?.toLowerCase() === c.slug.toLowerCase();
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => commitCollection(c.slug)}
                  className={getNativeButtonClassName(isActive)}
                >
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        ) : drillStep === "chapter" ? (
          <div className="flex flex-col gap-1.5 px-3 pt-2 sm:p-2">
            {chaptersForDrill.map((c: any) => {
              const isActive = drillChapter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => commitChapter(c.id)}
                  className={getNativeButtonClassName(isActive)}
                >
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
            {chaptersForDrill.length === 0 && (
              <p className="text-xs text-muted-foreground p-8 text-center">No results found</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col px-3 pt-2 sm:p-2 snap-start">
            <div className="grid grid-cols-5 gap-2 p-2 bg-background rounded-xl shadow-sm">
              {hadithIdsForDrill.map((id: string) => {
                const isActive = route?.hadithId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => commitHadith(id)}
                    className={cn(
                      "h-9 w-full min-w-0 flex items-center justify-center text-xs font-normal focus:outline-none transition-colors duration-200 rounded-full aspect-square",
                      isActive
                        ? "bg-accent text-accent-foreground font-semibold border border-border/60"
                        : "bg-card border border-border/30 text-card-foreground sm:hover:bg-accent sm:hover:text-accent-foreground"
                    )}
                  >
                    {id}
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