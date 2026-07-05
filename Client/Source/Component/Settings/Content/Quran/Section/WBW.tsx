// Component/Settings/Content/Quran/Section/WBW.tsx
import { Languages, ChevronDown, Check } from "lucide-react";
import { Switch } from "@/Component/UI/Switch";
import { Card } from "@/Component/UI/Card";
import { Button } from "@/Component/UI/Button";
import { Slider } from "@/Component/UI/Slider";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/Component/UI/Dropdown-Menu";
import { MobileNavigator } from "../Utility";
import { TRANSLATORS, TRANSLITERATORS } from "../Constant";
import { useApp } from "@/Context/App";

export function WBW() {
  const isMobile = useIsMobile();
  
  const {
    // Hover settings
    hoverTranslation,
    setHoverTranslation,
    hoverTransliteration,
    setHoverTransliteration,
    
    // Inline settings
    inlineTranslation,
    setInlineTranslation,
    inlineTranslationSize,
    setInlineTranslationSize,
    inlineTransliteration,
    setInlineTransliteration,
    inlineTransliterationSize,
    setInlineTransliterationSize,
  } = useApp();

  const [showHoverTranslationList, setShowHoverTranslationList] = useState(false);
  const [showHoverTransliterationList, setShowHoverTransliterationList] = useState(false);
  const [showInlineTranslationList, setShowInlineTranslationList] = useState(false);
  const [showInlineTransliterationList, setShowInlineTransliterationList] = useState(false);

  const currentHoverTranslationLabel = useMemo(() =>
    TRANSLATORS.find(t => t.id === hoverTranslation)?.label || "None",
    [hoverTranslation]
  );

  const currentInlineTranslationLabel = useMemo(() =>
    TRANSLATORS.find(t => t.id === inlineTranslation)?.label || "None",
    [inlineTranslation]
  );

  const currentHoverTransliterationLabel = useMemo(() =>
    TRANSLITERATORS.find(t => t.id === hoverTransliteration)?.label || "None",
    [hoverTransliteration]
  );

  const currentInlineTransliterationLabel = useMemo(() =>
    TRANSLITERATORS.find(t => t.id === inlineTransliteration)?.label || "None",
    [inlineTransliteration]
  );

  // Shared render functions (unchanged)
  const renderDropdown = (
    items: { id: string; label: string }[],
    currentValue: string,
    currentLabel: string,
    onChange: (value: string) => void,
    label: string
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="w-full flex items-center justify-between px-4 py-2 h-auto group"
          fullWidth
        >
          <span className="text-sm font-medium [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              {currentLabel}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{item.label}</span>
            {currentValue === item.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderMobileButton = (
    onClick: () => void,
    currentLabel: string,
    label: string
  ) => (
    <Button
      onClick={onClick}
      variant="secondary"
      className="w-full flex items-center justify-between px-4 py-2 h-auto group"
      fullWidth
    >
      <span className="text-sm font-medium [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
          {currentLabel}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
      </div>
    </Button>
  );

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

  // Mobile full-screen navigators (unchanged)
  if (isMobile && showHoverTranslationList) {
    return (
      <MobileNavigator
        isOpen={showHoverTranslationList}
        onClose={() => setShowHoverTranslationList(false)}
        title="Select Hover Translation"
        options={TRANSLATORS}
        selectedId={hoverTranslation}
        onSelect={(id) => setHoverTranslation(id)}
      />
    );
  }

  if (isMobile && showHoverTransliterationList) {
    return (
      <MobileNavigator
        isOpen={showHoverTransliterationList}
        onClose={() => setShowHoverTransliterationList(false)}
        title="Select Hover Transliteration"
        options={TRANSLITERATORS}
        selectedId={hoverTransliteration}
        onSelect={(id) => setHoverTransliteration(id)}
      />
    );
  }

  if (isMobile && showInlineTranslationList) {
    return (
      <MobileNavigator
        isOpen={showInlineTranslationList}
        onClose={() => setShowInlineTranslationList(false)}
        title="Select Inline Translation"
        options={TRANSLATORS}
        selectedId={inlineTranslation}
        onSelect={(id) => setInlineTranslation(id)}
      />
    );
  }

  if (isMobile && showInlineTransliterationList) {
    return (
      <MobileNavigator
        isOpen={showInlineTransliterationList}
        onClose={() => setShowInlineTransliterationList(false)}
        title="Select Inline Transliteration"
        options={TRANSLITERATORS}
        selectedId={inlineTransliteration}
        onSelect={(id) => setInlineTransliteration(id)}
      />
    );
  }

  return (
    <div className="space-y-3">

      {/* On Hover Section */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">On Hover</p>
        </div>

        {/* Hover Translation - No Font Size Slider */}
        {isMobile
          ? renderMobileButton(() => setShowHoverTranslationList(true), currentHoverTranslationLabel, "Show Translation")
          : renderDropdown(TRANSLATORS, hoverTranslation, currentHoverTranslationLabel, setHoverTranslation, "Show Translation")
        }

        {/* Hover Transliteration - No Font Size Slider */}
        {isMobile
          ? renderMobileButton(() => setShowHoverTransliterationList(true), currentHoverTransliterationLabel, "Show Transliteration")
          : renderDropdown(TRANSLITERATORS, hoverTransliteration, currentHoverTransliterationLabel, setHoverTransliteration, "Show Transliteration")
        }

        {/* Hover Recitation removed – moved to Audio tab */}
      </div>

      {/* Inline Section (unchanged) */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Inline</p>
        </div>

        {/* Inline Translation - With Font Size Slider */}
        {isMobile
          ? renderMobileButton(() => setShowInlineTranslationList(true), currentInlineTranslationLabel, "Show Translation")
          : renderDropdown(TRANSLATORS, inlineTranslation, currentInlineTranslationLabel, setInlineTranslation, "Show Translation")
        }
        {/* Font Size slider only for Inline Translation when NOT "None" */}
        {inlineTranslation !== "None" && renderSlider(inlineTranslationSize, setInlineTranslationSize, "Font Size")}

        {/* Inline Transliteration - With Font Size Slider */}
        {isMobile
          ? renderMobileButton(() => setShowInlineTransliterationList(true), currentInlineTransliterationLabel, "Show Transliteration")
          : renderDropdown(TRANSLITERATORS, inlineTransliteration, currentInlineTransliterationLabel, setInlineTransliteration, "Show Transliteration")
        }
        {/* Font Size slider only for Inline Transliteration when NOT "None" */}
        {inlineTransliteration !== "None" && renderSlider(inlineTransliterationSize, setInlineTransliterationSize, "Font Size")}
      </div>
    </div>
  );
}