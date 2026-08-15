// @/Hook/Use-Search.ts
import { useState, useEffect } from "react";
import { ALL_PAGES, searchByCategory } from "@Web/Component/Search/Utility";
import type { SearchCategory, SearchResult } from "@Web/Component/Search/Types";

export function useSearch(initialCategory: SearchCategory = "pages") {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>(initialCategory);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navLinks = ALL_PAGES;
  const supportLinks: typeof ALL_PAGES = [];

  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }
    const searchResults = searchByCategory(query, category, navLinks, supportLinks);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, category]);

  return {
    query,
    setQuery,
    category,
    setCategory,
    results,
    selectedIndex,
    setSelectedIndex,
  };
}