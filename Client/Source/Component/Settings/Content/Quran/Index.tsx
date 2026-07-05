// Component/Settings/Content/Quran/index.tsx
import { Arabic } from "./Section/Arabic";
import { Translation } from "./Section/Translation";
import { Transliteration } from "./Section/Transliteration";
import { WBW } from "./Section/WBW";  // ← Import WBW, not PerWord
import { Audio } from "./Section/Audio";
import { Hifz } from "./Section/Hifz"
import { Surah_Info } from "./Section/Surah-Info";
import { Tafsir } from "./Section/Tafsir";
import { Layout } from "./Section/Layout";
import type { QuranSubcategory } from "./Types";

interface QuranSectionProps {
  activeSubcategory: QuranSubcategory;
}

export function QuranSection({ activeSubcategory }: QuranSectionProps) {
  switch (activeSubcategory) {
    case "arabic":
      return <Arabic />;
    case "translation":
      return <Translation />;
    case "transliteration":
      return <Transliteration />;
    case "per-word":
      return <WBW />;  // ← Use WBW component
    case "audio":
      return <Audio />;
      case "hifz":
      return <Hifz />;
    case "surah-info":
      return <Surah_Info />;
    case "tafsir":
      return <Tafsir />;
    case "layout":
      return <Layout />;
    default:
      return null;
  }
}