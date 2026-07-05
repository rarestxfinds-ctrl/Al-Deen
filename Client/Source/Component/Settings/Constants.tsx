import { User, Type, Globe, Bookmark, FileText, Clock, BookText, Heart, Palette, Accessibility } from "lucide-react";
import type { SettingsCategoryConfig, AccountSubcategoryConfig, AidSubcategoryConfig } from "./Types";
import { AID_SUBCATEGORIES } from "./Content/Aid/Constant";
import { QURAN_SUBCATEGORIES } from "./Content/Quran/Constant";  // ← ADD THIS IMPORT

// Main categories
export const SETTINGS_CATEGORIES: SettingsCategoryConfig[] = [
  { id: "account", label: "Account", icon: User, hasSubcategories: true },
  { id: "quran",   label: "Quran",   icon: Type, hasSubcategories: true },
  { id: "hadith",  label: "Hadith",  icon: BookText, hasSubcategories: false },
  { id: "aid",     label: "Aid",     icon: Heart, hasSubcategories: true },
  { id: "language", label: "Language", icon: Globe, hasSubcategories: false },
  { id: "theme", label: "Theme", icon: Palette, hasSubcategories: false },
  { id: "accessibility", label: "Accessibility", icon: Accessibility, hasSubcategories: false },
];

// Account subcategories
export const ACCOUNT_SUBCATEGORIES: AccountSubcategoryConfig[] = [
  { id: "profile",   label: "Profile",   icon: <User className="h-4 w-4" /> },
  { id: "bookmarks", label: "Bookmarks", icon: <Bookmark className="h-4 w-4" /> },
  { id: "notes",     label: "Notes",     icon: <FileText className="h-4 w-4" /> },
  { id: "history",   label: "History",   icon: <Clock className="h-4 w-4" /> },
];

// Helper to get subcategories for a given category
export const getSubcategories = (category: string) => {
  switch (category) {
    case "account":
      return ACCOUNT_SUBCATEGORIES;
    case "aid":
      return AID_SUBCATEGORIES;
    case "quran":                     // ← ADD THIS CASE
      return QURAN_SUBCATEGORIES;
    default:
      return [];
  }
};

// Add these exports for QuranSection
export const PREVIEW_WORDS = [
  { arabic: "بِسْمِ",       translation: "In the name of"    },
  { arabic: "اللَّهِ",      translation: "Allah"             },
  { arabic: "الرَّحْمَٰنِ", translation: "the Most Gracious" },
  { arabic: "الرَّحِيمِ",   translation: "the Most Merciful" },
];

export const RECITERS = [
  { id: "Mishary_Rashid_Alafasy",  label: "Mishari Rashid al-Afasy"      },
  { id: "Abdul-Basit-Abdus-Samad-Murattal",   label: "Abdul Basit Abdus-Samad Murattal"        },
  { id: "Abdul-Basit-Abdus-Samad-Mujawwad",   label: "Abdul-Basit-Abdus-Samad-Mujawwad"      },
];

export const TRANSLATORS = [
  { id: "Direct", label: "Direct" },
  { id: "Saheeh-International", label: "Saheeh International" },
];

export const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
];