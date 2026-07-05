// Component/Settings/Content/Hadith.tsx
import { Languages } from "lucide-react";
import { Switch } from "@/Component/UI/Switch";
import { Card } from "@/Component/UI/Card";
import { Slider } from "@/Component/UI/Slider";
import { useApp } from "@/Context/App";

export function HadithSection() {
  const {
    // Hadith settings - General (toggles)
    showHadithTranslation,
    setShowHadithTranslation,
    showHadithTransliteration,
    setShowHadithTransliteration,
    
    // Hadith settings - Inline (toggles)
    showHadithInlineTranslation,
    setShowHadithInlineTranslation,
    showHadithInlineTransliteration,
    setShowHadithInlineTransliteration,
    
    // Hadith settings - Hover (toggles)
    showHadithHoverTranslation,
    setShowHadithHoverTranslation,
    showHadithHoverTransliteration,
    setShowHadithHoverTransliteration,
    
    // Font sizes
    hadithArabicFontSize,
    setHadithArabicFontSize,
    hadithTranslationFontSize,
    setHadithTranslationFontSize,
    hadithTransliterationFontSize,
    setHadithTransliterationFontSize,
    hadithInlineTranslationFontSize,
    setHadithInlineTranslationFontSize,
    hadithInlineTransliterationFontSize,
    setHadithInlineTransliterationFontSize,
  } = useApp();

  const renderSlider = (value: number, onChange: (size: number) => void, label: string) => {
    const safeValue = typeof value === 'number' && !isNaN(value) && value >= 1 && value <= 10 ? value : 5;
    return (
      <div className="cursor-pointer">
        <Card className="py-2.5 px-4 transition-all group">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black whitespace-nowrap">
              {label}: {safeValue}
            </span>
            <Slider
              value={[safeValue]}
              onValueChange={(val) => onChange(val[0])}
              min={1}
              max={10}
              step={1}
              className="flex-1"
            />
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Hadith Display</h3>
        </div>
      </div>

      {/* General Section */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">General</p>
        </div>

        {/* Arabic Font Size */}
        {renderSlider(hadithArabicFontSize, setHadithArabicFontSize, "Arabic Size")}

        {/* Translation Toggle + Font Size */}
        <div className="cursor-pointer">
          <Card 
            onClick={() => setShowHadithTranslation(!showHadithTranslation)}
            className="py-2.5 px-4 flex items-center justify-between transition-all group"
          >
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              Translation
            </span>
            <Switch
              checked={showHadithTranslation}
              onCheckedChange={setShowHadithTranslation}
              size="md"
            />
          </Card>
        </div>
        {showHadithTranslation && renderSlider(hadithTranslationFontSize, setHadithTranslationFontSize, "Translation Size")}

        {/* Transliteration Toggle + Font Size */}
        <div className="cursor-pointer">
          <Card 
            onClick={() => setShowHadithTransliteration(!showHadithTransliteration)}
            className="py-2.5 px-4 flex items-center justify-between transition-all group"
          >
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              Transliteration
            </span>
            <Switch
              checked={showHadithTransliteration}
              onCheckedChange={setShowHadithTransliteration}
              size="md"
            />
          </Card>
        </div>
        {showHadithTransliteration && renderSlider(hadithTransliterationFontSize, setHadithTransliterationFontSize, "Transliteration Size")}
      </div>

      {/* Inline Section */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Inline</p>
        </div>

        {/* Inline Translation Toggle + Font Size */}
        <div className="cursor-pointer">
          <Card 
            onClick={() => setShowHadithInlineTranslation(!showHadithInlineTranslation)}
            className="py-2.5 px-4 flex items-center justify-between transition-all group"
          >
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              Translation
            </span>
            <Switch
              checked={showHadithInlineTranslation}
              onCheckedChange={setShowHadithInlineTranslation}
              size="md"
            />
          </Card>
        </div>
        {showHadithInlineTranslation && renderSlider(hadithInlineTranslationFontSize, setHadithInlineTranslationFontSize, "Translation Size")}

        {/* Inline Transliteration Toggle + Font Size */}
        <div className="cursor-pointer">
          <Card 
            onClick={() => setShowHadithInlineTransliteration(!showHadithInlineTransliteration)}
            className="py-2.5 px-4 flex items-center justify-between transition-all group"
          >
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              Transliteration
            </span>
            <Switch
              checked={showHadithInlineTransliteration}
              onCheckedChange={setShowHadithInlineTransliteration}
              size="md"
            />
          </Card>
        </div>
        {showHadithInlineTransliteration && renderSlider(hadithInlineTransliterationFontSize, setHadithInlineTransliterationFontSize, "Transliteration Size")}
      </div>

      {/* Hover Section (no font sizes – tooltip uses default styles) */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Hover</p>
        </div>

        {/* Hover Translation Toggle */}
        <div className="cursor-pointer">
          <Card 
            onClick={() => setShowHadithHoverTranslation(!showHadithHoverTranslation)}
            className="py-2.5 px-4 flex items-center justify-between transition-all group"
          >
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              Translation
            </span>
            <Switch
              checked={showHadithHoverTranslation}
              onCheckedChange={setShowHadithHoverTranslation}
              size="md"
            />
          </Card>
        </div>

        {/* Hover Transliteration Toggle */}
        <div className="cursor-pointer">
          <Card 
            onClick={() => setShowHadithHoverTransliteration(!showHadithHoverTransliteration)}
            className="py-2.5 px-4 flex items-center justify-between transition-all group"
          >
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              Transliteration
            </span>
            <Switch
              checked={showHadithHoverTransliteration}
              onCheckedChange={setShowHadithHoverTransliteration}
              size="md"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}