// Component/Settings/Content/Quran/Section/Surah_Info.tsx
import { BookOpen, Type } from "lucide-react";
import { Card } from "@/Component/UI/Card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Component/UI/Select";
import { useApp } from "@/Context/App";

const PROVIDERS = [
  { value: "Ibn-Ashur", label: "Ibn Ashur" },
  { value: "Sayyid-Abul-Ala-Maududi", label: "Sayyid Abul Ala Maududi" },
];

const TEXT_SIZES = [
  { value: 2, label: "Small" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Large" },
  { value: 5, label: "Extra Large" },
];

export function Surah_Info() {
  const {
    surahInfoTextSize,
    setSurahInfoTextSize,
    surahInfoProvider,
    setSurahInfoProvider,
  } = useApp();

  return (
    <div className="space-y-3">
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Surah Info</h3>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Tafsir Provider</p>
        </div>
        <Card className="py-2.5 px-4 transition-all group">
          <Select 
            value={surahInfoProvider} 
            onValueChange={setSurahInfoProvider}
          >
            <SelectTrigger className="bg-transparent border-0 p-0 h-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* Text Size */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <div className="flex items-center gap-2">
            <Type className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">Text Size</p>
          </div>
        </div>
        <div className="flex gap-2">
          {TEXT_SIZES.map((size) => (
            <Card
              key={size.value}
              onClick={() => setSurahInfoTextSize(size.value)}
              className={`
                flex-1 py-2.5 px-4 text-center cursor-pointer transition-all group
                ${surahInfoTextSize === size.value ? "bg-black dark:bg-white text-white dark:text-black" : ""}
              `}
            >
              <span className={`text-sm font-medium ${surahInfoTextSize === size.value ? "text-white dark:text-black" : "text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black"}`}>
                {size.label}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}