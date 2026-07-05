import { en, TranslationKeys } from "./Translation/en";
import { fr } from "./Translation/fr";
import { nl } from "./Translation/nl";

export const languages = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "nl", name: "Nederlands" },
];

export const translations: Record<string, TranslationKeys> = {
  en,
  fr,
  nl,
};

export type { TranslationKeys };

export const getTranslation = (lang: string): TranslationKeys => {
  return translations[lang] || translations.en;
};

// RTL languages
export const rtlLanguages: string[] = [];

export const isRtlLanguage = (lang: string): boolean => {
  return rtlLanguages.includes(lang);
};
