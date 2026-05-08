// Component/Settings/Content/Quran/Constant.tsx
import { Type, Languages, BookOpen, AlignLeft, AudioLines, Info, BookText, LayoutGrid } from "lucide-react";

// Subcategories for Quran (tabs)
export const QURAN_SUBCATEGORIES = [
  { id: "arabic",          label: "Arabic",          icon: <Type className="h-4 w-4" /> },
  { id: "translation",     label: "Translation",     icon: <Languages className="h-4 w-4" /> },
  { id: "transliteration", label: "Transliteration", icon: <BookOpen className="h-4 w-4" /> },
  { id: "per-word",        label: "WBW",        icon: <AlignLeft className="h-4 w-4" /> },
  { id: "audio",           label: "Audio",           icon: <AudioLines className="h-4 w-4" /> },
  { id: "hifz",            label: "Hifz",            icon: <AudioLines className="h-4 w-4" /> },
  { id: "surah-info",      label: "Surah Info",      icon: <Info className="h-4 w-4" /> },
  { id: "tafsir",          label: "Tafsir",          icon: <BookText className="h-4 w-4" /> },
  { id: "layout",          label: "Layout",          icon: <LayoutGrid className="h-4 w-4" /> },
];

// KFGQPC font variants
export const KFGQPC_VARIANTS = [
  { id: "uthmani" as const,    label: "QPC Uthmani Hafs" },
  { id: "uthmani_v1" as const, label: "King Fahad Complex V1" },
  { id: "uthmani_v2" as const, label: "King Fahad Complex V2" },
  { id: "uthmani_v4" as const, label: "King Fahad Complex V4" },
];

// Reciters
export const RECITERS = [
  { id: "Mishary_Rashid_Alafasy",                    label: "Mishari Rashid al-Afasy" },
  { id: "Abdul-Basit-Abdus-Samad-Murattal",          label: "Abdul Basit Abdus-Samad (Murattal)" },
  { id: "Abdul-Basit-Abdus-Samad-Mujawwad",          label: "Abdul Basit Abdus-Samad (Mujawwad)" },
];

// Translators
export const TRANSLATORS = [
  { id: "None",                 label: "None" },
  { id: "Direct",               label: "Direct" },
  { id: "Saheeh-International", label: "Saheeh International" },
];

// Transliterators
export const TRANSLITERATORS = [
  { id: "None",     label: "None" },
  { id: "Standard", label: "Standard" },
  { id: "WBW",      label: "WBW" },
];

// Layout options
export const LAYOUTS = [
  { id: "standard", label: "Standard" },
  { id: "wide",     label: "Wide" },
];

// Preview words (optional, kept for potential use)
export const PREVIEW_WORDS = [
  { arabic: "بِسْمِ",       translation: "In the name of"    },
  { arabic: "اللَّهِ",      translation: "Allah"             },
  { arabic: "الرَّحْمَٰنِ", translation: "the Most Gracious" },
  { arabic: "الرَّحِيمِ",   translation: "the Most Merciful" },
];