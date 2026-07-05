import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from "react";

export type QuranFontFamily = "uthmani" | "uthmani_v1" | "uthmani_v2" | "uthmani_v4" | "indopak";
export type QuranLayout = "ayah" | "page";

// Transliterator types (includes "None" option) - for TRANSLITERATION only
export type TransliteratorType = "None" | "Standard" | "Academic" | "Phonetic" | "KingFahd";
interface HifzProgress {
  completedWords: Set<string>; // keys: `${surahId}:${ayah}:${wordIndex}`
  markWordCompleted: (surahId: number, ayah: number, wordIndex: number) => void;
  unmarkWordCompleted: (surahId: number, ayah: number, wordIndex: number) => void;
  isWordCompleted: (surahId: number, ayah: number, wordIndex: number) => boolean;
  isVerseCompleted: (surahId: number, ayah: number, totalWords: number) => boolean;
  resetWord: (surahId: number, ayah: number, wordIndex: number) => void;
  resetVerse: (surahId: number, ayah: number) => void;
  resetSurah: (surahId: number) => void;
  resetAll: () => void;
}
interface AppContextType {
  isSettingsSidebarOpen: boolean;
  setSettingsSidebarOpen: (open: boolean) => void;
  isSearchSidebarOpen: boolean;
  setSearchSidebarOpen: (open: boolean) => void;
  isQuranNavSidebarOpen: boolean;
  setQuranNavSidebarOpen: (open: boolean) => void;
  layout: QuranLayout;
  setLayout: (layout: QuranLayout) => void;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
  theme: "auto" | "light" | "dark";
  setTheme: (theme: "auto" | "light" | "dark") => void;
  quranFont: QuranFontFamily;
  setQuranFont: (font: QuranFontFamily) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  translationFontSize: number;
  setTranslationFontSize: (size: number) => void;

  readingIdleTimeout: number;
setReadingIdleTimeout: (timeout: number) => void;
readingSaveInterval: number;
setReadingSaveInterval: (interval: number) => void;
readingTrackingEnabled: boolean;
setReadingTrackingEnabled: (enabled: boolean) => void;
  
  // Prayer Times
  prayerCalculationMethod: number;
  setPrayerCalculationMethod: (method: number) => void;
  prayerSchool: number;
  setPrayerSchool: (school: number) => void;
  prayerLatitudeMethod: number;
  setPrayerLatitudeMethod: (method: number) => void;
  prayerTimeFormat: "12h" | "24h";
  setPrayerTimeFormat: (format: "12h" | "24h") => void;
  prayerAutoLocation: boolean;
  setPrayerAutoLocation: (enabled: boolean) => void;
  prayerSavedLocation: { city: string; country: string; lat: number; lng: number } | null;
  setPrayerSavedLocation: (location: { city: string; country: string; lat: number; lng: number } | null) => void;

  // Per-Word settings
  hoverTranslation: string;
  setHoverTranslation: (value: string) => void;
  hoverTranslationSize: number;
  setHoverTranslationSize: (size: number) => void;
  hoverTransliteration: TransliteratorType;
  setHoverTransliteration: (value: TransliteratorType) => void;
  hoverTransliterationSize: number;
  setHoverTransliterationSize: (size: number) => void;
  hoverRecitation: boolean;
  setHoverRecitation: (enabled: boolean) => void;
  inlineTranslation: string;
  setInlineTranslation: (value: string) => void;
  inlineTranslationSize: number;
  setInlineTranslationSize: (size: number) => void;
  inlineTransliteration: TransliteratorType;
  setInlineTransliteration: (value: TransliteratorType) => void;
  inlineTransliterationSize: number;
  setInlineTransliterationSize: (size: number) => void;
  
  // Verse-level settings
  verseTranslation: boolean;
  setVerseTranslation: (enabled: boolean) => void;
  autoScrollDuringPlayback: boolean;
  setAutoScrollDuringPlayback: (enabled: boolean) => void;
  selectedTranslations: string[];
  setSelectedTranslations: (translations: string[]) => void;
  showArabicText: boolean;
  setShowArabicText: (show: boolean) => void;
  selectedReciter: string;
  setSelectedReciter: (reciter: string) => void;
  selectedTranslator: string;
  setSelectedTranslator: (translator: string) => void;
  
  // Hadith settings - General (main display)
  showHadithTranslation: boolean;
  setShowHadithTranslation: (enabled: boolean) => void;
  showHadithTransliteration: boolean;
  setShowHadithTransliteration: (enabled: boolean) => void;
  
  // Hadith settings - Inline (separate from General)
  showHadithInlineTranslation: boolean;
  setShowHadithInlineTranslation: (enabled: boolean) => void;
  showHadithInlineTransliteration: boolean;
  setShowHadithInlineTransliteration: (enabled: boolean) => void;
  
  // Hadith settings - Hover
  showHadithHoverTranslation: boolean;
  setShowHadithHoverTranslation: (enabled: boolean) => void;
  showHadithHoverTransliteration: boolean;
  setShowHadithHoverTransliteration: (enabled: boolean) => void;
  
  // Hadith font sizes
  hadithArabicFontSize: number;
  setHadithArabicFontSize: (size: number) => void;
  hadithTranslationFontSize: number;
  setHadithTranslationFontSize: (size: number) => void;
  hadithTransliterationFontSize: number;
  setHadithTransliterationFontSize: (size: number) => void;
  hadithInlineTranslationFontSize: number;
  setHadithInlineTranslationFontSize: (size: number) => void;
  hadithInlineTransliterationFontSize: number;
  setHadithInlineTransliterationFontSize: (size: number) => void;
  
  // Dua settings - General
  showDuaTranslation: boolean;
  setShowDuaTranslation: (enabled: boolean) => void;
  showDuaTransliteration: boolean;
  setShowDuaTransliteration: (enabled: boolean) => void;
  
  // Dua settings - Inline
  showDuaInlineTranslation: boolean;
  setShowDuaInlineTranslation: (enabled: boolean) => void;
  showDuaInlineTransliteration: boolean;
  setShowDuaInlineTransliteration: (enabled: boolean) => void;
  
  // Dua settings - Hover
  showDuaHoverTranslation: boolean;
  setShowDuaHoverTranslation: (enabled: boolean) => void;
  showDuaHoverTransliteration: boolean;
  setShowDuaHoverTransliteration: (enabled: boolean) => void;
  
  // Dua font sizes
  duaArabicFontSize: number;
  setDuaArabicFontSize: (size: number) => void;
  duaTranslationFontSize: number;
  setDuaTranslationFontSize: (size: number) => void;
  duaTransliterationFontSize: number;
  setDuaTransliterationFontSize: (size: number) => void;
  duaInlineTranslationFontSize: number;
  setDuaInlineTranslationFontSize: (size: number) => void;
  duaInlineTransliterationFontSize: number;
  setDuaInlineTransliterationFontSize: (size: number) => void;
  
  // Transliteration settings (Verse/Ayah level)
  transliterationSize: number;
  setTransliterationSize: (size: number) => void;
  selectedAyahTransliterator: TransliteratorType;
  setSelectedAyahTransliterator: (transliterator: TransliteratorType) => void;

    // Surah Info settings
  surahInfoProvider: string;
  setSurahInfoProvider: (provider: string) => void;
  surahInfoTextSize: number;
  setSurahInfoTextSize: (size: number) => void;

  // Tafsir settings
tafsirProvider: string;
setTafsirProvider: (provider: string) => void;
tafsirTextSize: number;
setTafsirTextSize: (size: number) => void;

hideVerses: boolean;
setHideVerses: (value: boolean) => void;
hideVerseMarkers: boolean;
setHideVerseMarkers: (value: boolean) => void;
recordAudioEnabled: boolean;
setRecordAudioEnabled: (value: boolean) => void;
  hifz: HifzProgress;

  // Accessibility
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  underlineLinks: boolean;
  setUnderlineLinks: (v: boolean) => void;
  screenReaderHints: boolean;
  setScreenReaderHints: (v: boolean) => void;
  uiTextScale: number; // 0.85 - 1.5
  setUiTextScale: (v: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "app-settings";

interface PersistedSettings {
  currentLanguage: string;
  theme: "auto" | "light" | "dark";
  layout: QuranLayout;
  quranFont: QuranFontFamily;
  fontSize: number;
  translationFontSize: number;
  // Prayer Times
  prayerCalculationMethod: number;
  prayerSchool: number;
  prayerLatitudeMethod: number;
  prayerTimeFormat: "12h" | "24h";
  prayerAutoLocation: boolean;
  prayerSavedLocationCity: string;
  prayerSavedLocationCountry: string;
  prayerSavedLocationLat: number;
  prayerSavedLocationLng: number;
  // Per-Word settings
  hoverTranslation: string;
  hoverTranslationSize: number;
  hoverTransliteration: TransliteratorType;
  hoverTransliterationSize: number;
  hoverRecitation: boolean;
  inlineTranslation: string;
  inlineTranslationSize: number;
  inlineTransliteration: TransliteratorType;
  inlineTransliterationSize: number;
  // Verse-level settings
  verseTranslation: boolean;
  autoScrollDuringPlayback: boolean;
  showArabicText: boolean;
  selectedReciter: string;
  selectedTranslator: string;
  // Hadith settings
  showHadithTranslation: boolean;
  showHadithTransliteration: boolean;
  showHadithInlineTranslation: boolean;
  showHadithInlineTransliteration: boolean;
  showHadithHoverTranslation: boolean;
  showHadithHoverTransliteration: boolean;
  hadithArabicFontSize: number;
  hadithTranslationFontSize: number;
  hadithTransliterationFontSize: number;
  hadithInlineTranslationFontSize: number;
  hadithInlineTransliterationFontSize: number;
  // Dua settings
  showDuaTranslation: boolean;
  showDuaTransliteration: boolean;
  showDuaInlineTranslation: boolean;
  showDuaInlineTransliteration: boolean;
  showDuaHoverTranslation: boolean;
  showDuaHoverTransliteration: boolean;
  duaArabicFontSize: number;
  duaTranslationFontSize: number;
  duaTransliterationFontSize: number;
  duaInlineTranslationFontSize: number;
  duaInlineTransliterationFontSize: number;
  // Transliteration settings (Verse/Ayah level)
  transliterationSize: number;
  selectedAyahTransliterator: TransliteratorType;

  hideVerses: boolean;
hideVerseMarkers: boolean;
recordAudioEnabled: boolean;

  // Tafsir settings
tafsirProvider: string;
tafsirTextSize: number;

  // Surah Info
  surahInfoProvider: string;
  surahInfoTextSize: number;

  readingIdleTimeout: number;
readingSaveInterval: number;
readingTrackingEnabled: boolean;

  // Accessibility
  highContrast: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
  screenReaderHints: boolean;
  uiTextScale: number;
}

const DEFAULTS: PersistedSettings = {
  currentLanguage: "en",
  theme: "auto",
  layout: "ayah",
  quranFont: "uthmani",
  fontSize: 5,
  translationFontSize: 3,
  // Prayer Times defaults
  prayerCalculationMethod: 2,
  prayerSchool: 0,
  prayerLatitudeMethod: 3,
  prayerTimeFormat: "12h",
  prayerAutoLocation: true,
  prayerSavedLocationCity: "",
  prayerSavedLocationCountry: "",
  prayerSavedLocationLat: 0,
  prayerSavedLocationLng: 0,
  // Per-Word defaults
  hoverTranslation: "Direct",
  hoverTranslationSize: 3,
  hoverTransliteration: "None",
  hoverTransliterationSize: 3,
  hoverRecitation: true,
  inlineTranslation: "None",
  inlineTranslationSize: 3,
  inlineTransliteration: "None",
  inlineTransliterationSize: 3,
  // Verse-level defaults
  verseTranslation: true,
  autoScrollDuringPlayback: true,
  showArabicText: true,
  selectedReciter: "Mishary_Rashid_Alafasy",
  selectedTranslator: "Direct",
  // Hadith defaults
  showHadithTranslation: true,
  showHadithTransliteration: false,
  showHadithInlineTranslation: false,
  showHadithInlineTransliteration: false,
  showHadithHoverTranslation: true,
  showHadithHoverTransliteration: true,
  hadithArabicFontSize: 7,
  hadithTranslationFontSize: 7,
  hadithTransliterationFontSize: 7,
  hadithInlineTranslationFontSize: 2,
  hadithInlineTransliterationFontSize: 2,

  // Dua defaults
  showDuaTranslation: true,
  showDuaTransliteration: false,
  showDuaInlineTranslation: true,
  showDuaInlineTransliteration: false,
  showDuaHoverTranslation: false,
  showDuaHoverTransliteration: false,
  duaArabicFontSize: 5,
  duaTranslationFontSize: 3,
  duaTransliterationFontSize: 3,
  duaInlineTranslationFontSize: 2,
  duaInlineTransliterationFontSize: 2,
  // Transliteration defaults
  transliterationSize: 3,
  selectedAyahTransliterator: "None",
  // Surah Info
  surahInfoProvider: "Ibn-Ashur",
  surahInfoTextSize: 3, // Normal

  tafsirProvider: "Ibn-Kathir",
tafsirTextSize: 3, // Normal

hideVerses: false,
hideVerseMarkers: false,
recordAudioEnabled: false,

readingIdleTimeout: 60, // 60 seconds
readingSaveInterval: 10, // Save every 10 seconds
readingTrackingEnabled: true,

  // Accessibility defaults
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
  screenReaderHints: false,
  uiTextScale: 1,
};

function loadSettings(): PersistedSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULTS;
}

function saveSettings(s: PersistedSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadSettings(), []);

  const [isSettingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
  const [isSearchSidebarOpen, setSearchSidebarOpen] = useState(false);
  const [isQuranNavSidebarOpen, setQuranNavSidebarOpen] = useState(false);

  const [layout, setLayout] = useState<QuranLayout>(initial.layout);
  const [currentLanguage, setCurrentLanguage] = useState(initial.currentLanguage);
  const [theme, setTheme] = useState<"auto" | "light" | "dark">(initial.theme);
  const [quranFont, setQuranFont] = useState<QuranFontFamily>(initial.quranFont);
  const [fontSize, setFontSize] = useState(initial.fontSize);
  const [translationFontSize, setTranslationFontSize] = useState(initial.translationFontSize);
  
  // Prayer Times settings
  const [prayerCalculationMethod, setPrayerCalculationMethod] = useState(initial.prayerCalculationMethod);
  const [prayerSchool, setPrayerSchool] = useState(initial.prayerSchool);
  const [prayerLatitudeMethod, setPrayerLatitudeMethod] = useState(initial.prayerLatitudeMethod);
  const [prayerTimeFormat, setPrayerTimeFormat] = useState<"12h" | "24h">(initial.prayerTimeFormat);
  const [prayerAutoLocation, setPrayerAutoLocation] = useState(initial.prayerAutoLocation);
  const [prayerSavedLocation, setPrayerSavedLocationState] = useState<{ city: string; country: string; lat: number; lng: number } | null>(
    initial.prayerSavedLocationCity ? {
      city: initial.prayerSavedLocationCity,
      country: initial.prayerSavedLocationCountry,
      lat: initial.prayerSavedLocationLat,
      lng: initial.prayerSavedLocationLng,
    } : null
  );

  const setPrayerSavedLocation = useCallback((location: { city: string; country: string; lat: number; lng: number } | null) => {
    setPrayerSavedLocationState(location);
  }, []);
  
  // Per-Word settings
  const [hoverTranslation, setHoverTranslation] = useState<string>(initial.hoverTranslation);
  const [hoverTranslationSize, setHoverTranslationSize] = useState(initial.hoverTranslationSize);
  const [hoverTransliteration, setHoverTransliteration] = useState<TransliteratorType>(initial.hoverTransliteration);
  const [hoverTransliterationSize, setHoverTransliterationSize] = useState(initial.hoverTransliterationSize);
  const [hoverRecitation, setHoverRecitation] = useState(initial.hoverRecitation);
  const [inlineTranslation, setInlineTranslation] = useState<string>(initial.inlineTranslation);
  const [inlineTranslationSize, setInlineTranslationSize] = useState(initial.inlineTranslationSize);
  const [inlineTransliteration, setInlineTransliteration] = useState<TransliteratorType>(initial.inlineTransliteration);
  const [inlineTransliterationSize, setInlineTransliterationSize] = useState(initial.inlineTransliterationSize);
  
  // Verse-level settings
  const [verseTranslation, setVerseTranslation] = useState(initial.verseTranslation);
  const [autoScrollDuringPlayback, setAutoScrollDuringPlayback] = useState(initial.autoScrollDuringPlayback);
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>(["translation"]);
  const [showArabicText, setShowArabicText] = useState(initial.showArabicText);
  const [selectedReciter, setSelectedReciter] = useState(initial.selectedReciter);
  const [selectedTranslator, setSelectedTranslator] = useState(initial.selectedTranslator);
  
  // Hadith settings
  const [showHadithTranslation, setShowHadithTranslation] = useState(initial.showHadithTranslation);
  const [showHadithTransliteration, setShowHadithTransliteration] = useState(initial.showHadithTransliteration);
  const [showHadithInlineTranslation, setShowHadithInlineTranslation] = useState(initial.showHadithInlineTranslation);
  const [showHadithInlineTransliteration, setShowHadithInlineTransliteration] = useState(initial.showHadithInlineTransliteration);
  const [showHadithHoverTranslation, setShowHadithHoverTranslation] = useState(initial.showHadithHoverTranslation);
  const [showHadithHoverTransliteration, setShowHadithHoverTransliteration] = useState(initial.showHadithHoverTransliteration);
  const [hadithArabicFontSize, setHadithArabicFontSize] = useState(initial.hadithArabicFontSize);
  const [hadithTranslationFontSize, setHadithTranslationFontSize] = useState(initial.hadithTranslationFontSize);
  const [hadithTransliterationFontSize, setHadithTransliterationFontSize] = useState(initial.hadithTransliterationFontSize);
  const [hadithInlineTranslationFontSize, setHadithInlineTranslationFontSize] = useState(initial.hadithInlineTranslationFontSize);
  const [hadithInlineTransliterationFontSize, setHadithInlineTransliterationFontSize] = useState(initial.hadithInlineTransliterationFontSize);

  // Dua settings
  const [showDuaTranslation, setShowDuaTranslation] = useState(initial.showDuaTranslation);
  const [showDuaTransliteration, setShowDuaTransliteration] = useState(initial.showDuaTransliteration);
  const [showDuaInlineTranslation, setShowDuaInlineTranslation] = useState(initial.showDuaInlineTranslation);
  const [showDuaInlineTransliteration, setShowDuaInlineTransliteration] = useState(initial.showDuaInlineTransliteration);
  const [showDuaHoverTranslation, setShowDuaHoverTranslation] = useState(initial.showDuaHoverTranslation);
  const [showDuaHoverTransliteration, setShowDuaHoverTransliteration] = useState(initial.showDuaHoverTransliteration);
  const [duaArabicFontSize, setDuaArabicFontSize] = useState(initial.duaArabicFontSize);
  const [duaTranslationFontSize, setDuaTranslationFontSize] = useState(initial.duaTranslationFontSize);
  const [duaTransliterationFontSize, setDuaTransliterationFontSize] = useState(initial.duaTransliterationFontSize);
  const [duaInlineTranslationFontSize, setDuaInlineTranslationFontSize] = useState(initial.duaInlineTranslationFontSize);
  const [duaInlineTransliterationFontSize, setDuaInlineTransliterationFontSize] = useState(initial.duaInlineTransliterationFontSize);

  // Transliteration settings
  const [transliterationSize, setTransliterationSize] = useState(initial.transliterationSize);
  const [selectedAyahTransliterator, setSelectedAyahTransliterator] = useState<TransliteratorType>(initial.selectedAyahTransliterator);

  // SurahInfo
  const [surahInfoProvider, setSurahInfoProvider] = useState(initial.surahInfoProvider);
  const [surahInfoTextSize, setSurahInfoTextSize] = useState(initial.surahInfoTextSize);

  // Tafsir settings
const [tafsirProvider, setTafsirProvider] = useState(initial.tafsirProvider);
const [tafsirTextSize, setTafsirTextSize] = useState(initial.tafsirTextSize);

const [readingIdleTimeout, setReadingIdleTimeout] = useState(initial.readingIdleTimeout);
const [readingSaveInterval, setReadingSaveInterval] = useState(initial.readingSaveInterval);
const [readingTrackingEnabled, setReadingTrackingEnabled] = useState(initial.readingTrackingEnabled);

const [hideVerses, setHideVerses] = useState(initial.hideVerses);
const [hideVerseMarkers, setHideVerseMarkers] = useState(initial.hideVerseMarkers);
const [recordAudioEnabled, setRecordAudioEnabled] = useState(initial.recordAudioEnabled);

// ---------- Accessibility ----------
const [highContrast, setHighContrast] = useState(initial.highContrast);
const [reduceMotion, setReduceMotion] = useState(initial.reduceMotion);
const [underlineLinks, setUnderlineLinks] = useState(initial.underlineLinks);
const [screenReaderHints, setScreenReaderHints] = useState(initial.screenReaderHints);
const [uiTextScale, setUiTextScale] = useState<number>(initial.uiTextScale);

// Apply accessibility classes + text scale to <html>
useEffect(() => {
  const root = document.documentElement;
  root.classList.toggle("high-contrast", highContrast);
  root.classList.toggle("reduce-motion", reduceMotion);
  root.classList.toggle("underline-links", underlineLinks);
  root.classList.toggle("sr-hints", screenReaderHints);
  root.style.setProperty("--ui-text-scale", String(uiTextScale));
}, [highContrast, reduceMotion, underlineLinks, screenReaderHints, uiTextScale]);
  // ---------- Hifz (Memorization) Progress State ----------
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('hifz_progress');
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        setCompletedWords(new Set(arr));
      } catch (e) {
        console.error('Failed to parse hifz_progress', e);
      }
    }
  }, []);

  // Save to localStorage whenever completedWords changes
  useEffect(() => {
    const arr = Array.from(completedWords);
    localStorage.setItem('hifz_progress', JSON.stringify(arr));
  }, [completedWords]);

  // Word-level operations
  const markWordCompleted = useCallback((surahId: number, ayah: number, wordIndex: number) => {
    const key = `${surahId}:${ayah}:${wordIndex}`;
    setCompletedWords(prev => new Set(prev).add(key));
  }, []);

  const unmarkWordCompleted = useCallback((surahId: number, ayah: number, wordIndex: number) => {
    const key = `${surahId}:${ayah}:${wordIndex}`;
    setCompletedWords(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isWordCompleted = useCallback((surahId: number, ayah: number, wordIndex: number) => {
    const key = `${surahId}:${ayah}:${wordIndex}`;
    return completedWords.has(key);
  }, [completedWords]);

  const isVerseCompleted = useCallback((surahId: number, ayah: number, totalWords: number) => {
    // totalWords includes the verse marker; ignore the last word (verse marker)
    for (let i = 0; i < totalWords - 1; i++) {
      if (!isWordCompleted(surahId, ayah, i)) return false;
    }
    return true;
  }, [isWordCompleted]);

  const resetWord = useCallback((surahId: number, ayah: number, wordIndex: number) => {
    const key = `${surahId}:${ayah}:${wordIndex}`;
    setCompletedWords(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const resetVerse = useCallback((surahId: number, ayah: number) => {
    setCompletedWords(prev => {
      const next = new Set(prev);
      const prefix = `${surahId}:${ayah}:`;
      for (const key of next) {
        if (key.startsWith(prefix)) next.delete(key);
      }
      return next;
    });
  }, []);

  const resetSurah = useCallback((surahId: number) => {
    setCompletedWords(prev => {
      const next = new Set(prev);
      const prefix = `${surahId}:`;
      for (const key of next) {
        if (key.startsWith(prefix)) next.delete(key);
      }
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setCompletedWords(new Set());
  }, []);

  const hifz: HifzProgress = {
    completedWords,
    markWordCompleted,
    unmarkWordCompleted,
    isWordCompleted,
    isVerseCompleted,
    resetWord,
    resetVerse,
    resetSurah,
    resetAll,
  };
  useEffect(() => {
    saveSettings({
      currentLanguage, theme, layout, quranFont, fontSize, translationFontSize,
      prayerCalculationMethod, prayerSchool, prayerLatitudeMethod, prayerTimeFormat,
      prayerAutoLocation,
      prayerSavedLocationCity: prayerSavedLocation?.city || "",
      prayerSavedLocationCountry: prayerSavedLocation?.country || "",
      prayerSavedLocationLat: prayerSavedLocation?.lat || 0,
      prayerSavedLocationLng: prayerSavedLocation?.lng || 0,
      hoverTranslation, hoverTranslationSize,
      hoverTransliteration, hoverTransliterationSize,
      hoverRecitation,
      inlineTranslation, inlineTranslationSize,
      inlineTransliteration, inlineTransliterationSize,
      verseTranslation, autoScrollDuringPlayback, showArabicText,
      selectedReciter, selectedTranslator,
      showHadithTranslation, showHadithTransliteration,
      showHadithInlineTranslation, showHadithInlineTransliteration,
      showHadithHoverTranslation, showHadithHoverTransliteration,
      hadithArabicFontSize, hadithTranslationFontSize, hadithTransliterationFontSize,
      hadithInlineTranslationFontSize, hadithInlineTransliterationFontSize,
      showDuaTranslation, showDuaTransliteration,
      showDuaInlineTranslation, showDuaInlineTransliteration,
      showDuaHoverTranslation, showDuaHoverTransliteration,
      duaArabicFontSize, duaTranslationFontSize, duaTransliterationFontSize,
      duaInlineTranslationFontSize, duaInlineTransliterationFontSize,
      transliterationSize, selectedAyahTransliterator,
      surahInfoProvider,
      surahInfoTextSize,
      tafsirProvider,
tafsirTextSize,
    readingIdleTimeout,
    readingSaveInterval,
    readingTrackingEnabled,
    hideVerses,
hideVerseMarkers,
recordAudioEnabled,
highContrast, reduceMotion, underlineLinks, screenReaderHints, uiTextScale,
    });
  }, [
    currentLanguage, theme, layout, quranFont, fontSize, translationFontSize,
    prayerCalculationMethod, prayerSchool, prayerLatitudeMethod, prayerTimeFormat,
    prayerAutoLocation, prayerSavedLocation,
    hoverTranslation, hoverTranslationSize,
    hoverTransliteration, hoverTransliterationSize,
    hoverRecitation,
    inlineTranslation, inlineTranslationSize,
    inlineTransliteration, inlineTransliterationSize,
    verseTranslation, autoScrollDuringPlayback, showArabicText,
    selectedReciter, selectedTranslator,
    showHadithTranslation, showHadithTransliteration,
    showHadithInlineTranslation, showHadithInlineTransliteration,
    showHadithHoverTranslation, showHadithHoverTransliteration,
    hadithArabicFontSize, hadithTranslationFontSize, hadithTransliterationFontSize,
    hadithInlineTranslationFontSize, hadithInlineTransliterationFontSize,
    showDuaTranslation, showDuaTransliteration,
    showDuaInlineTranslation, showDuaInlineTransliteration,
    showDuaHoverTranslation, showDuaHoverTransliteration,
    duaArabicFontSize, duaTranslationFontSize, duaTransliterationFontSize,
    duaInlineTranslationFontSize, duaInlineTransliterationFontSize,
    transliterationSize, selectedAyahTransliterator,
    surahInfoProvider, surahInfoTextSize,
    tafsirProvider, tafsirTextSize,
  readingIdleTimeout,
  readingSaveInterval,
  readingTrackingEnabled,
  hideVerses, hideVerseMarkers, recordAudioEnabled,
  highContrast, reduceMotion, underlineLinks, screenReaderHints, uiTextScale,
  ]);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      root.classList.remove("light", "dark");
      root.classList.add(theme === "auto" ? (mq.matches ? "dark" : "light") : theme);
    };
    applyTheme();
    if (theme === "auto") {
      mq.addEventListener("change", applyTheme);
      return () => mq.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  const value = useMemo<AppContextType>(() => ({
    isSettingsSidebarOpen, setSettingsSidebarOpen,
    isSearchSidebarOpen, setSearchSidebarOpen,
    isQuranNavSidebarOpen, setQuranNavSidebarOpen,
    layout, setLayout,
    currentLanguage, setCurrentLanguage,
    theme, setTheme,
    quranFont, setQuranFont,
    fontSize, setFontSize,
    translationFontSize, setTranslationFontSize,
    prayerCalculationMethod, setPrayerCalculationMethod,
    prayerSchool, setPrayerSchool,
    prayerLatitudeMethod, setPrayerLatitudeMethod,
    prayerTimeFormat, setPrayerTimeFormat,
    prayerAutoLocation, setPrayerAutoLocation,
    prayerSavedLocation, setPrayerSavedLocation,
    hoverTranslation, setHoverTranslation,
    hoverTranslationSize, setHoverTranslationSize,
    hoverTransliteration, setHoverTransliteration,
    hoverTransliterationSize, setHoverTransliterationSize,
    hoverRecitation, setHoverRecitation,
    inlineTranslation, setInlineTranslation,
    inlineTranslationSize, setInlineTranslationSize,
    inlineTransliteration, setInlineTransliteration,
    inlineTransliterationSize, setInlineTransliterationSize,
    verseTranslation, setVerseTranslation,
    autoScrollDuringPlayback, setAutoScrollDuringPlayback,
    selectedTranslations, setSelectedTranslations,
    showArabicText, setShowArabicText,
    selectedReciter, setSelectedReciter,
    selectedTranslator, setSelectedTranslator,
    showHadithTranslation, setShowHadithTranslation,
    showHadithTransliteration, setShowHadithTransliteration,
    showHadithInlineTranslation, setShowHadithInlineTranslation,
    showHadithInlineTransliteration, setShowHadithInlineTransliteration,
    showHadithHoverTranslation, setShowHadithHoverTranslation,
    showHadithHoverTransliteration, setShowHadithHoverTransliteration,
    hadithArabicFontSize, setHadithArabicFontSize,
    hadithTranslationFontSize, setHadithTranslationFontSize,
    hadithTransliterationFontSize, setHadithTransliterationFontSize,
    hadithInlineTranslationFontSize, setHadithInlineTranslationFontSize,
    hadithInlineTransliterationFontSize, setHadithInlineTransliterationFontSize,
    showDuaTranslation, setShowDuaTranslation,
    showDuaTransliteration, setShowDuaTransliteration,
    showDuaInlineTranslation, setShowDuaInlineTranslation,
    showDuaInlineTransliteration, setShowDuaInlineTransliteration,
    showDuaHoverTranslation, setShowDuaHoverTranslation,
    showDuaHoverTransliteration, setShowDuaHoverTransliteration,
    duaArabicFontSize, setDuaArabicFontSize,
    duaTranslationFontSize, setDuaTranslationFontSize,
    duaTransliterationFontSize, setDuaTransliterationFontSize,
    duaInlineTranslationFontSize, setDuaInlineTranslationFontSize,
    duaInlineTransliterationFontSize, setDuaInlineTransliterationFontSize,
    transliterationSize, setTransliterationSize,
    selectedAyahTransliterator, setSelectedAyahTransliterator,
      surahInfoProvider,
  setSurahInfoProvider,
  surahInfoTextSize,
  setSurahInfoTextSize,
  tafsirProvider, setTafsirProvider,
tafsirTextSize, setTafsirTextSize,
  readingIdleTimeout,
  setReadingIdleTimeout,
  readingSaveInterval,
  setReadingSaveInterval,
  readingTrackingEnabled,
  setReadingTrackingEnabled,
  hideVerses, setHideVerses,
hideVerseMarkers, setHideVerseMarkers,
recordAudioEnabled, setRecordAudioEnabled,
    hifz,
    // Accessibility
    highContrast, setHighContrast,
    reduceMotion, setReduceMotion,
    underlineLinks, setUnderlineLinks,
    screenReaderHints, setScreenReaderHints,
    uiTextScale, setUiTextScale,
  }), [
    isSettingsSidebarOpen, isSearchSidebarOpen, isQuranNavSidebarOpen,
    layout, currentLanguage, theme,
    quranFont, fontSize, translationFontSize,
    prayerCalculationMethod, prayerSchool, prayerLatitudeMethod, prayerTimeFormat,
    prayerAutoLocation, setPrayerAutoLocation,
    prayerSavedLocation, setPrayerSavedLocation,
    hoverTranslation, hoverTranslationSize,
    hoverTransliteration, hoverTransliterationSize,
    hoverRecitation,
    inlineTranslation, inlineTranslationSize,
    inlineTransliteration, inlineTransliterationSize,
    verseTranslation, autoScrollDuringPlayback, selectedTranslations, showArabicText,
    selectedReciter, selectedTranslator,
    showHadithTranslation, showHadithTransliteration,
    showHadithInlineTranslation, showHadithInlineTransliteration,
    showHadithHoverTranslation, showHadithHoverTransliteration,
    hadithArabicFontSize, hadithTranslationFontSize, hadithTransliterationFontSize,
    hadithInlineTranslationFontSize, hadithInlineTransliterationFontSize,
    showDuaTranslation, showDuaTransliteration,
    showDuaInlineTranslation, showDuaInlineTransliteration,
    showDuaHoverTranslation, showDuaHoverTransliteration,
    duaArabicFontSize, duaTranslationFontSize, duaTransliterationFontSize,
    duaInlineTranslationFontSize, duaInlineTransliterationFontSize,
    transliterationSize, selectedAyahTransliterator,
      surahInfoProvider,
  setSurahInfoProvider,
  surahInfoTextSize,
  setSurahInfoTextSize,
  tafsirProvider, setTafsirProvider,
tafsirTextSize, setTafsirTextSize,
  readingIdleTimeout,
  setReadingIdleTimeout,
  readingSaveInterval,
  setReadingSaveInterval,
  readingTrackingEnabled,
  setReadingTrackingEnabled,
  hideVerses, hideVerseMarkers, recordAudioEnabled,
    hifz,
    highContrast, reduceMotion, underlineLinks, screenReaderHints, uiTextScale,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useApp must be used within an AppProvider");
  return context;
}