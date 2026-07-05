// Types.tsx
import { ReactNode } from "react";

export type SearchCategory = "pages" | "quran" | "hadith" | "aid";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  arabicName?: string;
  path: string;
  type: string;
}

export interface SearchCategoryConfig {
  id: SearchCategory;
  label: string;
  placeholder: string;
  icon: React.ElementType;
}

export interface SearchInputProps {
  query: string;
  setQuery: (query: string) => void;
  category: SearchCategory;
  setCategory: (category: SearchCategory) => void;
  onSearch: () => void;
  onClose?: () => void;
  isFocused?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export interface SearchResultsProps {
  query: string;
  category: SearchCategory;
  results: SearchResult[];
  selectedIndex: number;
  onResultClick: (path: string) => void;
  onSeeAll: () => void;
}

export interface NavigationLinksProps {
  navLinks: Array<{ name: string; path: string; icon: React.ElementType }>;
  supportLinks: Array<{ name: string; path: string; icon: React.ElementType }>;
  onLinkClick: (path: string) => void;
}