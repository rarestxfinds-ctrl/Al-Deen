// Layer/Top/Component/Search/Utility.ts

import { Home, BookOpen, BookText, MessageSquare, Clock } from "lucide-react";
import { surahList, juzData } from "@/Bottom/API/Quran";
import { hadithCollections } from "@/Bottom/API/Hadith";
import { duaCategories } from "@/Bottom/API/Aid";
import type { SearchCategory, SearchResult, SearchCategoryConfig } from "./Types";

// Move ALL_PAGES here
export const ALL_PAGES = [
  { name: "Home", path: "/", icon: Home },
  { name: "Quran", path: "/Quran", icon: BookOpen },
  { name: "Hadith", path: "/Hadith", icon: BookText },
  { name: "Duas", path: "/Aid/Dua", icon: MessageSquare },
  { name: "Prayers", path: "/Aid/Prayers", icon: Clock },
  { name: "Tajweed", path: "/Aid/Tajweed", icon: BookOpen },
  { name: "Goals", path: "/Quran/Goals", icon: Home },
  { name: "Feedback", path: "/Feedback", icon: MessageSquare },
  { name: "Privacy", path: "/Privacy", icon: Home },
  { name: "Terms", path: "/Terms", icon: Home },
  { name: "Profile", path: "/Profile", icon: Home },
];

// Move CATEGORIES here
export const CATEGORIES: SearchCategoryConfig[] = [
  { id: "pages", label: "Pages", placeholder: "Search pages...", icon: Home },
  { id: "quran", label: "Quran", placeholder: "Search Surahs, Juz, Pages, Verses...", icon: BookOpen },
  { id: "hadith", label: "Hadith", placeholder: "Search Hadith collections...", icon: BookText },
  { id: "duas", label: "Duas", placeholder: "Search Duas...", icon: MessageSquare },
];

// Move CATEGORY_MAP here
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// Move AVAILABLE_SURAHS_FOR_VERSE_SEARCH here
export const AVAILABLE_SURAHS_FOR_VERSE_SEARCH = [1, 112, 113, 114];

// Move VerseResult interface here
export interface VerseResult {
  surahId: number;
  surahName: string;
  verseNumber: number;
  arabic: string;
  translation: string;
  verseKey: string;
}

// Move helper functions here
export function getResultTypeLabel(category: SearchCategory): string {
  switch (category) {
    case "quran": return "Quran Results";
    case "hadith": return "Hadith Collections";
    case "duas": return "Dua Categories";
    default: return "Pages";
  }
}

export function getCategoryLabel(category: SearchCategory): string {
  return CATEGORY_MAP[category]?.label || "Search";
}

export function searchByCategory(
  query: string,
  category: SearchCategory,
  navLinks: Array<{ name: string; path: string }>,
  supportLinks: Array<{ name: string; path: string }>
): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  let results: SearchResult[] = [];

  switch (category) {
    case "pages":
      const allPages = [...navLinks, ...supportLinks];
      results = allPages
        .filter(page => page.name.toLowerCase().includes(lowerQuery))
        .map(page => ({
          id: page.path,
          title: page.name,
          path: page.path,
          type: "Page"
        }));
      break;

    case "quran":
      const surahResults = surahList
        .filter(surah =>
          surah.englishName.toLowerCase().includes(lowerQuery) ||
          surah.name.includes(query) ||
          surah.englishNameTranslation.toLowerCase().includes(lowerQuery) ||
          surah.id.toString() === query
        )
        .slice(0, 5)
        .map(surah => ({
          id: `surah-${surah.id}`,
          title: surah.englishName,
          subtitle: `${surah.numberOfAyahs} verses • ${surah.englishNameTranslation}`,
          arabicName: surah.name,
          path: `/quran/surah/${surah.id}`,
          type: "Surah"
        }));
      
      const juzResults = juzData
        .filter(juz => `juz ${juz.juzNumber}`.includes(lowerQuery) || juz.juzNumber.toString() === query)
        .slice(0, 3)
        .map(juz => ({
          id: `juz-${juz.juzNumber}`,
          title: `Juz ${juz.juzNumber}`,
          subtitle: `Starts from Surah ${juz.surahs[0]?.id || 1}`,
          path: `/quran/juz/${juz.juzNumber}`,
          type: "Juz"
        }));
      
      const pageMatch = query.match(/^(?:page\s*)?(\d+)$/i);
      const pageResults: SearchResult[] = [];
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1]);
        if (pageNum >= 1 && pageNum <= 604) {
          pageResults.push({
            id: `page-${pageNum}`,
            title: `Page ${pageNum}`,
            subtitle: "Quran Page",
            path: `/quran/page/${pageNum}`,
            type: "Page"
          });
        }
      }
      
      const verseMatch = query.match(/^(\d+):(\d+)$/);
      const verseResults: SearchResult[] = [];
      if (verseMatch) {
        const surahNum = parseInt(verseMatch[1]);
        const verseNum = parseInt(verseMatch[2]);
        const surah = surahList.find(s => s.id === surahNum);
        if (surah && verseNum <= surah.numberOfAyahs) {
          verseResults.push({
            id: `verse-${surahNum}-${verseNum}`,
            title: `${surah.englishName} ${surahNum}:${verseNum}`,
            subtitle: `Verse ${verseNum} of ${surah.englishName}`,
            arabicName: surah.name,
            path: `/quran/surah/${surahNum}?verse=${verseNum}`,
            type: "Verse"
          });
        }
      }
      
      results = [...verseResults, ...surahResults, ...juzResults, ...pageResults];
      break;

    case "hadith":
      results = hadithCollections
        .filter(collection =>
          collection.name.toLowerCase().includes(lowerQuery) ||
          collection.arabicName.includes(query)
        )
        .map(collection => ({
          id: collection.id,
          title: collection.name,
          subtitle: `${collection.hadithCount.toLocaleString()} hadith`,
          arabicName: collection.arabicName,
          path: `/hadith/${collection.id}`,
          type: "Collection"
        }));
      break;

    case "duas":
      results = duaCategories
        .filter(cat =>
          cat.name.toLowerCase().includes(lowerQuery) ||
          cat.arabicName.includes(query)
        )
        .map(cat => ({
          id: cat.id,
          title: cat.name,
          subtitle: `${cat.count} duas`,
          arabicName: cat.arabicName,
          path: `/duas/${cat.id}`,
          type: "Category"
        }));
      break;
  }

  return results.slice(0, 8);
}

export function searchPages(query: string): SearchResult[] {
  if (!query || query.length < 1) return [];
  const lower = query.toLowerCase();
  return ALL_PAGES
    .filter(page => page.name.toLowerCase().includes(lower))
    .map(page => ({
      id: page.path,
      title: page.name,
      path: page.path,
      type: "Page"
    }));
}

export function searchSurahs(query: string): SearchResult[] {
  if (query.length < 1) return [];
  const lower = query.toLowerCase();
  return surahList
    .filter(surah =>
      surah.englishName.toLowerCase().includes(lower) ||
      surah.name.includes(query) ||
      surah.englishNameTranslation.toLowerCase().includes(lower) ||
      surah.id.toString() === query
    )
    .map(surah => ({
      id: `surah-${surah.id}`,
      title: surah.englishName,
      subtitle: `${surah.numberOfAyahs} verses • ${surah.englishNameTranslation}`,
      arabicName: surah.name,
      path: `/quran/surah/${surah.id}`,
      type: "Surah"
    }));
}

export function searchHadiths(query: string): SearchResult[] {
  if (query.length < 1) return [];
  const lower = query.toLowerCase();
  return hadithCollections
    .filter(collection =>
      collection.name.toLowerCase().includes(lower) ||
      collection.arabicName.includes(query)
    )
    .map(collection => ({
      id: collection.id,
      title: collection.name,
      subtitle: `${collection.hadithCount.toLocaleString()} hadith`,
      arabicName: collection.arabicName,
      path: `/hadith/${collection.id}`,
      type: "Collection"
    }));
}

export function searchDuas(query: string): SearchResult[] {
  if (query.length < 1) return [];
  const lower = query.toLowerCase();
  return duaCategories
    .filter(cat =>
      cat.name.toLowerCase().includes(lower) ||
      cat.arabicName.includes(query)
    )
    .map(cat => ({
      id: cat.id,
      title: cat.name,
      subtitle: `${cat.count} duas`,
      arabicName: cat.arabicName,
      path: `/duas/${cat.id}`,
      type: "Category"
    }));
}

export async function searchVerses(query: string): Promise<VerseResult[]> {
  const lower = query.toLowerCase();
  const found: VerseResult[] = [];
  
  for (const surahId of AVAILABLE_SURAHS_FOR_VERSE_SEARCH) {
    try {
      const { getSurah } = await import("@/Bottom/API/Quran");
      const { surahList } = await import("@/Bottom/API/Quran");
      const surah = await getSurah(surahId, { translation: "Direct" });
      const meta = surahList.find((s) => s.id === surahId);
      if (!meta) continue;
      for (const verse of surah.verses) {
        if (verse.translation?.toLowerCase().includes(lower) || verse.arabic.includes(query)) {
          found.push({
            surahId: meta.id,
            surahName: meta.englishName,
            verseNumber: verse.verseNumber,
            arabic: verse.arabic,
            translation: verse.translation ?? "",
            verseKey: `${meta.id}:${verse.verseNumber}`,
          });
        }
      }
    } catch {}
  }
  
  return found.slice(0, 30);
}