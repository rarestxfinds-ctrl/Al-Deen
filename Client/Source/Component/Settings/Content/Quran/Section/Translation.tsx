// Component/Settings/Content/Quran/Section/Translation.tsx
import { useState } from "react";
import { Check, Search } from "lucide-react";
import { Card } from "@/Component/UI/Card";
import { Button } from "@/Component/UI/Button";
import { Slider } from "@/Component/UI/Slider";
import { Input } from "@/Component/UI/Input";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { MobileNavigator } from "../Utility";
import { TRANSLATORS } from "../Constant";
import { useApp } from "@/Context/App";
import { cn } from "@/Library/utils";

export function Translation() {
  const isMobile = useIsMobile();
  const [showTranslatorList, setShowTranslatorList] = useState(false);
  const [search, setSearch] = useState("");
  
  const {
    selectedTranslator,
    setSelectedTranslator,
    translationFontSize,
    setTranslationFontSize,
  } = useApp();

  // Filter translators based on search
  const filteredTranslators = TRANSLATORS.filter(translator =>
    translator.label.toLowerCase().includes(search.toLowerCase())
  );

  // Mobile: use full-screen navigator
  if (isMobile && showTranslatorList) {
    return (
      <MobileNavigator
        isOpen={showTranslatorList}
        onClose={() => setShowTranslatorList(false)}
        title="Select Translator"
        options={TRANSLATORS}
        selectedId={selectedTranslator}
        onSelect={setSelectedTranslator}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Font Size Slider */}
      <div className="cursor-pointer">
        <Card className="py-2.5 px-4 transition-all group">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black whitespace-nowrap">
              Font Size: {translationFontSize}
            </span>
            <Slider
              value={[translationFontSize]}
              onValueChange={(value) => setTranslationFontSize(value[0])}
              min={1}
              max={10}
              step={1}
              className="flex-1"
            />
          </div>
        </Card>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search translators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-muted/30 border-2 border-black dark:border-white rounded-[40px] focus:border-primary transition-colors"
        />
      </div>

      {/* Translator List (no Container wrappers, using Button with active flag) */}
      <div className="space-y-2">
        {filteredTranslators.map((translator) => {
          const isSelected = selectedTranslator === translator.id;
          return (
            <Button
              key={translator.id}
              onClick={() => setSelectedTranslator(translator.id)}
              fullWidth
              active={isSelected}
              className="justify-between"
            >
              <span className="text-sm font-medium">{translator.label}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </Button>
          );
        })}
        {filteredTranslators.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No translators found
          </div>
        )}
      </div>
    </div>
  );
}