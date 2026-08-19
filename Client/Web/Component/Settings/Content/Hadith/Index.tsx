import { ArabicSection } from "./Tab/Arabic";
import { TransliterationSection } from "./Tab/Transliteration";
import { TranslationSection } from "./Tab/Translation";
import { WBWSection } from "./Tab/WBW";
import type { HadithSubcategory } from "./Types";

interface HadithSectionProps {
  activeSubcategory: HadithSubcategory;
}

export function HadithSection({ activeSubcategory }: HadithSectionProps) {
  const renderActiveContent = () => {
    switch (activeSubcategory) {
      case "arabic":
        return <ArabicSection />;
      case "translation":
        return <TranslationSection />;
      case "transliteration":
        return <TransliterationSection />;
      case "wbw":
        return <WBWSection />;
      default:
        return null;
    }
  };

  return <div className="space-y-4">{renderActiveContent()}</div>;
}