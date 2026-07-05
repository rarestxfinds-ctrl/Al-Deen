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
  isVerseMarker: boolean;
  verseNumber?: number;
  transliteration?: string;
}

export interface BismillahWord {
  glyph: string;
  translation?: string;
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
  hideVerses?: boolean;
  hideVerseMarkers?: boolean;
  // Bismillah props (only for first page)
  bismillahWords?: BismillahWord[];
  bismillahFontFamily?: string;
  bismillahFontClass?: string;
  bismillahFontSize?: string;
  pageFontFamily?: string;        // per‑page font for current surah
  isIndoPakFont?: boolean;
  verseMarkerMap?: string[];
  isUthmaniV4Font?: boolean;
  justifyLines?: boolean;
}

export interface PageViewProps {
  surah: SurahMeta;
  assembledSurah: AssembledSurah;
  showArabicText: boolean;
  hoverTranslation: string | boolean;
  inlineTranslation: string;
  inlineTransliteration: string;
  fontClass: string;
  arabicFontSize: string;
  translationFontSize: string;
  transliterationFontSize?: string;
  verseRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  wordSpacing?: string;
  showTransliteration?: boolean;
  hideVerses?: boolean;
  hideVerseMarkers?: boolean;
}