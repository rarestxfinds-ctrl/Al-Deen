// Server/API/Hadith.ts
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Safe ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Hadith {
  i: number;           
  id: string;          
  num: number;         
  ar: string;          
  en: string;          
  na: string;          
}

export interface HadithChapterMeta {
  id: string;
  name: string;
  count: number;
  hadithRange: string;
}

export interface HadithChapter extends HadithChapterMeta {
  hadiths: Hadith[];
}

export interface HadithCollection {
  id: string;          
  slug: string;
  name: string;
  author: string;
  topFolder: string;   
  authorFolder: string;
  hadithCount: number;
  description: string;
}

// In-memory cache so Node only touches the disk on the first request
let cachedData: any = null;

export const hadithCollections: HadithCollection[] = [
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

export async function getHadithCorpus() {
  if (cachedData) {
    return cachedData;
  }

  try {
    // 🌟 1. __dirname is: /workspaces/ios-joyful-revamp/Server/API
    // 🌟 2. ".." moves up to: /workspaces/ios-joyful-revamp/Server
    // 🌟 3. Enters "Corpus/HadithCorpus.json"
    const filePath = path.resolve(__dirname, "..", "..", "Asset", "Corpus", "Hadith.json");
    
    const rawData = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(rawData);

    if (data?.collections) {
      data.collections.forEach((fresh: any) => {
        const existing = hadithCollections.find(c => c.slug.toLowerCase() === fresh.slug.toLowerCase());
        if (existing) {
          existing.hadithCount = fresh.hadithCount;
          existing.slug = fresh.slug;
        } else {
          hadithCollections.push({
            id: fresh.id,
            slug: fresh.slug,
            name: fresh.name,
            author: fresh.author,
            topFolder: fresh.topFolder,
            authorFolder: fresh.authorFolder,
            hadithCount: fresh.hadithCount,
            description: fresh.description
          });
        }
      });
    }

    cachedData = data;
    return data;
  } catch (error) {
    console.error("Error loading Hadith asset database from disk:", error);
    throw new Error("Failed to load Hadith asset database.");
  }
}