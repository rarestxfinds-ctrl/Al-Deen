// @/Component/Quran/Layout/Safhah/Types.ts
import type { AssembledSurah, AssembledVerse, SurahMeta } from "Server/API/Quran";

export interface WordTooltipProps {
  translation?: string;
  transliteration?: string;
  enabled: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: React.ReactNode;
}

export interface ResolvedWord {
  glyph: string;
  verse: AssembledVerse | null;
  wordIndex: number;
  isVerseEnd: boolean;
  isVerseNumber: boolean;
  verseNumber?: number;
  transliteration?: string;
}

export interface PageLinesProps {
  resolvedLines: ResolvedWord[][];
  fontClass: string;
  arabicFontSize: string;
  wordSpacing: string;
  surahId: number;
  verseRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  hoveredVerse: number | null;
  setHoveredVerse: (verse: number | null) => void;
  showTransliteration?: boolean;
  transliterationFontSize?: string;
  hoverTranslation: string | boolean;
  inlineTranslation: string;
  inlineTransliteration: string;
  inlineTranslationSize: number;
  inlineTransliterationSize: number;
}

export interface PageViewProps {
  surah: SurahMeta;
  assembledSurah: AssembledSurah;
  showArabicText: boolean;
  hoverTranslation: string | boolean;
  fontClass: string;
  arabicFontSize: string;
  translationFontSize: string;
  verseRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  wordSpacing?: string;
  showTransliteration?: boolean;
  transliterationFontSize?: string;
  inlineTranslation: string;
  inlineTransliteration: string;
  inlineTranslationSize: number;
  inlineTransliterationSize: number;
}

// Add these interfaces for AyahView and VerseCard
export interface VerseCardProps {
  verse: AssembledVerse;
  surah: SurahMeta;
  showArabicText: boolean;
  verseTranslation: string | boolean;
  translationFontSize: string;
  transliterationFontSize?: string;
  showTransliteration?: boolean;
  isHighlighted: boolean;
  verseRef: (el: HTMLDivElement | null) => void;
  onNotesClick: () => void;
  onShareClick: () => void;
  onTafsirClick: () => void;
  onEmbedClick?: () => void;
  onRenderClick?: () => void;
  hoverTransliteration: string | boolean;
  inlineTransliteration: string;
  inlineTranslation?: string;
}

export interface AyahViewProps {
  surah: SurahMeta;
  verses: AssembledVerse[];
  showArabicText: boolean;
  verseTranslation: string | boolean;
  translationFontSize: string;
  transliterationFontSize: string;
  selectedAyahTransliterator: string;
  targetVerse: string | null;
  verseRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onNotesClick: (ayahId: number, verseText: string) => void;
  onShareClick: (ayahId: number, verseText: string, translation?: string) => void;
  onTafsirClick: (ayahId: number) => void;
  onEmbedClick?: (ayahId: number) => void;
  onRenderClick?: (ayahId: number) => void;
  hoverTransliteration: string | boolean;
  inlineTransliteration: string;
  inlineTranslation?: string;
}