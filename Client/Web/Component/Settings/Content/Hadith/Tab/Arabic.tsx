import { Card } from "@Web/Component/UI/Card";
import { Slider } from "@Web/Component/UI/Slider";
import { useApp } from "@Web/Context/App";

interface FontSizeSliderProps {
  value: number;
  onChange: (size: number) => void;
  label: string;
}

function FontSizeSlider({ value, onChange, label }: FontSizeSliderProps) {
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
}

export function ArabicSection() {
  const {
    hadithArabicFontSize,
    setHadithArabicFontSize,
  } = useApp();

  return (
    <div className="space-y-1.5">
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <p className="text-xs font-medium text-foreground">Arabic Settings</p>
      </div>

      <FontSizeSlider
        value={hadithArabicFontSize}
        onChange={setHadithArabicFontSize}
        label="Arabic Size"
      />
    </div>
  );
}