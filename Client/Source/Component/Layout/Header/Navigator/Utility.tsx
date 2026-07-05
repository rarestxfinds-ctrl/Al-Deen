// @/Component/Layout/Header/Navigator/Utility.tsx
import { useEffect, useRef, useState, ReactNode } from "react";
import { ChevronDown, Search, X, ArrowLeft } from "lucide-react";
import { Button } from "@/Component/UI/Button";
import { Container } from "@/Component/UI/Container";
import { cn } from "@/Library/utils";

export function idFromName(name: string): string {
  return name.replace(/\s+/g, "-");
}

export function nameFromId(id: string): string {
  return id.replace(/-/g, " ");
}

interface NavigatorLayoutProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  buttonLabel: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  renderMobileHeaderLeft: () => ReactNode;
  renderDesktopHeaderLeft: () => ReactNode;
  showGoBack?: boolean;
  onGoBack?: () => void;
  children: ReactNode;
}

export function NavigatorLayout({
  isOpen,
  setIsOpen,
  isSearching,
  setIsSearching,
  searchQuery,
  setSearchQuery,
  buttonLabel,
  inputRef,
  renderMobileHeaderLeft,
  renderDesktopHeaderLeft,
  showGoBack = false,
  onGoBack,
  children,
}: NavigatorLayoutProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const closeAll = () => {
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery("");
    setIsScrolled(false);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !isOpen) return;

    const checkScrollPosition = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel) return;
      
      const hasMovedOffset = sentinel.offsetTop < container.scrollTop;
      setIsScrolled(container.scrollTop > 0 || hasMovedOffset);
    };

    container.addEventListener("scroll", checkScrollPosition, { passive: true });
    
    const syncTimeout = setTimeout(checkScrollPosition, 0);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      clearTimeout(syncTimeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsScrolled(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth >= 640 && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeAll();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isSearching) {
      inputRef?.current?.focus();
    }
  }, [isSearching, inputRef]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left w-full sm:w-auto">

      {/* FLOATING IN-FLOW HEADER SCREEN TRIGGER - All shadow styles removed */}
      <div
        onClick={() => { if (!isOpen) setIsOpen(true); }}
        className={cn(
          "text-foreground border border-border/30 transition-all duration-200 shadow-none",
          "inline-flex items-center gap-1.5 text-sm font-medium h-8 sm:h-9 select-none justify-between",
          "bg-[#fafafa] dark:bg-zinc-900 [.high-contrast_&]:bg-white [.high-contrast_&]:border-black",
          isOpen
            ? "max-sm:hidden sm:w-72 px-2 cursor-default rounded-t-[40px] rounded-b-none border-b-transparent z-0"
            : "w-auto max-w-[150px] sm:max-w-[250px] px-3.5 rounded-[40px] hover:bg-accent cursor-pointer"
        )}
      >
        <span className="truncate mr-1">{buttonLabel}</span>
        <ChevronDown className="h-5 w-5 opacity-60 shrink-0 mx-1" />
      </div>

      {/* IMMERSIVE PREVIEW LAYER SCREEN OVERLAY */}
      {isOpen && (
        <div className="max-sm:fixed max-sm:inset-0 max-sm:w-screen max-sm:h-[100dvh] max-sm:bg-background max-sm:z-[9999] max-sm:flex max-sm:flex-col sm:absolute sm:top-0 sm:left-0 sm:right-0 sm:z-50">

          {/* CORE VIEWPORT CONTAINER */}
          <div className="bg-background text-foreground w-full max-sm:rounded-none max-sm:border-0 max-sm:flex-1 max-sm:flex max-sm:flex-col sm:rounded-[32px] sm:border sm:border-border/30 overflow-visible relative [.high-contrast_&]:border-black">

            {/* SOLID HEADER BACKDROP BLOCKER */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 bg-background z-20 pointer-events-none transition-opacity duration-150 max-sm:h-14 sm:h-11 max-sm:rounded-none sm:rounded-t-[32px]",
                isScrolled ? "opacity-0" : "opacity-100"
              )}
            />

            {/* TRANSPARENT MOBILE BUTTON CONTAINER */}
            <div className="hidden max-sm:flex items-center justify-between w-full h-14 pl-4 pr-6 bg-transparent shrink-0 absolute top-0 left-0 z-30">
              {!isSearching ? (
                <>
                  <div className="flex items-center gap-2 max-w-[65%]">
                    {showGoBack && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md transition-shadow shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGoBack?.();
                        }}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    <div className="relative inline-block text-left max-w-full">
                      {renderMobileHeaderLeft()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => setIsSearching(true)}
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md hover:shadow-lg transition-shadow"
                      onClick={closeAll}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between w-full gap-2">
                  <Container className="flex items-center flex-1 h-9 px-3 min-w-0 rounded-full bg-[#fafafa] dark:bg-zinc-900 border border-border/40 relative shadow-md">
                    <Search className="h-5 w-5 text-muted-foreground shrink-0 mr-2" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search entries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs font-normal outline-none placeholder:text-muted-foreground/60 h-full border-none focus:ring-0 p-0 pr-6"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="absolute right-3 p-1 rounded-full shrink-0 text-muted-foreground hover:text-foreground active:scale-95 transition-all focus:outline-none"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </Container>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full shrink-0 bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setIsSearching(false);
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>

            {/* TRANSPARENT DESKTOP BUTTON CONTAINER */}
            <div className="max-sm:hidden sm:flex items-center justify-between w-full h-11 px-3 bg-transparent absolute top-0 left-0 z-30">
              {!isSearching ? (
                <>
                  <div className="flex items-center gap-1.5 max-w-[55%] ml-1">
                    {showGoBack && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md transition-shadow shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGoBack?.();
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="relative inline-block text-left max-w-full">
                      {renderDesktopHeaderLeft()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mr-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 rounded-full shrink-0 bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md hover:shadow-lg transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSearching(true);
                      }}
                    >
                      <Search className="h-4 w-4 opacity-90" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 rounded-full shrink-0 bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md hover:shadow-lg transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeAll();
                      }}
                    >
                      <ChevronDown className="h-4 w-4 opacity-80 transition-transform duration-200 rotate-180" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between w-full mx-1">
                  <Container className="!py-0.5 !px-2 flex items-center flex-1 min-w-0 mr-1.5 h-7 bg-[#fafafa] dark:bg-zinc-900 border border-border/40 relative shadow-md">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-1.5" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search entries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs font-normal outline-none placeholder:text-muted-foreground/60 h-full border-none focus:ring-0 p-0 pr-6"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="absolute right-2 p-0.5 rounded-full shrink-0 text-muted-foreground hover:text-foreground active:scale-95 transition-all focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery("");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Container>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 rounded-full shrink-0 mr-0.5 bg-[#fafafa] dark:bg-zinc-900 border border-border/40 shadow-md hover:shadow-lg transition-shadow"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSearching(false);
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* SINGLE WORKING ACTIVE SCROLL TRACK */}
            <div
              ref={scrollRef}
              className={cn(
                "space-y-1.5 sm:space-y-0 max-sm:flex-1 max-sm:h-full sm:max-h-[288px] overflow-y-auto max-sm:px-4 select-none pb-4 relative z-10 max-sm:rounded-none sm:rounded-[32px] transition-all duration-200",
                "scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                isScrolled ? "pt-0" : "max-sm:pt-14 sm:pt-11"
              )}
            >
              <span ref={sentinelRef} className="block h-0 w-0 pointer-events-none select-none invisible" />
              {children}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}