// Layer/Top/Component/Header.tsx
import { memo, useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, ArrowLeft, Search, Home } from "lucide-react";
import { useScrollDirection } from "@/Middle/Hook/Use-Scroll-Direction";
import { useApp } from "@/Middle/Context/App";
import { useAuth } from "@/Middle/Context/Auth";
import { useTranslation } from "@/Middle/Hook/Use-Translation";
import { useIsMobile } from "@/Middle/Hook/Use-Mobile";
import { cn } from "@/Middle/Library/utils";
import { Link } from "react-router-dom";
import { Button } from "@/Top/Component/UI/Button";
import { SearchInput } from "../Search/Input";
import { useSearch } from "@/Middle/Hook/Use-Search";
import { Changer } from "@/Top/Component/Quran/Changer";

// Helper to extract and format page title from current path
function getPageTitle(pathname: string): string {
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length === 0) return "";
  const lastSegment = segments[segments.length - 1];
  return lastSegment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Check whether current path is inside a Quran surah view
function useIsQuranPath() {
  const location = useLocation();
  return /^\/Quran\/Surah\/\d+(\/Ayah\/\d+)?/.test(location.pathname);
}

export const Header = memo(function Header() {
  const { scrollDirection } = useScrollDirection();
  const { isSettingsSidebarOpen, setSettingsSidebarOpen } = useApp();
  const { user } = useAuth();
  const { t, isRtl } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [isSearchMode, setIsSearchMode] = useState(false);
  const { query, setQuery, category, setCategory, results, selectedIndex, setSelectedIndex } = useSearch();

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  const shouldHide = scrollDirection === "down";
  const isHome = location.pathname === "/";
  const isMobileSettingsOpen = isMobile && isSettingsSidebarOpen;
  const isQuranPath = useIsQuranPath();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchMode((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (isSearchMode && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchMode]);

  useEffect(() => {
    if (!isSearchMode) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current?.contains(target)) return;
      if (dropdownMenuRef.current?.contains(target)) return;
      closeSearchMode();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchMode]);

  const closeSearchMode = () => {
    setIsSearchMode(false);
    setQuery("");
    setCategory("pages");
  };

  const handleBack = useCallback(() => {
    if (isSearchMode) closeSearchMode();
    else if (isSettingsSidebarOpen) setSettingsSidebarOpen(false);
    else if (!isHome) navigate(-1);
  }, [isSearchMode, isSettingsSidebarOpen, isHome, navigate, setSettingsSidebarOpen]);

  const showRegularBack = !isHome || isSettingsSidebarOpen;
  const showBackButton = showRegularBack || isSearchMode;

  const handleResultClick = (path: string) => {
    navigate(path);
    closeSearchMode();
  };

  const handleSeeAll = () => {
    navigate(`/search?q=${encodeURIComponent(query)}&category=${category}`);
    closeSearchMode();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (results.length > 0 && selectedIndex >= 0) {
        handleResultClick(results[selectedIndex].path);
      } else if (query.trim()) {
        handleSeeAll();
      }
    } else if (e.key === "Escape") {
      closeSearchMode();
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-2 right-2 sm:left-4 sm:right-4 z-50 transition-all duration-300 flex justify-between items-start pt-1 sm:pt-2 isolate",
        shouldHide && !isSettingsSidebarOpen && !isMobileSettingsOpen
          ? "-translate-y-24 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Left section: back button + title / breadcrumb – flex-1 allows Changer to stretch */}
      <div className="flex items-center gap-2 h-8 sm:h-9 flex-1 min-w-0">
        {showBackButton && (
          <>
            <Button onClick={handleBack} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
              <ArrowLeft className={cn("h-4 w-4", isRtl && "rotate-180")} />
            </Button>
            {!isSearchMode && (
              isQuranPath ? (
                <Changer />
              ) : (
                <Button
                  variant="ghost"
                  className="text-sm font-medium truncate max-w-[150px] sm:max-w-[250px] px-2"
                >
                  {getPageTitle(location.pathname)}
                </Button>
              )
            )}
          </>
        )}
        {!isSearchMode && !showRegularBack && !isHome && (
          <Button onClick={() => navigate("/")} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
            <Home className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right section: search / settings / sign‑in */}
      <div className="flex items-start gap-1 sm:gap-2">
        {isSearchMode ? (
          <div
            ref={searchContainerRef}
            className={cn(
              "transition-all duration-300 ease-out",
              isMobile ? "w-[calc(100vw-60px)]" : "w-[340px]"
            )}
          >
            <SearchInput
              query={query}
              setQuery={setQuery}
              category={category}
              setCategory={setCategory}
              onSearch={handleSeeAll}
              inputRef={searchInputRef}
              onKeyDown={handleKeyDown}
              results={results}
              selectedIndex={selectedIndex}
              onResultClick={handleResultClick}
              onSeeAll={handleSeeAll}
              dropdownMenuRef={dropdownMenuRef}
              isMobile={false}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9">
            <Button onClick={() => setIsSearchMode(true)} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
              <Search className="h-4 w-4" />
            </Button>
            <Button onClick={() => setSettingsSidebarOpen(true)} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
            {!user && (
              <Link
                to="/Sign-In"
                className="inline-flex items-center justify-center px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-white dark:bg-black border-2 border-black dark:border-white text-primary hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
});