// Client/Component/Header.tsx
import { memo, useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, ArrowLeft, Search, Home, X, Heart, LogIn } from "lucide-react";
import { useScrollDirection } from "Client/Hook/Use-Scroll-Direction";
import { useApp } from "Client/Context/App";
import { useAuth } from "Client/Context/Auth";
import { useTranslation } from "Client/Hook/Use-Translation";
import { useIsMobile } from "Client/Hook/Use-Mobile";
import { cn } from "Client/Library/utils";
import { Button } from "Client/Component/UI/Button";
import { Input } from "Client/Component/UI/Input";
import { Container } from "Client/Component/UI/Container";
import { SearchInput } from "../../Search/Input";
import { useSearch } from "Client/Hook/Use-Search";
import { Quran_Navigator } from "Client/Component/Layout/Header/Navigator/Quran";
import { Aid_Navigator, isAidPath } from "Client/Component/Layout/Header/Navigator/Aid";
import { Hadith_Navigator, isHadithPath } from "Client/Component/Layout/Header/Navigator/Hadith";
import { navHistory, useNavHistoryTracker } from "Client/Hook/Use-Nav-History";
import { mobileSettingsStore } from "Client/Component/Settings/mobileSettingsStore";
import { tryHandleBack } from "Client/Hook/Use-Back-Handler";
import { usePWAInstall } from "Client/Hook/Use-PWA-Install";
import { toast } from "Client/Hook/Use-Toast";

function getPageTitle(pathname: string): string {
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length === 0) return "";
  const lastSegment = segments[segments.length - 1];
  return lastSegment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
  const { promptInstall } = usePWAInstall();

  useNavHistoryTracker();

  const [isSearchMode, setIsSearchMode] = useState(false);
  const { query, setQuery, category, setCategory, results, selectedIndex, setSelectedIndex } = useSearch();

  const [mSettings, setMSettings] = useState(() => mobileSettingsStore.getState());
  const [settingsSearchActive, setSettingsSearchActive] = useState(false);
  const [settingsSearchValue, setSettingsSearchValue] = useState("");

  const [isAidOpen, setIsAidOpen] = useState(false);

  useEffect(() => {
    const unsub = mobileSettingsStore.subscribe(() => {
      setMSettings(mobileSettingsStore.getState());
      setSettingsSearchActive(mobileSettingsStore.getState().isSearchMode);
    });
    return unsub;
  }, []);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const settingsSearchInputRef = useRef<HTMLInputElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  const shouldHide = scrollDirection === "down";
  const isHome = location.pathname === "/";
  const isMobileSettingsOpen = isMobile && isSettingsSidebarOpen;
  const isQuranPath = useIsQuranPath();
  const aidPath = isAidPath(location.pathname);
  const hadithPath = isHadithPath(location.pathname);

  useEffect(() => {
    setIsAidOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isMobileSettingsOpen) return;
        setIsSearchMode((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isMobileSettingsOpen]);

  useEffect(() => {
    if (isSearchMode && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchMode]);

  useEffect(() => {
    if (settingsSearchActive && settingsSearchInputRef.current) {
      settingsSearchInputRef.current.focus();
    }
    if (!settingsSearchActive) setSettingsSearchValue("");
  }, [settingsSearchActive]);

  useEffect(() => {
    if (!isSettingsSidebarOpen && settingsSearchActive) {
      mobileSettingsStore.exitSearchMode();
    }
  }, [isSettingsSidebarOpen, settingsSearchActive]);

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
    if (isSearchMode) { closeSearchMode(); return; }
    if (tryHandleBack()) return;
    if (isMobileSettingsOpen) {
      mobileSettingsStore.goBack();
      return;
    }
    if (isSettingsSidebarOpen) { setSettingsSidebarOpen(false); return; }
    if (isHome) return;

    const target = navHistory.popDistinct(location.pathname);
    if (target) {
      navigate(target);
      return;
    }

    const segments = location.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    if (segments.length <= 1) { navigate("/"); return; }
    segments.pop();
    navigate("/" + segments.join("/"));
  }, [isSearchMode, isSettingsSidebarOpen, isMobileSettingsOpen, isHome, navigate, setSettingsSidebarOpen, location.pathname]);

  const showRegularBack = !isHome || isSettingsSidebarOpen;
  const showBackButton = showRegularBack || isSearchMode;

  const handleResultClick = (path: string) => {
    navigate(path);
    closeSearchMode();
  };

  const handleSeeAll = () => {
    navigate(`/Search?q=${encodeURIComponent(query)}&category=${category}`);
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

  const handleSearchClick = () => {
    if (isMobileSettingsOpen) {
      mobileSettingsStore.enterSearchMode(() => {
        setSettingsSearchValue("");
      });
      return;
    }
    setIsSearchMode(true);
  };

  const handleSettingsSearchChange = (v: string) => {
    setSettingsSearchValue(v);
    mobileSettingsStore.setSearchQuery(v);
  };

  const exitSettingsSearch = () => {
    mobileSettingsStore.exitSearchMode();
  };

  const renderLeftContent = () => {
    if (isMobileSettingsOpen) {
      if (settingsSearchActive) {
        return (
          <>
            <Button onClick={exitSettingsSearch} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
              <ArrowLeft className={cn("h-4 w-4", isRtl && "rotate-180")} />
            </Button>
            <div className="flex-1 min-w-0">
              <Input
                ref={settingsSearchInputRef}
                placeholder="Search settings"
                value={settingsSearchValue}
                onChange={(e) => handleSettingsSearchChange(e.target.value)}
                className="h-8 sm:h-9 text-sm"
              />
            </div>
          </>
        );
      }
      return (
        <>
          <Button onClick={handleBack} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
            {mSettings.showBack ? (
              <ArrowLeft className={cn("h-4 w-4", isRtl && "rotate-180")} />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
          <Container className="!py-1 !px-3 inline-flex w-auto max-w-[70%]">
            <span className="text-sm font-medium truncate">{mSettings.title}</span>
          </Container>
        </>
      );
    }

    if (!showBackButton) {
      if (!isHome && !isSearchMode) {
        return (
          <Button onClick={() => navigate("/")} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
            <Home className="h-4 w-4" />
          </Button>
        );
      }
      return null;
    }

    return (
      <>
        {!(aidPath && isMobile && isAidOpen) && (
          <Button onClick={handleBack} className="w-8 h-8 sm:w-9 sm:h-9 p-0 shrink-0" variant="ghost">
            <ArrowLeft className={cn("h-4 w-4", isRtl && "rotate-180")} />
          </Button>
        )}
        {!isSearchMode && (
          isQuranPath ? (
            <Quran_Navigator />
          ) : aidPath ? (
            <Aid_Navigator onOpenChange={setIsAidOpen} />
          ) : hadithPath ? (
            <Hadith_Navigator />
          ) : (
            <Button
              variant="ghost"
              className="text-sm font-medium truncate max-w-[150px] sm:max-w-[250px] px-2 py-1 h-8 sm:h-9"
            >
              {getPageTitle(location.pathname)}
            </Button>
          )
        )}
      </>
    );
  };

  const hideRightSettingsButtons = isSettingsSidebarOpen;

  return (
    <header
      className={cn(
        "fixed top-0 z-50 transition-all duration-300 flex justify-between items-start pt-1 sm:pt-2 isolate",
        aidPath && isAidOpen ? "max-sm:left-0 max-sm:right-0 max-sm:pt-0 left-2 right-2 sm:left-4 sm:right-4" : "left-2 right-2 sm:left-4 sm:right-4",
        shouldHide && !isSettingsSidebarOpen && !isMobileSettingsOpen && !(aidPath && isAidOpen)
          ? "-translate-y-24 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Layout Wrapper Column: Uses flex layout rules so that when left content expands, 
        it safely scales, and natively forces the inline layout neighbor (Donate) 
        to step rightwards instead of stacking/overlapping.
      */}
      <div className={cn("flex items-center min-w-0 flex-1", aidPath && isAidOpen ? "max-sm:gap-0 max-sm:h-auto" : "gap-2 h-8 sm:h-9")}>
        {renderLeftContent()}
        
        {/* 🌟 DYNAMIC AUTO-ADJUST DONATE LAYOUT WRAPPER 
          When left title is short, `sm:absolute sm:left-1/2 sm:-translate-x-1/2` pins it exactly centered. 
          If the title element runs long, `ml-auto sm:ml-4` catches it, acts as a protective margin buffer, 
          and moves the Donate element safely to the right.
        */}
        {!isSearchMode && !isMobileSettingsOpen && !(aidPath && isAidOpen) && (
          <div className="h-8 sm:h-9 flex items-center shrink-0 ml-auto pl-2 sm:pl-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:ml-4 transition-all duration-200">
            <Button
              onClick={() => navigate("/Donate")}
              className="w-8 h-8 sm:w-9 sm:h-9 p-0"
              variant="ghost"
              aria-label="Donate"
              title="Donate"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-1 sm:gap-2 shrink-0 ml-2">
        {isSearchMode && !isMobileSettingsOpen ? (
          <div
            ref={searchContainerRef}
            className={cn(
              "transition-all duration-300 ease-out mr-1 sm:mr-2",
              isMobile ? "w-[calc(100vw-96px)]" : "w-[340px]"
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
          !(aidPath && isAidOpen) && (
            <div className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9">
              {!(isMobileSettingsOpen && settingsSearchActive) && (
                <Button onClick={handleSearchClick} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
                  <Search className="h-4 w-4" />
                </Button>
              )}
              {!hideRightSettingsButtons && (
                <>
                  <Button onClick={() => setSettingsSidebarOpen(true)} className="w-8 h-8 sm:w-9 sm:h-9 p-0" variant="ghost">
                    <Settings className="h-4 w-4" />
                  </Button>
                  {!user && (
                    <Button
                      onClick={() => navigate("/Sign-In")}
                      className="w-8 h-8 sm:w-9 sm:h-9 p-0"
                      variant="ghost"
                      aria-label="Sign In"
                      title="Sign In"
                    >
                      <LogIn className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )
        )}
      </div>
    </header>
  );
});