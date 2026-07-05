// @/Component/Settings/Layout/Mobile.tsx
import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/Component/UI/Scroll-Area";
import { Button } from "@/Component/UI/Button";
import { ChevronRight, Search } from "lucide-react";
import { SETTINGS_CATEGORIES, getSubcategories } from "../Constants";
import { mobileSettingsStore } from "../mobileSettingsStore";
import type { SettingsCategory, AccountSubcategory, AidSubcategory } from "../Types";

type SubcategoryId = AccountSubcategory | AidSubcategory;

interface MobileProps {
  activeCategory: SettingsCategory;
  activeSubcategory: SubcategoryId | null;
  onCategoryChange: (category: SettingsCategory) => void;
  onSubcategoryChange: (subcategory: SubcategoryId) => void;
  onClose: () => void;
  children: React.ReactNode;
}

export function Mobile({ 
  activeCategory, 
  activeSubcategory, 
  onCategoryChange, 
  onSubcategoryChange, 
  onClose, 
  children 
}: MobileProps) {
  const [view, setView] = useState<"categories" | "subcategories" | "content">("categories");
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Subscribe to store for search mode and query
  useEffect(() => {
    const unsubscribeMode = mobileSettingsStore.subscribe(() => {
      const { isSearchMode } = mobileSettingsStore.getState();
      setIsSearchMode(isSearchMode);
    });
    const unsubscribeQuery = mobileSettingsStore.subscribeSearch(() => {
      setSearchQuery(mobileSettingsStore.getSearchQuery());
    });
    setIsSearchMode(mobileSettingsStore.getState().isSearchMode);
    setSearchQuery(mobileSettingsStore.getSearchQuery());
    return () => {
      unsubscribeMode();
      unsubscribeQuery();
    };
  }, []);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: { category: SettingsCategory; subcategory?: SubcategoryId; label: string }[] = [];
    for (const cat of SETTINGS_CATEGORIES) {
      if (cat.label.toLowerCase().includes(query)) {
        results.push({ category: cat.id, label: cat.label });
      }
      if (cat.hasSubcategories) {
        const subs = getSubcategories(cat.id);
        for (const sub of subs) {
          if (sub.label.toLowerCase().includes(query)) {
            results.push({ category: cat.id, subcategory: sub.id as SubcategoryId, label: sub.label });
          }
        }
      }
    }
    return results;
  }, [searchQuery]);

  // Auto-select top result when search query changes
  useEffect(() => {
    if (!isSearchMode || filteredResults.length === 0) return;
    const top = filteredResults[0];
    if (top.subcategory) {
      onCategoryChange(top.category);
      onSubcategoryChange(top.subcategory);
    } else {
      onCategoryChange(top.category);
      onSubcategoryChange(null as any);
    }
    // Switch to content view (the selected setting will be rendered by the parent)
    setView("content");
  }, [filteredResults, isSearchMode, onCategoryChange, onSubcategoryChange]);

  // Sync store for title/back when not in search mode
  useEffect(() => {
    if (isSearchMode) {
      mobileSettingsStore.setState("Search", true, () => {
        // goBack: exit search mode
        mobileSettingsStore.exitSearchMode();
      }, onClose);
      return;
    }
    let title = "Settings";
    let showBack = false;
    let goBackFn = () => {};
    if (view === "categories") {
      title = "Settings";
      showBack = false;
      goBackFn = () => onClose();
    } else if (view === "subcategories" && selectedCategory) {
      const cat = SETTINGS_CATEGORIES.find(c => c.id === selectedCategory);
      title = cat?.label || "Settings";
      showBack = true;
      goBackFn = () => {
        setView("categories");
        setSelectedCategory(null);
      };
    } else if (view === "content") {
      if (activeSubcategory) {
        const subs = getSubcategories(activeCategory);
        const sub = subs.find(s => s.id === activeSubcategory);
        title = sub?.label || activeCategory;
      } else {
        const cat = SETTINGS_CATEGORIES.find(c => c.id === activeCategory);
        title = cat?.label || "Settings";
      }
      showBack = true;
      goBackFn = () => {
        const catConfig = SETTINGS_CATEGORIES.find(c => c.id === activeCategory);
        if (catConfig?.hasSubcategories) {
          setView("subcategories");
          setSelectedCategory(activeCategory);
        } else {
          setView("categories");
          setSelectedCategory(null);
        }
      };
    }
    mobileSettingsStore.setState(title, showBack, goBackFn, onClose);
  }, [view, selectedCategory, activeCategory, activeSubcategory, onClose, isSearchMode]);

  // Search results view
  if (isSearchMode) {
    return (
      <div className="fixed inset-0 z-40 bg-background">
        <ScrollArea className="h-full">
          <div className="pt-[60px]">
            <div className="p-4">
              {filteredResults.length > 0 ? (
                <div className="space-y-2">
                  {filteredResults.map((item, idx) => (
                    <Button
                      key={idx}
                      onClick={() => {
                        if (item.subcategory) {
                          onCategoryChange(item.category);
                          onSubcategoryChange(item.subcategory);
                        } else {
                          onCategoryChange(item.category);
                          onSubcategoryChange(null as any);
                        }
                        // Exit search mode
                        mobileSettingsStore.exitSearchMode();
                        setView("content");
                      }}
                      className="w-full flex items-center justify-between py-3 px-4"
                      fullWidth
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  No results for "{searchQuery}"
                </div>
              ) : null}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Normal navigation: categories view
  if (view === "categories") {
    return (
      <div className="fixed inset-0 z-40 bg-background">
        <ScrollArea className="h-full">
          <div className="pt-[60px]">
            <div className="p-4">
              <div className="space-y-2">
                {SETTINGS_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Button
                      key={cat.id}
                      onClick={() => {
                        const hasSubs = cat.hasSubcategories;
                        if (hasSubs) {
                          setSelectedCategory(cat.id);
                          setView("subcategories");
                        } else {
                          onCategoryChange(cat.id);
                          onSubcategoryChange(null as any);
                          setView("content");
                        }
                      }}
                      className="w-full flex items-center justify-between gap-3 h-auto py-4 px-4"
                      fullWidth
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{cat.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Subcategories view
  if (view === "subcategories" && selectedCategory) {
    const subcategories = getSubcategories(selectedCategory);
    return (
      <div className="fixed inset-0 z-40 bg-background">
        <ScrollArea className="h-full">
          <div className="pt-[60px]">
            <div className="p-4">
              <div className="space-y-2">
                {subcategories.map((sub) => (
                  <Button
                    key={sub.id}
                    onClick={() => {
                      onCategoryChange(selectedCategory);
                      onSubcategoryChange(sub.id as any);
                      setView("content");
                    }}
                    className="w-full flex items-center justify-between gap-3 h-auto py-4 px-4"
                    fullWidth
                  >
                    <div className="flex items-center gap-3">
                      {sub.icon}
                      <span className="text-sm font-medium">{sub.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Content view (renders the active setting)
  return (
    <div className="fixed inset-0 z-40 bg-background">
      <ScrollArea className="h-full">
        <div className="pt-[60px]">
          <div className="p-4">
            {children}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}