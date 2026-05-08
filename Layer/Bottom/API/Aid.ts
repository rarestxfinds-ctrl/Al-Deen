// ============= Vite / Next.js (Turbopack) =============
const duaModules = import.meta.glob<{ default: any[][] }>(
  "@/Bottom/Data/Aid/Dua/*.json",
  { eager: true }
);

const tajweedModules = import.meta.glob<{ default: any }>(
  "@/Bottom/Data/Aid/Tajweed/**/*.json",
  { eager: true }
);

import alphabetData from "@/Bottom/Data/Aid/Alphabet/Letter.json";
import { nanoid } from 'nanoid';

// ============= Tajweed Types =============

export interface TajweedRule {
  letter: string;
  transliteration: string;
  description: string;
  example: string;
  exampleTranslation: string;
}

export interface TajweedSubcategory {
  id: string;
  name: string;
  description: string;
  rules: TajweedRule[];
}

export interface TajweedSubfolder {
  id: string;
  name: string;
  subcategories: TajweedSubcategory[];
}

export interface TajweedCategoryDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  hasSubfolders: boolean;
  subfolders: TajweedSubfolder[];
  subcategories: TajweedSubcategory[]; // direct JSON files under the category
}

// ============= Alphabet Types =============

export interface LetterForms {
  isolated: string;
  initial: string;
  medial: string;
  final: string;
}

export interface Letter {
  id: string;
  name: string;
  forms: LetterForms;
  pronunciation: string;
  example: string;
  exampleTranslation: string;
}

// ============= Dua Types =============

export interface DuaItem {
  id: string;
  arabic: string;
  transliteration?: string | string[];
  translation: string;
  wbw?: string[];
  reference: string;
  audioUrl?: string;
}

export interface DuaCategory {
  name: string;
  duas: DuaItem[];
}

// ============= Helper Functions =============

function formatNameFromId(filename: string): string {
  return filename
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatIdFromFilename(filename: string): string {
  return filename.replace(/ /g, "-");
}

/**
 * Parse a reference string containing '#' delimiter.
 * Example: "Abu Dawud #3850" => { text: "Abu Dawud", number: "3850" }
 * Returns null if no '#' found.
 */
export function parseReference(ref: string): { text: string; number: string } | null {
  const index = ref.indexOf('#');
  if (index === -1) return null;
  return {
    text: ref.substring(0, index).trim(),
    number: ref.substring(index + 1).trim()
  };
}

// ============= Tajweed Data – Hierarchical Build =============

type FolderNode = {
  name: string;
  subfolders: Map<string, FolderNode>;
  files: TajweedSubcategory[];
  parentDescription?: string;
};

const categoryNodes: Map<string, FolderNode> = new Map();

for (const [path, mod] of Object.entries(tajweedModules)) {
  const data = mod.default;
  const pathParts = path.split("/");
  const tajweedIndex = pathParts.findIndex(part => part === "Tajweed");
  if (tajweedIndex === -1 || tajweedIndex + 1 >= pathParts.length) continue;

  const topFolder = pathParts[tajweedIndex + 1]; // e.g., "Makharij", "Sifaat"
  let currentNode = categoryNodes.get(topFolder);
  if (!currentNode) {
    currentNode = { name: topFolder, subfolders: new Map(), files: [] };
    categoryNodes.set(topFolder, currentNode);
  }

  // Traverse remaining path segments after the top folder
  for (let i = tajweedIndex + 2; i < pathParts.length - 1; i++) {
    const folderName = pathParts[i];
    let next = currentNode.subfolders.get(folderName);
    if (!next) {
      next = { name: folderName, subfolders: new Map(), files: [] };
      currentNode.subfolders.set(folderName, next);
    }
    currentNode = next;
  }

  // The file itself
  const filename = pathParts[pathParts.length - 1].replace(".json", "");
  const id = formatIdFromFilename(filename);
  const name = formatNameFromId(filename);

  // ========== Handle Parent.json ==========
  if (filename.toLowerCase() === "parent") {
    // Expected format: ["Description string"]
    if (Array.isArray(data) && data.length >= 1 && typeof data[0] === 'string') {
      currentNode.parentDescription = data[0];
    }
    continue; // skip adding as a subcategory
  }
  // ========================================

  // Regular subcategory JSON (new format)
  if (Array.isArray(data) && data.length >= 2 && typeof data[0] === 'string' && Array.isArray(data[1])) {
    const description = data[0];
    const rulesArray = data[1];
    
    const rules: TajweedRule[] = rulesArray.map((rule: any[]) => ({
      letter: rule[0],
      transliteration: rule[1],
      description: rule[2],
      example: rule[3],
      exampleTranslation: rule[4] || "",
    }));

    const subcategory: TajweedSubcategory = {
      id,
      name,
      description,
      rules
    };
    currentNode.files.push(subcategory);
  }
}

// Build category details from nodes
const tajweedCategoryDetails: TajweedCategoryDetail[] = Array.from(categoryNodes.entries()).map(([folderName, node]) => {
  const hasSubfolders = node.subfolders.size > 0;

  // Category display name (with optional parent description)
  const categoryBaseName = formatNameFromId(folderName);
  const categoryDisplayName = node.parentDescription
    ? `${categoryBaseName} - ${node.parentDescription}`
    : categoryBaseName;

  // Subfolders display names (also with optional parent description)
  const subfolders: TajweedSubfolder[] = Array.from(node.subfolders.entries()).map(([subName, subNode]) => {
    const subBaseName = formatNameFromId(subName);
    const subDisplayName = subNode.parentDescription
      ? `${subBaseName} - ${subNode.parentDescription}`
      : subBaseName;
    return {
      id: formatIdFromFilename(subName),
      name: subDisplayName,
      subcategories: subNode.files,
    };
  });

  const subcategories = node.files; // direct JSON files under the category

  return {
    id: formatIdFromFilename(folderName),
    name: categoryDisplayName,
    description: hasSubfolders ? `${subfolders.length} sections` : `${subcategories.length} ${subcategories.length === 1 ? 'rule' : 'rules'}`,
    icon: "BookOpen",
    color: "#8B5CF6",
    hasSubfolders,
    subfolders,
    subcategories,
  };
});

// For backward compatibility, also provide flat list of categories (like before)
export interface TajweedCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  subcategories: TajweedSubcategory[];
}

const tajweedCategoriesFlat: TajweedCategory[] = tajweedCategoryDetails.map(cat => ({
  ...cat,
  subcategories: cat.hasSubfolders ? [] : cat.subcategories, // for flat display, only direct files
}));

// ============= Dua Data =============

const duaCategories: DuaCategory[] = Object.entries(duaModules).map(
  ([path, mod]) => {
    const filename = path.split("/").pop()?.replace(".json", "") || "";
    const duasArray = mod.default;
    
    if (!Array.isArray(duasArray) || (duasArray.length > 0 && !Array.isArray(duasArray[0]))) {
      console.error(`Invalid format in ${filename}. Expected array of arrays.`);
      return {
        name: formatNameFromId(filename),
        duas: [],
      };
    }
    
    return {
      name: formatNameFromId(filename),
      duas: duasArray.map((item: any[], idx: number) => {
        if (item.length >= 5 && typeof item[0] === 'string' && typeof item[2] === 'string' && typeof item[4] === 'string') {
          return {
            id: nanoid(),
            arabic: item[0],
            transliteration: item[1],
            translation: item[2],
            wbw: Array.isArray(item[3]) ? item[3] : undefined,
            reference: item[4],
          };
        }
        else if (item.length >= 3 && typeof item[0] === 'string' && typeof item[1] === 'string' && typeof item[2] === 'string') {
          return {
            id: nanoid(),
            arabic: item[0],
            translation: item[1],
            reference: item[2],
          };
        }
        else {
          console.warn(`Unknown format for dua in ${filename} at index ${idx}`, item);
          return {
            id: nanoid(),
            arabic: "",
            translation: "",
            reference: "",
          };
        }
      }),
    };
  }
);

// ============= API Functions =============

export function getTajweedCategories(): TajweedCategory[] {
  return tajweedCategoriesFlat;
}

export function getTajweedCategoryDetail(id: string): TajweedCategoryDetail | undefined {
  return tajweedCategoryDetails.find(c => c.id === id);
}

// For backward compatibility: get a flat category (no subfolders)
export function getTajweedCategory(id: string): TajweedCategory | undefined {
  const detail = getTajweedCategoryDetail(id);
  if (!detail) return undefined;
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description,
    icon: detail.icon,
    color: detail.color,
    subcategories: detail.hasSubfolders ? [] : detail.subcategories,
  };
}

// Get a subcategory from a flat category (direct files only)
export function getTajweedSubcategory(
  categoryId: string,
  subcategoryId: string
): TajweedSubcategory | undefined {
  const category = getTajweedCategory(categoryId);
  return category?.subcategories.find(s => s.id === subcategoryId);
}

// Get a subcategory from a subfolder
export function getTajweedSubfolderSubcategory(
  categoryId: string,
  subfolderId: string,
  subcategoryId: string
): TajweedSubcategory | undefined {
  const category = getTajweedCategoryDetail(categoryId);
  const subfolder = category?.subfolders.find(f => f.id === subfolderId);
  return subfolder?.subcategories.find(s => s.id === subcategoryId);
}

// ============= Alphabet API =============

const letters = alphabetData as Letter[];

export function getLetters(): Letter[] {
  return letters;
}

export function getLetter(id: string): Letter | null {
  return letters.find((l) => l.id === id) ?? null;
}

// ============= Dua API =============

export { duaCategories };

export function getDuaCategory(categoryName: string): DuaCategory | null {
  return duaCategories.find((c) => c.name === categoryName) ?? null;
}

export function getAllDuaCategories(): DuaCategory[] {
  return duaCategories;
}

export function searchDuas(query: string): (DuaItem & { categoryName: string; duaIndex: number })[] {
  const lower = query.toLowerCase();
  const results: (DuaItem & { categoryName: string; duaIndex: number })[] = [];
  for (const cat of duaCategories) {
    for (let i = 0; i < cat.duas.length; i++) {
      const item = cat.duas[i];
      if (
        item.translation.toLowerCase().includes(lower) ||
        item.arabic.includes(query) ||
        item.reference.toLowerCase().includes(lower)
      ) {
        results.push({ ...item, categoryName: cat.name, duaIndex: i });
      }
    }
  }
  return results;
}