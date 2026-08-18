// Types
import type React from "react";
import type { Page } from "@/Library/Quran-Types";

export type RefMap = React.MutableRefObject<Map<number, HTMLDivElement>>;

// Surah metadata. Field names match the real Quran type from Quran-API.ts
// (formatSurahEntry): Surah, Arabic, Translation, Transliteration,
// Revelation_Place, Revelation_Order, Ayah_Count, Start_Page, End_Page,
// Indo_Pak_Ayah_Ending, Layout.
export interface SurahMeta {
  Surah: number;
  Arabic: string;
  Translation: string;
  Transliteration: string;
  Revelation_Place: string | null;
  Revelation_Order: number | null;
  Ayah_Count: number;
  Start_Page: number;
  End_Page: number;
  Indo_Pak_Ayah_Ending: string[];
  Layout: Record<string, any> | null;
}

// A single Ayah row. Field names match the real Ayah type: Surah, Ayah,
// Arabic, plus the two glyph-presentation variants used for the different
// Uthmani script versions.
export interface AssembledVerse {
  Surah: number;
  Ayah: number;
  Arabic: string;
  Presentation_Form_A_Ligature_Based: string | null;
  Presentation_Form_A_Glyph_Based: string | null;
  Indo_Pak_Ayah_Ending: string | null;
}

export interface AssembledSurah extends SurahMeta {
  Ayah: AssembledVerse[];
  Kalimah: any[];
}

export interface PageAyahs {
  pageNumber: number;
  Ayah: AssembledVerse[];
}

export interface WordTooltipProps {
  translation?: string;
  transliteration?: string;
  enabled?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: React.ReactNode;
}

export interface ResolvedWord {
  Glyph: string;
  Ayah: AssembledVerse | null;
  WordIndex: number;
  IsVerseEnd: boolean;
  IsVerseMarker: boolean;
  AyahNumber?: number;
  Transliteration?: string;
}

export interface BasmalahWord {
  Glyph: string;
  Translation?: string;
  Transliteration?: string;
}

export interface PageLinesProps {
  ResolvedLines: ResolvedWord[][];
  FontClass: string;
  ArabicFontSize: string;
  WordSpacing: string;
  SurahNumber: number;
  AyahRefs: RefMap;
  HighlightedAyah: number | null;
  setHighlightedAyah: (ayah: number | null) => void;
  ShowTransliteration?: boolean;
  TransliterationFontSize?: string;
  HoverTranslation: string | boolean;
  InlineTranslation: string;
  InlineTransliteration: string;
  HideVerses?: boolean;
  HideVerseMarkers?: boolean;
  BasmalahWords?: BasmalahWord[];
  BasmalahFontFamily?: string;
  BasmalahFontClass?: string;
  BasmalahFontSize?: string;
  PageFontFamily?: string;
  IsIndoPakFont?: boolean;
  VerseMarkerOverrides?: string[];
  IsUthmaniV4Font?: boolean;
  JustifyLines?: boolean;
}

export interface PageCardProps {
  PageData: PageAyahs;
  RawPageData: Page | null;
  PageIndex: number;
  SurahNumber: number;
  ResolvedLines: ResolvedWord[][];
  ContainerClass: string;
  ShowArabicText: boolean;
  ShowTransliteration?: boolean;
  ShowBasmalahOnPage: boolean;
  BasmalahWords: BasmalahWord[];
  PageFontFamily: string;
  FontClass: string;
  ArabicFontSize: string;
  TranslationFontSize?: string;
  TransliterationFontSize?: string;
  AyahRefs: RefMap;
  HighlightedAyah: number | null;
  setHighlightedAyah: (ayah: number | null) => void;
  HoverTranslation: string | boolean;
  InlineTranslation: string;
  InlineTransliteration: string;
  HideVerses?: boolean;
  HideVerseMarkers?: boolean;
  IsIndoPakFont: boolean;
  VerseMarkerOverrides: string[];
  IsUthmaniV4Font: boolean;
  PageFooter?: React.ReactNode | ((pageNumber?: number) => React.ReactNode);
  WordSpacing: string;
  Layout: string | null;
}

export interface PageViewProps {
  Surah: SurahMeta;
  Show_Arabic_Text: boolean;
  Hover_Translation: string | boolean;
  Inline_Translation: string;
  Inline_Transliteration: string;
  FontClass: string;
  ArabicFontSize: string;
  Translation_Font_Size?: string;
  Transliteration_Font_Size?: string;
  Show_Transliteration?: boolean;
  Ayah_Refs: RefMap;
  WordSpacing?: string;
  HideVerses?: boolean;
  HideVerseMarkers?: boolean;
  PageFooter?: React.ReactNode | ((pageNumber?: number) => React.ReactNode);
}

// NOTE: PageView is still called from Surah/Index.tsx using Pascal_Snake_Case
// props (Show_Arabic_Text, Hover_Translation, Translation_Font_Size,
// Transliteration_Font_Size, Show_Transliteration, Ayah_Refs) while this
// interface — and presumably the PageView component itself — uses camelCase.
// That's the same class of bug we just fixed in AyahList/VerseCard. It's out
// of scope here because PageView.tsx wasn't provided, but it should get the
// same treatment.

export interface VerseCardProps {
  Ayah: AssembledVerse;
  Kalimah?: any[];
  Translation?: string | null;
  Translations?: Array<{ id?: string; name?: string; text: string; footnotes?: string[] }>;
  Transliteration?: string | null;
  Footnote?: string[];
  Surah?: SurahMeta;
  Show_Arabic_Text?: boolean;
  Show_Translation?: boolean;
  Translation_Font_Size?: string;
  Transliteration_Font_Size?: string;
  Show_Transliteration?: boolean;
  Hover_Translation?: string | boolean;
  Inline_Translation?: string;
  Inline_Transliteration?: string;
  Is_Highlighted?: boolean;
  Ayah_Ref?: (element: HTMLDivElement | null) => void;
  On_Notes_Click?: () => void;
  On_Share_Click?: () => void;
  On_Tafsir_Click?: () => void;
  On_Embed_Click?: () => void;
  On_Render_Click?: () => void;
}

export interface AyahListProps {
  Surah?: SurahMeta;
  Ayah?: AssembledVerse[];
  Kalimah?: any[];
  Translation?: any;
  Transliteration?: any[];
  Footnote?: string[];
  WBW_Translation?: any[];
  WBW_Transliteration?: any[];
  Show_Arabic_Text?: boolean;
  Show_Translation?: boolean;
  Show_Transliteration?: boolean;
  Translation_Font_Size?: string;
  Transliteration_Font_Size?: string;
  // NOTE: Selected_Translation / Selected_Transliteration were removed —
  // they were threaded through from Surah/Index.tsx but never actually read
  // anywhere in AyahList. Translation selection is multi-entry by design
  // (VerseCard renders every item in Translations), and transliteration
  // selection is already constrained upstream to a single active
  // transliterator before it reaches this component. If per-translation
  // filtering is ever actually needed, it should be reintroduced deliberately
  // alongside the filtering logic in AyahList's translationsByAyah map,
  // not as an unused pass-through prop.
  Hover_Translation?: string | boolean;
  Inline_Translation?: string;
  Inline_Transliteration?: string;
  Target_Ayah?: string;
  Ayah_Refs?: RefMap;
  On_Notes_Click?: (ayahId: number, text?: string) => void;
  On_Share_Click?: (ayahId: number, text?: string, translation?: string) => void;
  On_Tafsir_Click?: (ayahId: number) => void;
  On_Embed_Click?: (ayahId: number) => void;
  On_Render_Click?: (ayahId: number) => void;
  FlushFirstItemTop?: boolean;
}