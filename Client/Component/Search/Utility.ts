// Client/Component/Search/Utility.ts

import { Home, BookOpen, BookText, MessageSquare, Clock, Sparkles, Calculator, Compass, Gamepad2, Users, Landmark, CalendarDays } from "lucide-react";
import { surahList, juzData } from "Server/API/Quran";
import { hadithCollections } from "Server/API/Hadith";
import { duaCategories, getTajweedCategories, getLetters } from "Server/API/Aid";
import vocabularyData from "Server/Data/Aid/Arabic/Vocabulary.json";
import { normalizeArabic } from "Client/Utility/Quran/Normalize-Arabic";
import { matchAnyField } from "./AdvancedQuery";
import type { SearchCategory, SearchResult, SearchCategoryConfig } from "./Types";

// ============= Pages =============
export const ALL_PAGES = [
  { name: "Home", path: "/", icon: Home },
  { name: "Quran", path: "/Quran", icon: BookOpen },
  { name: "Hadith", path: "/Hadith", icon: BookText },
  { name: "Aid", path: "/Aid", icon: Sparkles },
  { name: "Duas", path: "/Aid/Dua", icon: MessageSquare },
  { name: "Prayer Times", path: "/Aid/Prayers", icon: Clock },
  { name: "Tajweed", path: "/Aid/Arabic/Tajweed", icon: BookOpen },
  { name: "Arabic", path: "/Aid/Arabic", icon: BookOpen },
  { name: "Arabic Alphabet", path: "/Aid/Arabic/Alphabet", icon: BookOpen },
  { name: "Qibla", path: "/Aid/Qibla", icon: Compass },
  { name: "Tasbih Counter", path: "/Aid/Tasbih", icon: Home },
  { name: "Zakat Calculator", path: "/Aid/Zakat-Calculator", icon: Calculator },
  { name: "Inheritance Calculator", path: "/Aid/Inheritance-Calculator", icon: Calculator },
  { name: "Islamic Will", path: "/Aid/Islamic-Will", icon: BookText },
  { name: "Hijri Calendar", path: "/Aid/Hijri-Calendar", icon: CalendarDays },
  { name: "Masjid Finder", path: "/Aid/Masjid-Finder", icon: Landmark },
  { name: "Hajj & Umrah Guide", path: "/Aid/Hajj-Umrah-Guide", icon: Compass },
  { name: "Ummah", path: "/Aid/Ummah", icon: Users },
  { name: "Games", path: "/Aid/Games", icon: Gamepad2 },
  { name: "Guess Surah", path: "/Aid/Games/Guess-What/Surah", icon: Gamepad2 },
  { name: "Guess Prophet", path: "/Aid/Games/Guess-What/Prophet", icon: Gamepad2 },
  { name: "Goals", path: "/Quran/Goal", icon: Home },
  { name: "99 Names of Allah", path: "/Aid/Names", icon: Sparkles },
  { name: "How to Pray Namaz", path: "/Aid/Namaz", icon: BookOpen },
  { name: "25 Prophets", path: "/Aid/Prophets", icon: BookOpen },
  { name: "5 Pillars of Islam", path: "/Aid/Pillars", icon: BookOpen },
  { name: "6 Articles of Faith", path: "/Aid/Articles", icon: BookOpen },
  { name: "Schools & Branches", path: "/Aid/Schools", icon: BookText },
  { name: "Q & A", path: "/Aid/Q-and-A", icon: MessageSquare },
  { name: "Feedback", path: "/Feedback", icon: MessageSquare },
  { name: "Privacy", path: "/Privacy", icon: Home },
  { name: "Terms", path: "/Terms", icon: Home },
  { name: "Profile", path: "/Profile", icon: Home },
];

// ============= Categories =============
export const CATEGORIES: SearchCategoryConfig[] = [
  { id: "pages", label: "Pages", placeholder: "Search pages...", icon: Home },
  { id: "quran", label: "Quran", placeholder: "Search Surahs, Juz, Pages, Verses...", icon: BookOpen },
  { id: "hadith", label: "Hadith", placeholder: "Search Hadith collections...", icon: BookText },
  { id: "aid", label: "Aid", placeholder: "Search Duas, Arabic, Tajweed, Prayers...", icon: Sparkles },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export const AVAILABLE_SURAHS_FOR_VERSE_SEARCH = [1, 112, 113, 114];

export interface VerseResult {
  surahId: number;
  surahName: string;
  verseNumber: number;
  arabic: string;
  translation: string;
  verseKey: string;
}

// ============= Helpers =============
export function getResultTypeLabel(category: SearchCategory): string {
  switch (category) {
    case "quran": return "Quran Results";
    case "hadith": return "Hadith Collections";
    case "aid": return "Aid Results";
    default: return "Pages";
  }
}

export function getCategoryLabel(category: SearchCategory): string {
  return CATEGORY_MAP[category]?.label || "Search";
}

// ============= Scoring =============
function scoreMatch(query: string, candidates: Array<string | undefined | null>): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const qNorm = normalizeArabic(q);
  const qTokens = qNorm.split(/[\s\-_/]+/).filter(Boolean);
  let best = 0;
  for (const raw of candidates) {
    if (!raw) continue;
    const c = raw.toLowerCase();
    const cNorm = normalizeArabic(c);
    const words = cNorm.split(/[\s\-_/]+/).filter(Boolean);
    const acronym = words.map((w) => w[0]).join("");
    let s = 0;
    if (c === q || cNorm === qNorm) s = 100;
    else if (c.startsWith(q) || cNorm.startsWith(qNorm)) s = 80;
    else if (acronym && acronym === qNorm) s = 72;
    else if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(c)) s = 60;
    else if (c.includes(q) || cNorm.includes(qNorm)) s = 40;
    else if (qTokens.length > 1 && qTokens.every((token) => cNorm.includes(token))) s = 35;
    else if (qTokens.length === 1 && words.some((word) => word.startsWith(qTokens[0]) || levenshtein(word, qTokens[0]) <= 1)) s = 25;
    if (s > best) best = s;
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return dp[b.length];
}

// ============= Aid index =============
interface AidEntry {
  id: string;
  title: string;
  subtitle?: string;
  arabicName?: string;
  path: string;
  type: string;
  searchable: string[];
}

let _aidIndex: AidEntry[] | null = null;
function getAidIndex(): AidEntry[] {
  if (_aidIndex) return _aidIndex;
  const entries: AidEntry[] = [];

  // Duas
  for (const cat of duaCategories) {
    const slug = cat.name.replace(/ /g, "-");
    entries.push({
      id: `dua-${slug}`,
      title: cat.name,
      subtitle: `${cat.duas.length} duas`,
      path: `/Aid/Dua/${slug}`,
      type: "Dua",
      searchable: [cat.name, "dua"],
    });
  }

  // Arabic vocabulary (categories, subcategories, words)
  try {
    const vocab = vocabularyData as any;
    for (const cat of vocab.categories || []) {
      entries.push({
        id: `arabic-cat-${cat.id}`,
        title: cat.name,
        subtitle: "Arabic Category",
        arabicName: cat.arabicName,
        path: `/Aid/Arabic/${cat.title}`,
        type: "Arabic",
        searchable: [cat.name, cat.arabicName, cat.id],
      });
      for (const sub of cat.subcategories || []) {
        entries.push({
          id: `arabic-sub-${cat.id}-${sub.id}`,
          title: sub.name,
          subtitle: `${cat.name} · ${sub.words?.length || 0} words`,
          arabicName: sub.arabicName,
          path: `/Aid/Arabic/${cat.id}/${sub.id}`,
          type: "Arabic",
          searchable: [sub.name, sub.arabicName, sub.id],
        });
        for (const word of sub.words || []) {
          entries.push({
            id: `arabic-word-${word.id}`,
            title: word.english,
            subtitle: word.transliteration ? `${word.transliteration} · ${sub.name}` : sub.name,
            arabicName: word.arabic,
            path: `/Aid/Arabic/${cat.id}/${sub.id}/${word.id}`,
            type: "Word",
            searchable: [word.english, word.arabic, word.transliteration, word.root, word.definition],
          });
        }
      }
    }
  } catch (e) {
    console.error("Aid vocabulary index failed", e);
  }

  // Tajweed categories + rules
  try {
    for (const cat of getTajweedCategories()) {
      entries.push({
        id: `tajweed-${cat.id}`,
        title: cat.name,
        subtitle: "Tajweed Rule",
        path: `/Aid/Arabic/Tajweed/${cat.id}`,
        type: "Tajweed",
        searchable: [cat.name, cat.description, "tajweed"],
      });
      for (const sub of cat.subcategories || []) {
        entries.push({
          id: `tajweed-${cat.id}-${sub.id}`,
          title: sub.name,
          subtitle: `${cat.name} · Tajweed`,
          path: `/Aid/Arabic/Tajweed/${cat.id}/${sub.id}`,
          type: "Tajweed",
          searchable: [sub.name, sub.description],
        });
      }
    }
  } catch (e) {
    console.error("Aid tajweed index failed", e);
  }

  // Alphabet letters
  try {
    for (const l of getLetters()) {
      entries.push({
        id: `letter-${l.id}`,
        title: l.name,
        subtitle: l.pronunciation ? `Letter · ${l.pronunciation}` : "Letter",
        arabicName: l.forms?.isolated,
        path: `/Aid/Arabic/Alphabet/${l.id}`,
        type: "Letter",
        searchable: [l.name, l.pronunciation, l.forms?.isolated],
      });
    }
  } catch (e) {
    console.error("Aid alphabet index failed", e);
  }

  // Aid static pages
  const aidPages = [
    { name: "Prayer Times", path: "/Aid/Prayers", terms: "salah namaz prayer timetable adhan" },
    { name: "Qibla", path: "/Aid/Qibla" },
    { name: "Tasbih Counter", path: "/Aid/Tasbih", terms: "dhikr zikr counter" },
    { name: "Zakat Calculator", path: "/Aid/Zakat-Calculator" },
    { name: "Inheritance Calculator", path: "/Aid/Inheritance-Calculator", terms: "faraid mirath shares estate" },
    { name: "Islamic Will", path: "/Aid/Islamic-Will", terms: "wasiyyah testament bequest" },
    { name: "Hijri Calendar", path: "/Aid/Hijri-Calendar" },
    { name: "Masjid Finder", path: "/Aid/Masjid-Finder", terms: "mosque nearby map" },
    { name: "Hajj & Umrah Guide", path: "/Aid/Hajj-Umrah-Guide", terms: "pilgrimage ihram tawaf sai mina arafah muzdalifah" },
    { name: "Ummah", path: "/Aid/Ummah", terms: "community posts social" },
    { name: "Games", path: "/Aid/Games", terms: "quiz guess surah prophet" },
    { name: "Guess Surah", path: "/Aid/Games/Guess-What/Surah", terms: "game quiz quran" },
    { name: "Guess Prophet", path: "/Aid/Games/Guess-What/Prophet", terms: "game quiz prophets" },
    { name: "99 Names of Allah", path: "/Aid/Names", terms: "asma ul husna" },
    { name: "How to Pray Namaz", path: "/Aid/Namaz", terms: "salah salat prayer guide" },
    { name: "I am Feeling", path: "/Aid/Feeling", terms: "emotions help verses" },
    { name: "25 Prophets", path: "/Aid/Prophets", terms: "messengers stories" },
    { name: "5 Pillars of Islam", path: "/Aid/Pillars", terms: "shahadah salah zakat sawm hajj" },
    { name: "6 Articles of Faith", path: "/Aid/Articles", terms: "iman beliefs angels books qadar" },
    { name: "Schools & Branches", path: "/Aid/Schools", terms: "madhhab sects branches" },
    { name: "Q & A", path: "/Aid/Q-and-A", terms: "questions answers ask" },
  ];
  for (const p of aidPages) {
    entries.push({
      id: `aid-page-${p.path}`,
      title: p.name,
      subtitle: "Aid Page",
      path: p.path,
      type: "Page",
      searchable: [p.name, (p as any).terms],
    });
  }

  _aidIndex = entries;
  return entries;
}

// ============= Main search =============
export function searchByCategory(
  query: string,
  category: SearchCategory,
  navLinks: Array<{ name: string; path: string }>,
  supportLinks: Array<{ name: string; path: string }>
): SearchResult[] {
  if (!query.trim()) return [];
  const scored: Array<SearchResult & { _score: number }> = [];

  switch (category) {
    case "pages": {
      const allPages = [...ALL_PAGES, ...navLinks, ...supportLinks];
      for (const page of allPages) {
        const s = scoreMatch(query, [page.name, page.path]);
        const advanced = matchAnyField(query, () => [page.name, page.path]);
        if (s > 0 || advanced(page)) {
          scored.push({
            id: page.path,
            title: page.name,
            path: page.path,
            type: "Page",
            _score: s || 30,
          });
        }
      }
      break;
    }

    case "quran": {
      for (const surah of surahList) {
        const s = scoreMatch(query, [
          surah.englishName,
          (surah as any).englishNameTransliteration,
          surah.name,
          surah.englishNameTranslation,
          String(surah.id),
        ]);
        if (s > 0) {
          scored.push({
            id: `surah-${surah.id}`,
            title: surah.englishName,
            subtitle: `${surah.numberOfAyahs} verses · ${surah.englishNameTranslation}`,
            arabicName: surah.name,
            path: `/Quran/Surah/${surah.id}`,
            type: "Surah",
            _score: s,
          });
        }
      }

      for (const juz of juzData) {
        const s = scoreMatch(query, [`juz ${juz.juzNumber}`, String(juz.juzNumber)]);
        if (s > 0) {
          scored.push({
            id: `juz-${juz.juzNumber}`,
            title: `Juz ${juz.juzNumber}`,
            subtitle: `Starts from Surah ${juz.surahs[0]?.id || 1}`,
            path: `/Quran/Juz/${juz.juzNumber}`,
            type: "Juz",
            _score: s,
          });
        }
      }

      const pageMatch = query.match(/^(?:page\s*)?(\d+)$/i);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1]);
        if (pageNum >= 1 && pageNum <= 604) {
          scored.push({
            id: `page-${pageNum}`,
            title: `Page ${pageNum}`,
            subtitle: "Quran Page",
            path: `/Quran/Page/${pageNum}`,
            type: "Page",
            _score: 90,
          });
        }
      }
      const hizbMatch = query.match(/^hizb\s*(\d+)$/i);
      if (hizbMatch) {
        const n = parseInt(hizbMatch[1]);
        if (n >= 1 && n <= 60) {
          scored.push({
            id: `hizb-${n}`,
            title: `Hizb ${n}`,
            subtitle: "Quran Hizb",
            path: `/Quran/Hizb/${n}`,
            type: "Hizb",
            _score: 90,
          });
        }
      }

      const verseMatch = query.match(/^(\d+):(\d+)$/);
      if (verseMatch) {
        const surahNum = parseInt(verseMatch[1]);
        const verseNum = parseInt(verseMatch[2]);
        const surah = surahList.find((s) => s.id === surahNum);
        if (surah && verseNum <= surah.numberOfAyahs) {
          scored.push({
            id: `verse-${surahNum}-${verseNum}`,
            title: `${surah.englishName} ${surahNum}:${verseNum}`,
            subtitle: `Verse ${verseNum} of ${surah.englishName}`,
            arabicName: surah.name,
            path: `/Quran/Surah/${surahNum}?verse=${verseNum}`,
            type: "Verse",
            _score: 95,
          });
        }
      }
      break;
    }

    case "hadith": {
      for (const collection of hadithCollections) {
        const s = scoreMatch(query, [collection.name, (collection as any).arabicName, (collection as any).slug]);
        if (s > 0) {
          scored.push({
            id: collection.id,
            title: collection.name,
            subtitle: `${collection.hadithCount.toLocaleString()} hadith`,
            arabicName: (collection as any).arabicName,
            path: `/Hadith/${collection.id}`,
            type: "Collection",
            _score: s,
          });
        }
      }
      break;
    }

    case "aid": {
      const idx = getAidIndex();
      for (const e of idx) {
        const s = scoreMatch(query, e.searchable);
        const advanced = matchAnyField(query, () => e.searchable);
        if (s > 0 || advanced(e)) {
          scored.push({
            id: e.id,
            title: e.title,
            subtitle: e.subtitle,
            arabicName: e.arabicName,
            path: e.path,
            type: e.type,
            _score: s || 30,
          });
        }
      }
      break;
    }
  }

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 8).map(({ _score, ...rest }) => rest);
}

// ============= Per-category helpers (kept for /Search page) =============
export function searchPages(query: string): SearchResult[] {
  return searchByCategory(query, "pages", [], []);
}

export function searchSurahs(query: string): SearchResult[] {
  return searchByCategory(query, "quran", [], []).filter(r => r.type === "Surah");
}

export function searchHadiths(query: string): SearchResult[] {
  return searchByCategory(query, "hadith", [], []);
}

export function searchDuas(query: string): SearchResult[] {
  return searchByCategory(query, "aid", [], []).filter(r => r.type === "Dua");
}

export function searchAid(query: string): SearchResult[] {
  return searchByCategory(query, "aid", [], []);
}

export async function searchVerses(query: string): Promise<VerseResult[]> {
  const lower = query.toLowerCase();
  const found: VerseResult[] = [];

  for (const surahId of AVAILABLE_SURAHS_FOR_VERSE_SEARCH) {
    try {
      const { getSurah } = await import("Server/API/Quran");
      const { surahList: sl } = await import("Server/API/Quran");
      const surah = await getSurah(surahId, { translation: "Direct" });
      const meta = sl.find((s) => s.id === surahId);
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
