// render-surah/API/Aid.ts
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ESM Configuration mapping
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit types pulled directly from your application design core
export interface TajweedRule { letter: string; transliteration: string; description: string; example: string; exampleTranslation: string; }
export interface TajweedSubcategory { id: string; name: string; description: string; rules: TajweedRule[]; }
export interface TajweedSubfolder { id: string; name: string; subcategories: TajweedSubcategory[]; }
export interface TajweedCategoryDetail { id: string; name: string; description: string; icon: string; color: string; hasSubfolders: boolean; subfolders: TajweedSubfolder[]; subcategories: TajweedSubcategory[]; }
export interface TajweedCategory { id: string; name: string; description: string; icon: string; color: string; subcategories: TajweedSubcategory[]; }
export interface Letter { id: string; name: string; forms: { isolated: string; initial: string; medial: string; final: string }; pronunciation: string; example: string; exampleTranslation: string; }
export interface DuaItem { id: string; arabic: string; transliteration?: string | string[]; translation: string; wbw?: string[]; reference: string; }
export interface DuaCategory { name: string; duas: DuaItem[]; }
export interface FeelingEntry { verse: string; verseRef: string; hadith: string; hadithRef: string; note: string; }
export interface FeelingCategory { id: string; name: string; data: FeelingEntry; }
export interface PillarSection { heading: string; body: string; }
export interface PillarDetail { id: string; name: string; english: string; source: string; sections: PillarSection[]; }
export interface DivineName { index: number; arabic: string; english: string; meaning: string; }
export interface ArticleDetail { id: string; name: string; source: string; }
export interface ProphetSection { heading: string; body: string; }
export interface ProphetDetail { id: string; title: string; sections: ProphetSection[]; }
export interface ArabicWord { id: string; english: string; arabic: string; transliteration: string; root: string; arabicDefinition: string; definition: string; }
export interface ArabicSubcategory { id: string; name: string; words: ArabicWord[]; }
export interface ArabicCategory { id: string; name: string; subcategories: ArabicSubcategory[]; }
export interface ArabicVocabularyEntry { id: string; name: string; subcategories: ArabicCategory[]; }

// In-Memory cache layer
let cachedCorpus: any = null;

export async function getAidCorpus() {
  if (cachedCorpus) return cachedCorpus;

  try {
    const filePath = path.resolve(__dirname, "..", "Corpus", "Aid.json");
    const rawData = await fs.readFile(filePath, "utf-8");
    cachedCorpus = JSON.parse(rawData);
    return cachedCorpus;
  } catch (error) {
    console.error("Critical error loading Aid Corpus database from disk asset locations:", error);
    throw new Error("Failed to load global application Aid database layer.");
  }
}

// ============= Formatting Utilities =============

export function parseReference(ref: string): { text: string; number: string } | null {
  const index = ref.indexOf('#');
  if (index === -1) return null;
  return {
    text: ref.substring(0, index).trim(),
    number: ref.substring(index + 1).trim()
  };
}

export const ARTICLES_HADITH_SOURCE =
  'Narrated by ʿUmar ibn al-Khattab (RA): Jibrīl (ʿAS) came to the Prophet ﷺ and asked, ' +
  '"Tell me about īmān." He ﷺ said: "It is to believe in Allah, His Angels, His Books, ' +
  'His Messengers, the Last Day, and to believe in the Divine Decree — its good and its evil." ' +
  '(Sahih Muslim 8; the meaning is also in Sahih al-Bukhari 50)';

// ============= Core Export APIs mapping asynchronous lookups =============

// --- Alphabet ---
export async function getLetters(): Promise<Letter[]> {
  const corpus = await getAidCorpus();
  return corpus.alphabet;
}

export async function getLetter(id: string): Promise<Letter | null> {
  const letters = await getLetters();
  return letters.find(l => l.id === id) ?? null;
}

// --- Tajweed ---
export async function getTajweedCategoryDetails(): Promise<TajweedCategoryDetail[]> {
  const corpus = await getAidCorpus();
  return corpus.tajweedCategories;
}

export async function getTajweedCategories(): Promise<TajweedCategory[]> {
  const details = await getTajweedCategoryDetails();
  return details.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    color: cat.color,
    subcategories: cat.hasSubfolders ? [] : cat.subcategories
  }));
}

export async function getTajweedCategoryDetail(id: string): Promise<TajweedCategoryDetail | undefined> {
  const details = await getTajweedCategoryDetails();
  return details.find(c => c.id === id);
}

export async function getTajweedSubcategory(categoryId: string, subcategoryId: string): Promise<TajweedSubcategory | undefined> {
  const detail = await getTajweedCategoryDetail(categoryId);
  if (!detail) return undefined;
  const flat = detail.subcategories.find(s => s.id === subcategoryId);
  if (flat) return flat;
  for (const folder of detail.subfolders) {
    const found = folder.subcategories.find(s => s.id === subcategoryId);
    if (found) return found;
  }
  return undefined;
}

// --- Duas ---
export async function getAllDuaCategories(): Promise<DuaCategory[]> {
  const corpus = await getAidCorpus();
  return corpus.duas;
}

export async function getDuaCategory(categoryName: string): Promise<DuaCategory | null> {
  const categories = await getAllDuaCategories();
  return categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase()) ?? null;
}

export async function searchDuas(query: string): Promise<(DuaItem & { categoryName: string; duaIndex: number })[]> {
  const categories = await getAllDuaCategories();
  const lower = query.toLowerCase();
  const results: (DuaItem & { categoryName: string; duaIndex: number })[] = [];

  for (const cat of categories) {
    for (let i = 0; i < cat.duas.length; i++) {
      const item = cat.duas[i];
      if (
        item.translation.toLowerCase().includes(lower) || 
        item.arabic.includes(query) || 
        (item.reference && item.reference.toLowerCase().includes(lower))
      ) {
        results.push({ ...item, categoryName: cat.name, duaIndex: i });
      }
    }
  }
  return results;
}

// --- Feelings ---
export async function getFeelings(): Promise<FeelingCategory[]> {
  const corpus = await getAidCorpus();
  return corpus.feelings;
}

export async function getFeelingDetail(id: string): Promise<FeelingEntry | undefined> {
  const feelings = await getFeelings();
  return feelings.find(f => f.id.toLowerCase() === id.toLowerCase())?.data;
}

// --- Pillars ---
export async function getPillars(): Promise<PillarDetail[]> {
  const corpus = await getAidCorpus();
  return corpus.pillars;
}

export async function getPillarDetail(id: string): Promise<PillarDetail | undefined> {
  const pillars = await getPillars();
  return pillars.find(p => p.id.toLowerCase() === id.toLowerCase());
}

// --- Divine Names ---
export async function getDivineNames(): Promise<DivineName[]> {
  const corpus = await getAidCorpus();
  return corpus.divineNames;
}

// --- Articles of Faith ---
export async function getArticles(): Promise<ArticleDetail[]> {
  const corpus = await getAidCorpus();
  return corpus.articles;
}

export async function getArticleDetail(id: string): Promise<ArticleDetail | undefined> {
  const articles = await getArticles();
  return articles.find(a => a.id.toLowerCase() === id.toLowerCase());
}

// --- Prophets ---
export async function getProphets(): Promise<ProphetDetail[]> {
  const corpus = await getAidCorpus();
  return corpus.prophets;
}

export async function getProphetDetail(id: string): Promise<ProphetDetail | undefined> {
  const prophets = await getProphets();
  return prophets.find(p => p.id.toLowerCase() === id.toLowerCase());
}

// --- Arabic Vocabulary ---
export async function getVocabulary(): Promise<ArabicVocabularyEntry[]> {
  const corpus = await getAidCorpus();
  return corpus.arabicVocabulary;
}

export async function getArabicCategories(vocabId = "Vocabulary"): Promise<ArabicCategory[]> {
  const vocab = await getVocabulary();
  return vocab.find(v => v.id === vocabId)?.subcategories ?? [];
}

export async function getArabicCategory(catId: string, vocabId = "Vocabulary"): Promise<ArabicCategory | undefined> {
  const categories = await getArabicCategories(vocabId);
  return categories.find(c => c.id === catId);
}

export async function getArabicSubcategory(catId: string, subId: string, vocabId = "Vocabulary"): Promise<ArabicSubcategory | undefined> {
  const category = await getArabicCategory(catId, vocabId);
  return category?.subcategories.find(s => s.id === subId);
}

export async function getArabicWord(catId: string, subId: string, wordId: string, vocabId = "Vocabulary"): Promise<ArabicWord | undefined> {
  const subcategory = await getArabicSubcategory(catId, subId, vocabId);
  return subcategory?.words.find(w => w.id === wordId);
}