// @/Component/Layout/Header/Navigator/Aid.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/Component/UI/Button";
import { cn } from "@/Library/utils";
import { NavigatorLayout } from "./Utility";

type ViewDepth = "Category" | "Subcategory" | "Sub-Subcategory" | "Detail";
type DrillState = "root" | "module-select" | "category-select" | "subcategory-select";

interface AidNavigatorProps {
  onOpenChange?: (open: boolean) => void;
}

const ALLOWED_SECTIONS = ["Feeling", "Prophets", "Arabic", "Dua", "Pillars", "Articles"];

const SECTION_LABELS: Record<string, string> = {
  Dua: "Dua",
  Prophets: "Prophets",
  Articles: "6 Articles of Faith",
  Pillars: "5 Pillars",
  Feeling: "Feelings",
  Arabic: "Arabic",
};

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

function parseAidRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "Aid" && parts[1]) {
    let section = parts[1];

    const isTajweed = section === "Tajweed" || parts[2] === "Tajweed";
    const isAlphabet = section === "Alphabet" || parts[2] === "Alphabet";
    const isVocabulary = section === "Vocabulary" || parts[2] === "Vocabulary";

    if (section === "Alphabet" || section === "Vocabulary" || section === "Tajweed") {
      section = "Arabic";
    }

    if (!ALLOWED_SECTIONS.includes(section)) {
      return null;
    }

    const hasSubfolder = parts[2] === "Tajweed" || parts[2] === "Vocabulary" || parts[2] === "Alphabet";
    const p1 = hasSubfolder ? parts[3] : parts[2];
    const p2 = hasSubfolder ? parts[4] : parts[3];
    const p3 = hasSubfolder ? parts[5] : parts[4];

    if (section !== "Arabic" && !p1) {
      return null;
    }

    return {
      sectionSlug: section,
      isTajweed,
      isAlphabet,
      isVocabulary,
      param1: p1,
      param2: p2,
      param3: p3,
    };
  }
  return null;
}

export function Aid_Navigator({ onOpenChange }: AidNavigatorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const route = parseAidRoute(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [currentDepth, setCurrentDepth] = useState<ViewDepth>("Category");
  const [isMobileDepthOpen, setIsMobileDepthOpen] = useState(false);
  const [isDesktopDepthOpen, setIsDesktopDepthOpen] = useState(false);
  
  const [drillStep, setDrillStep] = useState<DrillState>("root");
  const [selectedModule, setSelectedModule] = useState<"Vocabulary" | "Tajweed" | "Alphabet" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isLockActive = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hook into your asynchronous client query cache pipeline
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (!route) return null;

  const activeSection = route.sectionSlug;
  const isArabicModule = activeSection === "Arabic";
  const sectionLabel = SECTION_LABELS[activeSection] ?? "Aid";

  useEffect(() => {
    if (!isArabicModule) {
      setCurrentDepth("Category");
      return;
    }
    
    if (isLockActive.current) {
      return;
    }
    
    if (route.param3 || route.isAlphabet) {
      setCurrentDepth("Detail");
    } else if (route.param2) {
      setCurrentDepth("Sub-Subcategory");
    } else if (route.param1) {
      setCurrentDepth("Subcategory");
    } else {
      setCurrentDepth("Category");
    }
  }, [location.pathname, isArabicModule, route]);

  useEffect(() => {
    setDrillStep("root");
    setSelectedModule(null);
    setSelectedCategory(null);
  }, [currentDepth]);

  useEffect(() => {
    onOpenChange?.(isOpen);
    return () => onOpenChange?.(false);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isMobileDepthOpen && !isDesktopDepthOpen) return;
    const handleOutsideClick = () => {
      setIsMobileDepthOpen(false);
      setIsDesktopDepthOpen(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isMobileDepthOpen, isDesktopDepthOpen]);

  const closeAll = () => {
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery("");
    setIsMobileDepthOpen(false);
    setIsDesktopDepthOpen(false);
    setDrillStep("root");
    setSelectedModule(null);
    setSelectedCategory(null);
    isLockActive.current = false;
  };

  const handleGoBack = useCallback(() => {
    if (drillStep === "subcategory-select") {
      setDrillStep("category-select");
    } else if (drillStep === "category-select") {
      setDrillStep("module-select");
    } else if (drillStep === "module-select") {
      setDrillStep("root");
      setSelectedModule(null);
    }
  }, [drillStep]);

  const showGoBack = useMemo(() => {
    return isArabicModule && drillStep !== "root";
  }, [isArabicModule, drillStep]);

  // Dynamically resolve vocabulary/tree queries against the local client cache state
  const sectionItems = useMemo(() => {
    const items: { slug: string; name: string; isBranchTrigger?: boolean; branchAction?: () => void }[] = [];
    if (!corpus) return items;
    
    if (isArabicModule) {
      if (currentDepth === "Category") {
        items.push({ slug: "Aid/Arabic/Tajweed", name: "Tajweed" });
        items.push({ slug: "Aid/Arabic/Vocabulary", name: "Vocabulary" });
        items.push({ slug: "Aid/Arabic/Alphabet", name: "Alphabet" });
      } 
      else if (currentDepth === "Subcategory") {
        if (drillStep === "root") {
          items.push({ slug: "", name: "Vocabulary", isBranchTrigger: true, branchAction: () => { setSelectedModule("Vocabulary"); setDrillStep("module-select"); } });
          items.push({ slug: "", name: "Tajweed", isBranchTrigger: true, branchAction: () => { setSelectedModule("Tajweed"); setDrillStep("module-select"); } });
        } else if (selectedModule === "Vocabulary") {
          const vocabTree = Array.isArray(corpus.arabicVocabulary) ? corpus.arabicVocabulary : [];
          vocabTree.forEach((c: any) => {
            if (!c.subfolders && !c.subFolderCategory?.length) {
              items.push({ slug: `Aid/Arabic/Vocabulary/${c.id}`, name: c.name });
            }
          });
        } else if (selectedModule === "Tajweed") {
          const tajweedTree = Array.isArray(corpus.tajweedCategories) ? corpus.tajweedCategories : [];
          tajweedTree.forEach((t: any) => {
            if (!t.subfolders?.length) {
              items.push({ slug: `Aid/Arabic/Tajweed/${t.id}`, name: t.name });
            }
          });
        }
      } 
      else if (currentDepth === "Sub-Subcategory") {
        if (drillStep === "root") {
          items.push({ slug: "", name: "Vocabulary", isBranchTrigger: true, branchAction: () => { setSelectedModule("Vocabulary"); setDrillStep("module-select"); } });
          items.push({ slug: "", name: "Tajweed", isBranchTrigger: true, branchAction: () => { setSelectedModule("Tajweed"); setDrillStep("module-select"); } });
        } 
        else if (drillStep === "module-select") {
          if (selectedModule === "Vocabulary") {
            const vocabTree = Array.isArray(corpus.arabicVocabulary) ? corpus.arabicVocabulary : [];
            vocabTree.forEach((c: any) => {
              if (!c.subfolders && !c.subFolderCategory?.length) {
                items.push({ slug: "", name: c.name, isBranchTrigger: true, branchAction: () => { setSelectedCategory(c.id); setDrillStep("category-select"); } });
              }
            });
          } else if (selectedModule === "Tajweed") {
            const tajweedTree = Array.isArray(corpus.tajweedCategories) ? corpus.tajweedCategories : [];
            tajweedTree.forEach((t: any) => {
              if (!t.subfolders?.length && t.subcategories?.length) {
                items.push({ slug: "", name: t.name, isBranchTrigger: true, branchAction: () => { setSelectedCategory(t.id); setDrillStep("category-select"); } });
              }
            });
          }
        } 
        else if (drillStep === "category-select" && selectedCategory) {
          if (selectedModule === "Vocabulary") {
            const vocabTree = Array.isArray(corpus.arabicVocabulary) ? corpus.arabicVocabulary : [];
            const target = vocabTree.find((c: any) => c.id === selectedCategory);
            target?.subcategories?.forEach((sub: any) => {
              items.push({ slug: `Aid/Arabic/Vocabulary/${selectedCategory}/${sub.id}`, name: sub.name });
            });
          } else if (selectedModule === "Tajweed") {
            const tajweedTree = Array.isArray(corpus.tajweedCategories) ? corpus.tajweedCategories : [];
            const target = tajweedTree.find((t: any) => t.id === selectedCategory);
            target?.subcategories?.forEach((sub: any) => {
              items.push({ slug: `Aid/Arabic/Tajweed/${selectedCategory}/${sub.id}`, name: sub.name });
            });
          }
        }
      } 
      else if (currentDepth === "Detail") {
        if (drillStep === "root") {
          items.push({ slug: "", name: "Vocabulary", isBranchTrigger: true, branchAction: () => { setSelectedModule("Vocabulary"); setDrillStep("module-select"); } });
          items.push({ slug: "", name: "Tajweed", isBranchTrigger: true, branchAction: () => { setSelectedModule("Tajweed"); setDrillStep("module-select"); } });
          items.push({ slug: "", name: "Alphabet", isBranchTrigger: true, branchAction: () => { setSelectedModule("Alphabet"); setDrillStep("module-select"); } });
        } 
        else if (drillStep === "module-select") {
          if (selectedModule === "Alphabet") {
            const alphabet = corpus.alphabet || corpus.letters || [];
            alphabet.forEach((l: any, idx: number) => {
              items.push({ slug: `Aid/Arabic/Alphabet/${idx + 1}`, name: `Letter ${l.name}` });
            });
          } else if (selectedModule === "Vocabulary") {
            const vocabTree = Array.isArray(corpus.arabicVocabulary) ? corpus.arabicVocabulary : [];
            vocabTree.forEach((c: any) => {
              if (!c.subfolders && !c.subFolderCategory?.length) {
                items.push({ slug: "", name: c.name, isBranchTrigger: true, branchAction: () => { setSelectedCategory(c.id); setDrillStep("category-select"); } });
              }
            });
          } else if (selectedModule === "Tajweed") {
            const tajweedTree = Array.isArray(corpus.tajweedCategories) ? corpus.tajweedCategories : [];
            tajweedTree.forEach((t: any) => {
              if (!t.subfolders?.length) {
                items.push({ slug: "", name: t.name, isBranchTrigger: true, branchAction: () => { setSelectedCategory(t.id); setDrillStep("category-select"); } });
              }
            });
          }
        }
        else if (drillStep === "category-select" && selectedCategory) {
          if (selectedModule === "Vocabulary") {
            const vocabTree = Array.isArray(corpus.arabicVocabulary) ? corpus.arabicVocabulary : [];
            const target = vocabTree.find((c: any) => c.id === selectedCategory);
            target?.subcategories?.forEach((sub: any) => {
              items.push({ slug: "", name: sub.name, isBranchTrigger: true, branchAction: () => { setSelectedCategory(sub.id); setDrillStep("subcategory-select"); } });
            });
          } else if (selectedModule === "Tajweed") {
            const tajweedTree = Array.isArray(corpus.tajweedCategories) ? corpus.tajweedCategories : [];
            const target = tajweedTree.find((t: any) => t.id === selectedCategory);
            target?.subcategories?.forEach((sub: any) => {
              items.push({ slug: "", name: sub.name, isBranchTrigger: true, branchAction: () => { setSelectedCategory(sub.id); setDrillStep("subcategory-select"); } });
            });
          }
        }
        else if (drillStep === "subcategory-select" && selectedCategory) {
          const originalCatId = route.param1 || "";
          if (selectedModule === "Vocabulary") {
            const vocabTree = Array.isArray(corpus.arabicVocabulary) ? corpus.arabicVocabulary : [];
            const parentCat = vocabTree.find((c: any) => c.id === originalCatId);
            const targetSub = parentCat?.subcategories?.find((s: any) => s.id === selectedCategory);
            targetSub?.words?.forEach((w: any) => {
              items.push({ slug: `Aid/Arabic/Vocabulary/${originalCatId}/${selectedCategory}/${w.id}`, name: w.english });
            });
          } else if (selectedModule === "Tajweed") {
            const tajweedTree = Array.isArray(corpus.tajweedCategories) ? corpus.tajweedCategories : [];
            const parentCat = tajweedTree.find((t: any) => t.id === originalCatId);
            const targetSub = parentCat?.subcategories?.find((s: any) => s.id === selectedCategory);
            targetSub?.rules?.forEach((r: any) => {
              items.push({ slug: `Aid/Arabic/Tajweed/${originalCatId}/${selectedCategory}/${r.id || r.name}`, name: r.name });
            });
          }
        }
      }
    } 
    else if (activeSection === "Dua") {
      const duas = corpus.duas || corpus.duaCategories || [];
      duas.forEach((d: any) => {
        items.push({ slug: `Aid/Dua/${d.name.replace(/ /g, "-")}`, name: d.name });
      });
    } else if (activeSection === "Prophets") {
      const prophets = corpus.prophets || [];
      prophets.forEach((p: any) => {
        items.push({ slug: `Aid/Prophets/${encodeURIComponent(p.id)}`, name: p.title || p.name });
      });
    } else if (activeSection === "Articles") {
      const articles = corpus.articles || [];
      articles.forEach((a: any) => {
        items.push({ slug: `Aid/Articles/${a.id}`, name: a.name });
      });
    } else if (activeSection === "Pillars") {
      const pillars = corpus.pillars || [];
      pillars.forEach((p: any) => {
        items.push({ slug: `Aid/Pillars/${p.id}`, name: `${p.name} (${p.english})` });
      });
    } else if (activeSection === "Feeling") {
      const feelings = corpus.feelings || [];
      feelings.forEach((f: any) => {
        items.push({ slug: `Aid/Feeling/${f.id}`, name: f.name });
      });
    }
    return items;
  }, [activeSection, currentDepth, route, isArabicModule, drillStep, selectedModule, selectedCategory, corpus]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sectionItems.filter((item) => !q || item.name.toLowerCase().includes(q));
  }, [sectionItems, searchQuery]);

  const handleDepthSelect = (depth: ViewDepth, screenMode: "mobile" | "desktop") => {
    isLockActive.current = true;
    if (screenMode === "mobile") {
      setIsMobileDepthOpen(false);
    } else {
      setIsDesktopDepthOpen(false);
    }
    setCurrentDepth(depth);
    setSearchQuery("");
  };

  const renderHeaderLeftDropdown = (isOpenState: boolean, setOpenState: (o: boolean) => void, screenMode: "mobile" | "desktop") => {
    return (
      <div className="relative inline-block text-left max-w-full z-[10002]">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1 px-2.5 text-xs font-medium text-foreground max-w-full justify-between rounded-full bg-[#fafafa]/80 backdrop-blur-sm [.high-contrast_&]:bg-white [.high-contrast_&]:border-black",
            screenMode === "mobile" ? "h-8" : "h-7"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (isArabicModule) setOpenState(!isOpenState);
          }}
        >
          {isArabicModule ? currentDepth : sectionLabel}
          {isArabicModule && (
            <ChevronDown className={cn("h-5 w-5 ml-1 transition-transform duration-200", isOpenState && "rotate-180")} />
          )}
        </Button>

        {isOpenState && isArabicModule && (
          <div className="absolute left-0 top-full mt-1 min-w-[150px] border border-border/40 bg-popover text-popover-foreground z-[10003] overflow-hidden rounded-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {(["Category", "Subcategory", "Sub-Subcategory", "Detail"] as ViewDepth[]).map((depth) => (
              <button
                key={depth}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDepthSelect(depth, screenMode);
                }}
                className={cn(
                  "w-full flex items-center justify-between text-left px-4 py-2.5 text-xs font-medium rounded-none h-auto border-0 bg-transparent transition-colors duration-200 focus:outline-none sm:hover:bg-accent sm:hover:text-accent-foreground",
                  currentDepth === depth ? "bg-accent text-accent-foreground font-semibold" : "text-popover-foreground"
                )}
              >
                {depth}
                {currentDepth === depth && <Check className="h-5 w-5 ml-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const nativeButtonBase = "w-full justify-start text-left font-normal truncate text-xs h-12 sm:h-9 rounded-lg px-3 sm:px-4 shrink-0 inline-flex items-center gap-2 py-2 transition-colors duration-200 focus:outline-none border snap-start";

  const getNativeButtonClassName = (isActive: boolean) => {
    return cn(
      nativeButtonBase,
      isActive
        ? "bg-accent text-accent-foreground font-semibold border-border/60"
        : "bg-card border-border/30 text-card-foreground sm:hover:bg-accent sm:hover:text-accent-foreground"
    );
  };

  return (
    <NavigatorLayout
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      isSearching={isSearching}
      setIsSearching={setIsSearching}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      buttonLabel={sectionLabel}
      inputRef={inputRef}
      renderMobileHeaderLeft={() => renderHeaderLeftDropdown(isMobileDepthOpen, setIsMobileDepthOpen, "mobile")}
      renderDesktopHeaderLeft={() => renderHeaderLeftDropdown(isDesktopDepthOpen, setIsDesktopDepthOpen, "desktop")}
      showGoBack={showGoBack}
      onGoBack={handleGoBack}
    >
      <div className="flex flex-col gap-1.5 px-3 pt-2 sm:p-2 w-full relative">
        {isLoading && (
          <p className="text-xs text-muted-foreground p-8 text-center animate-pulse">
            Syncing aid corpus menu entries...
          </p>
        )}
        
        {!isLoading && filteredItems.map((item, index) => {
          if (item.isBranchTrigger) {
            return (
              <button
                key={`branch-${index}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  item.branchAction?.();
                }}
                className={getNativeButtonClassName(false)}
              >
                <span className="truncate">{item.name}</span>
              </button>
            );
          }

          const isSelected = location.pathname.toLowerCase().endsWith(item.slug.toLowerCase());
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => {
                isLockActive.current = false;
                navigate(`/${item.slug}`);
                closeAll();
              }}
              className={getNativeButtonClassName(isSelected)}
            >
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}

        {!isLoading && filteredItems.length === 0 && (
          <p className="text-xs text-muted-foreground p-8 text-center">
            No entries found matching specified layout
          </p>
        )}
      </div>
    </NavigatorLayout>
  );
}

export function isAidPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "Aid" || !parts[1]) return false;

  let section = parts[1];
  if (section === "Alphabet" || section === "Vocabulary" || section === "Tajweed") {
    section = "Arabic";
  }

  const allowed = ["Feeling", "Prophets", "Arabic", "Dua", "Pillars", "Articles"];
  if (!allowed.includes(section)) return false;

  if (section !== "Arabic") {
    const hasSubfolder = parts[2] === "Tajweed" || parts[2] === "Vocabulary" || parts[2] === "Alphabet";
    const p1 = hasSubfolder ? parts[3] : parts[2];
    if (!p1) return false;
  }

  return true;
}