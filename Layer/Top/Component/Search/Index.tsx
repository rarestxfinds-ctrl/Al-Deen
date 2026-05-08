import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Home, BookOpen, BookText, MessageSquare } from "lucide-react";
import { useApp } from "@/Middle/Context/App";
import { useTranslation } from "@/Middle/Hook/Use-Translation";
import { useIsMobile } from "@/Middle/Hook/Use-Mobile";
import { Desktop } from "./Layout/Desktop";
import { Mobile } from "./Layout/Mobile";
import { searchByCategory } from "./Utility";
import type { SearchCategory, SearchResult } from "./Types";

export function SpotlightSearch() {
  const { t, isRtl } = useTranslation();
  const { isSearchSidebarOpen, setSearchSidebarOpen } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("pages");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navLinks = useMemo(() => [
    { name: t.nav.home, path: "/", icon: Home },
    { name: t.nav.quran, path: "/Quran", icon: BookOpen },
    { name: t.nav.hadith, path: "/Hadith", icon: BookText },
    { name: t.nav.duas, path: "/Aid/Dua", icon: MessageSquare },
    { name: "Prayers", path: "/Prayers", icon: Home },
    { name: "Tajweed", path: "/Tajweed", icon: BookOpen },
    { name: "Goals", path: "/Quran/Goals", icon: Home },
  ], [t.nav]);

  const supportLinks = useMemo(() => [
    { name: t.nav.feedback, path: "/Feedback", icon: MessageSquare },
  ], [t.nav]);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchSidebarOpen(!isSearchSidebarOpen);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isSearchSidebarOpen, setSearchSidebarOpen]);

  useEffect(() => {
    if (isSearchSidebarOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchSidebarOpen]);

  // Search logic
  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }
    const searchResults = searchByCategory(query, category, navLinks, supportLinks);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, category, navLinks, supportLinks]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}&category=${category}`);
      handleClose();
    }
  }, [query, category, navigate]);

  const handleResultClick = useCallback((path: string) => {
    navigate(path);
    handleClose();
  }, [navigate]);

  const handleLinkClick = useCallback((path: string) => {
    navigate(path);
    handleClose();
  }, [navigate]);

  const handleSeeAll = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  const handleClose = useCallback(() => {
    setSearchSidebarOpen(false);
    setQuery("");
    setCategory("pages");
  }, [setSearchSidebarOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (results.length > 0 && selectedIndex >= 0) {
        handleResultClick(results[selectedIndex].path);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      handleClose();
    }
  };

  const sharedProps = {
    query,
    setQuery,
    category,
    setCategory,
    results,
    onSearch: handleSearch,
    onResultClick: handleResultClick,
    onSeeAll: handleSeeAll,
    inputRef,
    onKeyDown: handleKeyDown,
  };

  if (isMobile) {
    return (
      <Mobile
        open={isSearchSidebarOpen}
        onClose={handleClose}
        {...sharedProps}
        onLinkClick={handleLinkClick}
        navLinks={navLinks}
        supportLinks={supportLinks}
        isRtl={isRtl}
      />
    );
  }

  return (
    <Desktop
      open={isSearchSidebarOpen}
      onClose={handleClose}
      {...sharedProps}
      selectedIndex={selectedIndex}
    />
  );
}
export default SpotlightSearch;
