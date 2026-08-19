// Component/Settings/Types.ts
import { ReactNode } from "react";

export type SettingsCategory =
  | "account"
  | "quran"
  | "hadith"
  | "aid"
  | "language"
  | "theme"
  | "accessibility";
export type AccountSubcategory = "profile" | "bookmarks" | "notes" | "history";
export type AidSubcategory = "prayer-times" | "dua";
export type QuranSubcategory = ""
export type HadithSubcategory =

  | "arabic"
  | "translation"
  | "transliteration"
  | "per-word"
  | "audio"
  | "hifz"
  | "surah-info"
  | "tafsir"
  | "layout";

export interface SettingsCategoryConfig {
  id: SettingsCategory;
  label: string;
  icon: React.ElementType;
  hasSubcategories?: boolean;
}

export interface AccountSubcategoryConfig {
  id: AccountSubcategory;
  label: string;
  icon: ReactNode;
}

export interface AidSubcategoryConfig {
  id: AidSubcategory;
  label: string;
  icon: ReactNode;
}
export interface HadithSubcategoryConfig {
  id: HadithSubcategory;
  label: string;
  icon: ReactNode;
}

export interface QuranSubcategoryConfig {
  id: QuranSubcategory;
  label: string;
  icon: ReactNode;
}
