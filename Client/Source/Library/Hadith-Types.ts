// Source/Library/Hadith-Types.ts

export interface Collection_Info {
  ID: string;
  Name: string;
  Category: string;
}

export interface Chapter {
  ID: number;
  Hadith_Count: number;
  Name: string;
}

export interface Narration {
  Chapter_ID: number;
  ID: number;
  In_Chapter_ID: number;
  Text: string;
}

export interface Translation {
  ID: number;
  Text: string;
  Edition: string;
}

export interface WBW_Translation {
  ID: number;
  Token_Index: number;
  Text: string;
  Edition: string;
}

export interface Transliteration {
  ID: number;
  Text: string;
  Edition: string;
}

export interface WBW_Transliteration {
  ID: number;
  Token_Index: number;
  Text: string;
  Edition: string;
}

export interface Edition {
  ID: string;
  Name: string;
  Language: string;
}

// --- Composite Response Models ---

export interface Chapter_Data {
  Chapter: Chapter;
  Narrations: Narration[];
}

export interface Translation_Data {
  Translations: Translation[];
  WBW_Translations?: WBW_Translation[];
}

export interface Transliteration_Data {
  Transliterations: Transliteration[];
  WBW_Transliterations?: WBW_Transliteration[];
}

export interface Hadith_Composite {
  Narration: Narration;
  Translation?: Translation[];
  WBW_Translation?: WBW_Translation[];
  Transliteration?: Transliteration[];
  WBW_Transliteration?: WBW_Transliteration[];
}