// Source/Library/Quran-Types.ts

export interface Surah_Metadata {
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
  Layout: Record<string, unknown> | null;
}

export interface Ayah {
  Surah: number;
  Ayah: number;
  Arabic: string;
  Presentation_Form_A_Ligature_Based?: string | null;
  Presentation_Form_A_Glyph_Based?: string | null;
}

export interface Kalimah {
  Surah: number;
  Ayah: number;
  Kalimah: number;
  Arabic: string;
  WBW_Translation?: string | null;
  WBW_Transliteration?: string | null;
  Presentation_Form_A_Ligature_Based?: string | null;
  Presentation_Form_A_Glyph_Based?: string | null;
}

export interface Translation {
  Surah: number;
  Ayah: number;
  Text: string;
  Edition: string;
}

export interface WBW_Translation {
  Surah: number;
  Ayah: number;
  Kalimah: number;
  Text: string;
  Edition: string;
}

export interface Transliteration {
  Surah: number;
  Ayah: number;
  Text: string;
  Edition: string;
}

export interface WBW_Transliteration {
  Surah: number;
  Ayah: number;
  Kalimah: number;
  Text: string;
  Edition: string;
}

export interface Footnote {
  Surah: number;
  Footnote: number;
  Text: string;
  Edition: string;
}

export interface Page {
  Page: number;
  Start_Surah: number;
  Start_Ayah: number;
  Start_Kalimah: number;
  End_Surah: number;
  End_Ayah: number;
  End_Kalimah: number;
}

export interface Edition {
  ID: string;
  Name: string;
  Language: string;
}

// --- Composite Response Models ---

export interface Surah {
  Surah: Surah_Metadata;
  Ayah: Ayah[];
  Kalimah: Kalimah[];
  Translation: Translation[];
  WBW_Translation: WBW_Translation[];
  Transliteration: Transliteration[];
  WBW_Transliteration: WBW_Transliteration[];
  Footnote: Footnote[];
}

export interface Page_Range {
  Surah: number;
  Start_Ayah: number;
  End_Ayah: number;
  Start_Kalimah: number;
  End_Kalimah: number;
}

export type Page_Range_Map = Record<number, Page_Range[]>;