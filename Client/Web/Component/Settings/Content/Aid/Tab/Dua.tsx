// Component/Settings/Content/Aid/Tab/Dua.tsx
import { Languages } from "lucide-react";
import { Switch } from "@Web/Component/UI/Switch";
import { Card } from "@Web/Component/UI/Card";
import { Slider } from "@Web/Component/UI/Slider";
import { useApp } from "@Web/Context/App";

export function DuaTab() {
  const {
    // Toggles
    showDuaTranslation,
    setShowDuaTranslation,
    showDuaTransliteration,
    setShowDuaTransliteration,
    showDuaInlineTranslation,
    setShowDuaInlineTranslation,
    showDuaInlineTransliteration,
    setShowDuaInlineTransliteration,
    showDuaHoverTranslation,
    setShowDuaHoverTranslation,
    showDuaHoverTransliteration,
    setShowDuaHoverTransliteration,
    // Font sizes
    duaArabicFontSize,
    setDuaArabicFontSize,
    duaTranslationFontSize,
    setDuaTranslationFontSize,
    duaTransliterationFontSize,
    setDuaTransliterationFontSize,
    duaInlineTranslationFontSize,
    setDuaInlineTranslationFontSize,
    duaInlineTransliterationFontSize,
    setDuaInlineTransliterationFontSize,
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
      {/* Header */}
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Dua Display</h3>
        </div>
      </div>

      {/* General Section */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">General</p>
        </div>
        {renderSlider(duaArabicFontSize, setDuaArabicFontSize, "Arabic Size")}
        <div className="cursor-pointer">
          <Card onClick={() => setShowDuaTranslation(!showDuaTranslation)} className="py-2.5 px-4 flex items-center justify-between transition-all group">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Translation</span>
            <Switch checked={showDuaTranslation} onCheckedChange={setShowDuaTranslation} size="md" />
          </Card>
        </div>
        {showDuaTranslation && renderSlider(duaTranslationFontSize, setDuaTranslationFontSize, "Translation Size")}
        <div className="cursor-pointer">
          <Card onClick={() => setShowDuaTransliteration(!showDuaTransliteration)} className="py-2.5 px-4 flex items-center justify-between transition-all group">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Transliteration</span>
            <Switch checked={showDuaTransliteration} onCheckedChange={setShowDuaTransliteration} size="md" />
          </Card>
        </div>
        {showDuaTransliteration && renderSlider(duaTransliterationFontSize, setDuaTransliterationFontSize, "Transliteration Size")}
      </div>

      {/* Inline Section */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Inline</p>
        </div>
        <div className="cursor-pointer">
          <Card onClick={() => setShowDuaInlineTranslation(!showDuaInlineTranslation)} className="py-2.5 px-4 flex items-center justify-between transition-all group">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Translation</span>
            <Switch checked={showDuaInlineTranslation} onCheckedChange={setShowDuaInlineTranslation} size="md" />
          </Card>
        </div>
        {showDuaInlineTranslation && renderSlider(duaInlineTranslationFontSize, setDuaInlineTranslationFontSize, "Translation Size")}
        <div className="cursor-pointer">
          <Card onClick={() => setShowDuaInlineTransliteration(!showDuaInlineTransliteration)} className="py-2.5 px-4 flex items-center justify-between transition-all group">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Transliteration</span>
            <Switch checked={showDuaInlineTransliteration} onCheckedChange={setShowDuaInlineTransliteration} size="md" />
          </Card>
        </div>
        {showDuaInlineTransliteration && renderSlider(duaInlineTransliterationFontSize, setDuaInlineTransliterationFontSize, "Transliteration Size")}
      </div>

      {/* Hover Section */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Hover</p>
        </div>
        <div className="cursor-pointer">
          <Card onClick={() => setShowDuaHoverTranslation(!showDuaHoverTranslation)} className="py-2.5 px-4 flex items-center justify-between transition-all group">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Translation</span>
            <Switch checked={showDuaHoverTranslation} onCheckedChange={setShowDuaHoverTranslation} size="md" />
          </Card>
        </div>
        <div className="cursor-pointer">
          <Card onClick={() => setShowDuaHoverTransliteration(!showDuaHoverTransliteration)} className="py-2.5 px-4 flex items-center justify-between transition-all group">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Transliteration</span>
            <Switch checked={showDuaHoverTransliteration} onCheckedChange={setShowDuaHoverTransliteration} size="md" />
          </Card>
        </div>
      </div>
    </div>
  );
}