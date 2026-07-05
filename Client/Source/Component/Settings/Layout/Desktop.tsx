// @/Component/Settings/Layout/Desktop.tsx
import { useState, useRef, useEffect, useMemo } from "react";
import { ScrollArea } from "@/Component/UI/Scroll-Area";
import { Button } from "@/Component/UI/Button";
import { Input } from "@/Component/UI/Input";
import { cn } from "@/Library/utils";
import { Container } from "@/Component/UI/Container";
import { Search, X } from "lucide-react";
import { SETTINGS_CATEGORIES, getSubcategories } from "../Constants";
import type { SettingsCategory, AccountSubcategory, AidSubcategory } from "../Types";

type SubcategoryId = AccountSubcategory | AidSubcategory;

interface DesktopProps {
  activeCategory: SettingsCategory;
  activeSubcategory: SubcategoryId | null;
  onCategoryChange: (category: SettingsCategory) => void;
  onSubcategoryChange: (subcategory: SubcategoryId) => void;
  children: React.ReactNode;
}

export function Desktop({ 
  activeCategory, 
  activeSubcategory, 
  onCategoryChange, 
  onSubcategoryChange, 
  children 
}: DesktopProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if the input should be in "active" style (black bg, white border)
  const isInputActive = isFocused || searchQuery.length > 0;

  // --- Search filtering logic ---
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      // No query: return all categories with all subcategories
      return SETTINGS_CATEGORIES.map(cat => ({
        ...cat,
        subcategories: cat.hasSubcategories ? getSubcategories(cat.id) : []
      }));
    }

    const queryLower = searchQuery.toLowerCase();
    const results: typeof SETTINGS_CATEGORIES = [];
    
    for (const cat of SETTINGS_CATEGORIES) {
      const catMatches = cat.label.toLowerCase().includes(queryLower);
      let matchingSubs = [];
      if (cat.hasSubcategories) {
        const subs = getSubcategories(cat.id);
        matchingSubs = subs.filter(sub => sub.label.toLowerCase().includes(queryLower));
      }
      if (catMatches || matchingSubs.length > 0) {
        results.push({
          ...cat,
          subcategories: matchingSubs
        });
      }
    }
    
    // Determine top result: first matching subcategory, else first matching category
    let topCategory: SettingsCategory | null = null;
    let topSubcategory: SubcategoryId | null = null;
    
    for (const cat of results) {
      if (cat.subcategories && cat.subcategories.length > 0) {
        topCategory = cat.id;
        topSubcategory = cat.subcategories[0].id as SubcategoryId;
        break;
      }
    }
    if (!topCategory && results.length > 0) {
      topCategory = results[0].id;
      topSubcategory = null;
    }
    
    // Automatically switch to the top result if different from current
    if (topCategory && (topCategory !== activeCategory || topSubcategory !== activeSubcategory)) {
      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        onCategoryChange(topCategory);
        if (topSubcategory) onSubcategoryChange(topSubcategory);
      }, 0);
    }
    
    return results.map(cat => ({
      ...cat,
      subcategories: cat.subcategories || []
    }));
  }, [searchQuery, activeCategory, activeSubcategory, onCategoryChange, onSubcategoryChange]);

  const handleSearchClick = () => {
    setIsSearchActive(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (searchQuery === "") {
      setIsSearchActive(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (isSearchActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchActive]);

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <div className="h-full flex">
        {/* Sidebar */}
        <div className="shrink-0 w-64 max-h-full flex flex-col pt-10 pl-6 pb-6 overflow-hidden self-start">
          <div className="flex-1 min-h-0 p-2 flex flex-col overflow-y-auto">

            {/* Search Section */}
            <div className="mt-5 mb-0">
              {!isSearchActive ? (
                <Button
                  onClick={handleSearchClick}
                  className="w-10 h-10 rounded-full flex items-center justify-center p-0"
                >
                  <Search className="h-4 w-4" />
                </Button>
              ) : (
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    className={cn(
                      "pr-10 transition-all duration-200",
                      isInputActive && "bg-black text-white border-white"
                    )}
                  />
                  {searchQuery && (
                    <Button
                      onClick={handleClear}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full p-0 flex items-center justify-center"
                      size="sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Categories List - filtered */}
            <div className="space-y-2 flex-1 py-4">
              {filteredData.map((cat) => {
                const isActive = activeCategory === cat.id;
                const hasSubs = cat.subcategories && cat.subcategories.length > 0;
                
                return (
                  <div key={cat.id}>
                    <Button
                      onClick={() => {
                        onCategoryChange(cat.id);
                        if (hasSubs) {
                          const firstSub = cat.subcategories[0];
                          if (firstSub) onSubcategoryChange(firstSub.id as any);
                        } else {
                          onSubcategoryChange(null);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 h-auto px-3 py-2.5",
                        isActive && "bg-black dark:bg-white text-white dark:text-black"
                      )}
                      fullWidth
                    >
                      <span className="text-sm font-medium">{cat.label}</span>
                    </Button>
                    
                    {hasSubs && isActive && (
                      <div className="mt-2 space-y-2 ml-6">
                        {cat.subcategories.map((sub) => {
                          const isActiveSub = activeSubcategory === sub.id;
                          return (
                            <Button
                              key={sub.id}
                              onClick={() => onSubcategoryChange(sub.id as any)}
                              className={cn(
                                "flex items-center gap-2.5 h-auto py-1.5 px-3 rounded-full",
                                isActiveSub && "bg-black dark:bg-white text-white dark:text-black"
                              )}
                              fullWidth
                            >
                              <span className="text-sm font-medium">{sub.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredData.length === 0 && searchQuery && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No results for "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Content area */}
        <ScrollArea className="flex-1 h-full">
          <div className="pt-10">
            <div className="p-6 max-w-2xl text-left">
              {children}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}