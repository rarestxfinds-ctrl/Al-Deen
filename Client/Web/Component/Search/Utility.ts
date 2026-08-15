// @Web/Component/Search/Utility.ts

import { Home, BookOpen, BookText, MessageSquare, Clock, Sparkles, Calculator, Compass, Gamepad2, Users, Landmark, CalendarDays } from "lucide-react";
import { normalizeArabic } from "@/Utility/Quran/Normalize-Arabic";
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

// ============= Synchronized Client-Side State Mirrors =============
let localQuranCorpus: any = null;
let isSyncingQuran = false;

let localHadithCollections: any[] = [
  {
    id: "Sahih-Muslim",
    slug: "Sahih-Muslim",
    name: "Sahih Muslim",
    author: "Muslim",
    topFolder: "Sahih",
    authorFolder: "Muslim",
    hadithCount: 0,
    description: "Sahih collection compiled by Muslim."
  }
];

let cachedAidCorpus: any = null;
let _aidIndex: AidEntry[] | null = null;
let isSyncingAid = false;

// ============= API Worker Layer (Codespace Safe Routes) =============
const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function syncQuranCorpusFromBackend(): Promise<any> {
  if (localQuranCorpus) return localQuranCorpus;
  if (isSyncingQuran) {
    while (isSyncingQuran) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return localQuranCorpus;
  }
  isSyncingQuran = true;
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
    if (!response.ok) throw new Error("Failed to load backend quran corpus data");
    localQuranCorpus = await response.json();
    return localQuranCorpus;
  } catch (error) {
    console.error("Failed syncing search utility Quran cache:", error);
    return null;
  } finally {
    isSyncingQuran = false;
  }
}

async function syncHadithCollectionsFromBackend() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/hadith-corpus`);
    if (!response.ok) return;
    const data = await response.json();
    if (data?.collections) {
      localHadithCollections = data.collections;
    }
  } catch (error) {
    console.error("Failed syncing search utility Hadith cache:", error);
  }
}

async function syncAidCorpusFromBackend(): Promise<any> {
  if (cachedAidCorpus) return cachedAidCorpus;
  if (isSyncingAid) {
    while (isSyncingAid) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return cachedAidCorpus;
  }
  isSyncingAid = true;
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/aid-corpus`);
    if (!response.ok) throw new Error("Failed to load backend aid corpus data");
    cachedAidCorpus = await response.json();
    return cachedAidCorpus;
  } catch (error) {
    console.error("Failed syncing search utility Aid cache:", error);
    return null;
  } finally {
    isSyncingAid = false;
  }
}

// Baseline data population fired on script execution
syncQuranCorpusFromBackend();
syncHadithCollectionsFromBackend();
syncAidCorpusFromBackend();

// ============= Scoring Helpers =============
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

// ============= Client-Side Index Structuring =============
interface AidEntry {
  id: string;
  title: string;
  subtitle?: string;
  arabicName?: string;
  path: string;
  type: string;
  searchable: string[];
}

async function getAidIndex(): Promise<AidEntry[]> {
  if (_aidIndex) return _aidIndex;
  
  const corpus = await syncAidCorpusFromBackend();
  if (!corpus) return [];

  const entries: AidEntry[] = [];

  // 1. Duas
  if (Array.isArray(corpus.duas)) {
    for (const cat of corpus.duas) {
      const slug = cat.name.replace(/ /g, "-");
      entries.push({
        id: `dua-${slug}`,
        title: cat.name,
        subtitle: `${cat.duas?.length || 0} duas`,
        path: `/Aid/Dua/${slug}`,
        type: "Dua",
        searchable: [cat.name, "dua"],
      });
    }
  }

  // 2. Arabic Vocabulary mapping
  if (Array.isArray(corpus.arabicVocabulary)) {
    const mainVocab = corpus.arabicVocabulary.find((v: any) => v.id === "Arabic");
    const subCategories = mainVocab?.subcategories || corpus.arabicVocabulary;

    for (const cat of subCategories) {
      entries.push({
        id: `arabic-cat-${cat.id}`,
        title: cat.name,
        subtitle: "Arabic Category",
        path: `/Aid/Arabic/${cat.id}`,
        type: "Arabic",
        searchable: [cat.name, cat.id],
      });
      for (const sub of cat.subcategories || []) {
        entries.push({
          id: `arabic-sub-${cat.id}-${sub.id}`,
          title: sub.name,
          subtitle: `${cat.name} · ${sub.words?.length || 0} words`,
          path: `/Aid/Arabic/${cat.id}/${sub.id}`,
          type: "Arabic",
          searchable: [sub.name, sub.id],
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
  }

  // 3. Tajweed
  if (Array.isArray(corpus.tajweedCategories)) {
    for (const cat of corpus.tajweedCategories) {
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
  }

  // 4. Alphabet Letters
  if (Array.isArray(corpus.alphabet)) {
    for (const l of corpus.alphabet) {
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
  }

  // 5. Aid Static Pages Fallback Descriptor Map
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
      searchable: [p.name, p.terms || ""],
    });
  }

  _aidIndex = entries;
  return entries;
}

// ============= Main Search Controller (Converted to Async Promise) =============
export async function searchByCategory(
  query: string,
  category: SearchCategory,
  navLinks: Array<{ name: string; path: string }> = [],
  supportLinks: Array<{ name: string; path: string }> = []
): Promise<SearchResult[]> {
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
      const quranCorpus = await syncQuranCorpusFromBackend();
      const surahList = quranCorpus?.surahs || [];
      const totalPagesCount = quranCorpus?.pageMap?.length || 604;
      const totalHizbCount = quranCorpus?.hizbCount || 60;

      for (const surah of surahList) {
        const s = scoreMatch(query, [
          surah.englishName,
          surah.englishNameTransliteration,
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

      // Generate dynamic Juz arrays inside token loop directly from local payload geometry map
      const juzLength = quranCorpus?.juzMap?.length || 30;
      for (let i = 1; i <= juzLength; i++) {
        const s = scoreMatch(query, [`juz ${i}`, String(i)]);
        if (s > 0) {
          scored.push({
            id: `juz-${i}`,
            title: `Juz ${i}`,
            subtitle: `Quran Juz Segment`,
            path: `/Quran/Juz/${i}`,
            type: "Juz",
            _score: s,
          });
        }
      }

      const pageMatch = query.match(/^(?:page\s*)?(\d+)$/i);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1]);
        if (pageNum >= 1 && pageNum <= totalPagesCount) {
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
        if (n >= 1 && n <= totalHizbCount) {
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
        const surah = surahList.find((s: any) => s.id === surahNum);
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
      await syncHadithCollectionsFromBackend();
      for (const collection of localHadithCollections) {
        const s = scoreMatch(query, [collection.name, collection.arabicName, collection.slug]);
        if (s > 0) {
          scored.push({
            id: collection.id,
            title: collection.name,
            subtitle: `${collection.hadithCount.toLocaleString()} hadith`,
            arabicName: collection.arabicName,
            path: `/Hadith/${collection.id}`,
            type: "Collection",
            _score: s,
          });
        }
      }
      break;
    }

    case "aid": {
      const idx = await getAidIndex();
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

// ============= Synchronous Adapters / Per-Category Handlers =============
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

export async function searchPages(query: string): Promise<SearchResult[]> {
  return searchByCategory(query, "pages", [], []);
}

export async function searchSurahs(query: string): Promise<SearchResult[]> {
  const list = await searchByCategory(query, "quran", [], []);
  return list.filter(r => r.type === "Surah");
}

export async function searchHadiths(query: string): Promise<SearchResult[]> {
  return searchByCategory(query, "hadith", [], []);
}

export async function searchDuas(query: string): Promise<SearchResult[]> {
  const list = await searchByCategory(query, "aid", [], []);
  return list.filter(r => r.type === "Dua");
}

export async function searchAid(query: string): Promise<SearchResult[]> {
  return searchByCategory(query, "aid", [], []);
}

export async function searchVerses(query: string): Promise<VerseResult[]> {
  const lower = query.toLowerCase();
  const found: VerseResult[] = [];
  const quranCorpus = await syncQuranCorpusFromBackend();
  const surahList = quranCorpus?.surahs || [];

  for (const surahId of AVAILABLE_SURAHS_FOR_VERSE_SEARCH) {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/surah/${surahId}?wbw=false`);
      if (!response.ok) continue;
      const surah = await response.json();
      
      const meta = surahList.find((s: any) => s.id === surahId);
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
    } catch (err) {
      console.error(`Error searching verse entries in surah ${surahId}:`, err);
    }
  }

  return found.slice(0, 30);
}