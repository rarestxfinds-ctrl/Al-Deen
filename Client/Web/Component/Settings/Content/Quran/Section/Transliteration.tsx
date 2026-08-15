// Component/Settings/Content/Quran/Section/Transliteration.tsx
import { Languages, ChevronDown, Check } from "lucide-react";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";
import { Slider } from "@Web/Component/UI/Slider";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@Web/Component/UI/Dropdown-Menu";
import { MobileNavigator } from "../Utility";
import { TRANSLITERATORS } from "../Constant";
import { useApp } from "@Web/Context/App";

export function Transliteration() {
  const isMobile = useIsMobile();
  const [showTransliteratorList, setShowTransliteratorList] = useState(false);

  const {
    selectedAyahTransliterator,
    setSelectedAyahTransliterator,
    transliterationSize,
    setTransliterationSize,
  } = useApp();

  const currentLabel = TRANSLITERATORS.find(t => t.id === selectedAyahTransliterator)?.label || "None";

  if (isMobile && showTransliteratorList) {
    return (
      <MobileNavigator
        isOpen={showTransliteratorList}
        onClose={() => setShowTransliteratorList(false)}
        title="Select Transliterator"
        options={TRANSLITERATORS}
        selectedId={selectedAyahTransliterator}
        onSelect={setSelectedAyahTransliterator}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Transliteration</h3>
        </div>
      </div>

      {isMobile ? (
        <Button
          onClick={() => setShowTransliteratorList(true)}
          variant="secondary"
          className="w-full flex items-center justify-between px-4 py-2 h-auto group"
          fullWidth
        >
          <span className="text-sm font-medium [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Transliterator</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
              {currentLabel}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
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
              <span className="text-sm font-medium [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Transliterator</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                  {currentLabel}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {TRANSLITERATORS.map((transliterator) => (
              <DropdownMenuItem
                key={transliterator.id}
                onClick={() => setSelectedAyahTransliterator(transliterator.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{transliterator.label}</span>
                {selectedAyahTransliterator === transliterator.id && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {selectedAyahTransliterator !== "None" && (
        <div className="cursor-pointer">
          <Card className="py-2.5 px-4 transition-all group">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black whitespace-nowrap">
                Font Size: {transliterationSize}
              </span>
              <Slider
                value={[transliterationSize]}
                onValueChange={(value) => setTransliterationSize(value[0])}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}