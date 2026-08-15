import { useApp } from "@Web/Context/App";
import { getTranslation, isRtlLanguage, TranslationKeys } from "@/Internationalization";

export function useTranslation() {
  const { currentLanguage } = useApp();
  
  const t = getTranslation(currentLanguage);
  const isRtl = isRtlLanguage(currentLanguage);
  const dir = isRtl ? "rtl" : "ltr";
  
  return {
    t,
    isRtl,
    dir,
    currentLanguage,
  };
}

export type { TranslationKeys };
