// Component/Settings/Content/Quran/Section/Layout.tsx
import { AlignJustify, BookOpen } from "lucide-react";
import { Button } from "@/Component/UI/Button";
import { Container } from "@/Component/UI/Container";
import { Switch } from "@/Component/UI/Switch";
import { Card } from "@/Component/UI/Card";
import { cn } from "@/Library/utils";
import { useApp } from "@/Context/App";

export function Layout() {
  const { 
    layout, 
    setLayout,
    hideVerses,           // add to useApp
    setHideVerses,        // add to useApp
    hideVerseMarkers,     // add to useApp
    setHideVerseMarkers,  // add to useApp
  } = useApp();

  const options = [
    { id: "ayah" as const, label: "Ayah", icon: <AlignJustify className="h-3.5 w-3.5" /> },
    { id: "page" as const, label: "Page", icon: <BookOpen className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-3">
      {/* Layout selection */}
      <Container className="!py-2.5 !px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlignJustify className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">Layout</h3>
        </div>
        <div className="flex items-center gap-1">
          {options.map((opt) => (
            <Button
              key={opt.id}
              onClick={() => setLayout(opt.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs font-medium",
                layout === opt.id
                  ? "bg-primary text-primary-foreground"
                  : ""
              )}
            >
              {opt.icon}
              {opt.label}
            </Button>
          ))}
        </div>
      </Container>

      {/* Hide Verses toggle */}
      <div className="cursor-pointer">
        <Card 
          onClick={() => setHideVerses(!hideVerses)}
          className="py-2.5 px-4 flex items-center justify-between transition-all group"
        >
          <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
            Hide Verses
          </span>
          <Switch 
            id="hide-verses" 
            checked={hideVerses} 
            onCheckedChange={setHideVerses} 
            size="md"
          />
        </Card>
      </div>

      {/* Hide Verse Markers toggle */}
      <div className="cursor-pointer">
        <Card 
          onClick={() => setHideVerseMarkers(!hideVerseMarkers)}
          className="py-2.5 px-4 flex items-center justify-between transition-all group"
        >
          <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
            Hide Verse Markers
          </span>
          <Switch 
            id="hide-verse-markers" 
            checked={hideVerseMarkers} 
            onCheckedChange={setHideVerseMarkers} 
            size="md"
          />
        </Card>
      </div>
    </div>
  );
}