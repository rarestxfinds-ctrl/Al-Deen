// Layer/Middle/Hook/Use-Search.ts
import { useState, useEffect } from "react";
import { searchByCategory } from "@/Top/Component/Search/Utility";
import type { SearchCategory, SearchResult } from "@/Top/Component/Search/Types";

export function useSearch(initialCategory: SearchCategory = "pages") {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>(initialCategory);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fake navLinks/supportLinks for demo – replace with actual data
  const navLinks = [
    { name: "Home", path: "/", icon: null },
    { name: "Quran", path: "/Quran", icon: null },
  ];
  const supportLinks = [
    { name: "Feedback", path: "/Feedback", icon: null },
  ];

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