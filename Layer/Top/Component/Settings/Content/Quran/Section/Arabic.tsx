// Component/Settings/Content/Quran/Section/Arabic.tsx
import { useState } from "react";
import { Type, ChevronDown, Check } from "lucide-react";
import { Switch } from "@/Top/Component/UI/Switch";
import { Card } from "@/Top/Component/UI/Card";
import { Button } from "@/Top/Component/UI/Button";
import { Slider } from "@/Top/Component/UI/Slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/Top/Component/UI/Dropdown-Menu";
import { useIsMobile } from "@/Middle/Hook/Use-Mobile";
import { MobileNavigator } from "../Utility";
import { KFGQPC_VARIANTS } from "../Constant";
import { useApp } from "@/Middle/Context/App";
import { mobileSettingsStore } from "../../../mobileSettingsStore";

export function Arabic() {
  const isMobile = useIsMobile();
  const [showFontList, setShowFontList] = useState(false);
  
  const {
    showArabicText,
    setShowArabicText,
    quranFont,
    setQuranFont,
    fontSize,
    setFontSize,
  } = useApp();
  
  const currentFontLabel = (() => {
    if (quranFont === "indopak") return "IndoPak";
    return KFGQPC_VARIANTS.find(o => o.id === quranFont)?.label || "Uthmani Hafs";
  })();

  const fontOptions = [
    { id: "uthmani", label: "QPC Uthmani Hafs" },
    { id: "uthmani_v1", label: "King Fahad Complex V1" },
    { id: "uthmani_v2", label: "King Fahad Complex V2" },
    { id: "uthmani_v4", label: "King Fahad Complex V4" },
    { id: "indopak", label: "IndoPak" },
  ];

  const openFontPicker = () => {
    // Push modal onto stack – saves current state and sets new top bar
    mobileSettingsStore.pushModal(
      "Select Font",
      true,
      () => closeFontPicker(),  // back button closes picker
      () => closeFontPicker()   // close button also closes picker
    );
    setShowFontList(true);
  };

  const closeFontPicker = () => {
    setShowFontList(false);
    // Pop modal – restores previous store state
    mobileSettingsStore.popModal();
  };

  if (isMobile && showFontList) {
    return (
      <MobileNavigator
        isOpen={showFontList}
        onClose={closeFontPicker}
        title="Select Font"
        options={fontOptions}
        selectedId={quranFont}
        onSelect={(id) => {
          setQuranFont(id);
          closeFontPicker();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Arabic Text</h3>
        </div>
      </div>

      {/* Show Arabic Toggle */}
      <div className="cursor-pointer">
        <Card 
          onClick={() => setShowArabicText(!showArabicText)}
          className="py-2.5 px-4 flex items-center justify-between transition-all group"
        >
          <span className="font-semibold text-sm group-hover:text-white dark:group-hover:text-black">
            Show Arabic
          </span>
          <Switch 
            id="show-arabic" 
            checked={showArabicText} 
            onCheckedChange={setShowArabicText} 
            size="md"
          />
        </Card>
      </div>

      {/* Font Selection */}
      {isMobile ? (
        <Button
          onClick={openFontPicker}
          variant="secondary"
          className="w-full flex items-center justify-between px-4 py-2 h-auto group"
          fullWidth
        >
          <span className="text-sm font-medium group-hover:text-white dark:group-hover:text-black">Font</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground group-hover:text-white dark:group-hover:text-black">
              {currentFontLabel}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-white dark:group-hover:text-black" />
          </div>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="w-full flex items-center justify-between px-4 py-2 h-auto group"
              fullWidth
            >
              <span className="text-sm font-medium group-hover:text-white dark:group-hover:text-black">Font</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground group-hover:text-white dark:group-hover:text-black">
                  {currentFontLabel}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-white dark:group-hover:text-black" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {fontOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => setQuranFont(opt.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{opt.label}</span>
                {quranFont === opt.id && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Font Size Slider */}
      <div className="cursor-pointer">
        <Card className="py-2.5 px-4 transition-all group">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-sm group-hover:text-white dark:group-hover:text-black whitespace-nowrap">
              Font Size: {fontSize}
            </span>
            <Slider
              value={[fontSize]}
              onValueChange={(value) => setFontSize(value[0])}
              min={1}
              max={10}
              step={1}
              className="flex-1"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}