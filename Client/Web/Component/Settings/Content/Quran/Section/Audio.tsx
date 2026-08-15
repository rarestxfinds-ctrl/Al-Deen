// Component/Settings/Content/Quran/Section/Audio.tsx
import { useState } from "react";
import { Headphones, Check, Search } from "lucide-react";
import { Switch } from "@Web/Component/UI/Switch";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";
import { Input } from "@Web/Component/UI/Input";
import { useIsMobile } from "@/Hook/Use-Mobile";
import { MobileNavigator } from "../Utility";
import { RECITERS } from "../Constant";
import { useApp } from "@Web/Context/App";

export function Audio() {
  const isMobile = useIsMobile();
  const [showReciterList, setShowReciterList] = useState(false);
  const [search, setSearch] = useState("");
  
  const {
    selectedReciter,
    setSelectedReciter,
    autoScrollDuringPlayback,
    setAutoScrollDuringPlayback,
    hoverRecitation,
    setHoverRecitation,
    // Add these two lines
    recordAudioEnabled,
    setRecordAudioEnabled,
  } = useApp();

  const filteredReciters = RECITERS.filter(reciter =>
    reciter.label.toLowerCase().includes(search.toLowerCase())
  );

  if (isMobile && showReciterList) {
    return (
      <MobileNavigator
        isOpen={showReciterList}
        onClose={() => setShowReciterList(false)}
        title="Select Reciter"
        options={RECITERS}
        selectedId={selectedReciter}
        onSelect={setSelectedReciter}
      />
    );
  }

  return (
    <div className="space-y-3">

      {/* Record Toggle - now functional */}
      <div className="cursor-pointer">
        <Card 
          onClick={() => setRecordAudioEnabled(!recordAudioEnabled)}
          className="py-2.5 px-4 flex items-center justify-between transition-all group"
        >
          <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
            Record Recitation
          </span>
          <Switch 
            id="record-mode" 
            checked={recordAudioEnabled} 
            onCheckedChange={setRecordAudioEnabled} 
            size="md"
          />
        </Card>
      </div>

      {/* Play recitation on word click */}
      <div className="cursor-pointer">
        <Card 
          onClick={() => setHoverRecitation(!hoverRecitation)}
          className="py-2.5 px-4 flex items-center justify-between transition-all group"
        >
          <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
            Recitation on Word Click
          </span>
          <Switch 
            id="word-click-recitation" 
            checked={hoverRecitation} 
            onCheckedChange={setHoverRecitation} 
            size="md"
          />
        </Card>
      </div>

      {/* Auto‑scroll Toggle */}
      <div className="cursor-pointer">
        <Card 
          onClick={() => setAutoScrollDuringPlayback(!autoScrollDuringPlayback)}
          className="py-2.5 px-4 flex items-center justify-between transition-all group"
        >
          <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
            Auto-scroll
          </span>
          <Switch 
            id="auto-scroll" 
            checked={autoScrollDuringPlayback} 
            onCheckedChange={setAutoScrollDuringPlayback} 
            size="md"
          />
        </Card>
      </div>

      {/* Reciter Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reciters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-muted/30 border-2 border-black dark:border-white rounded-[40px] focus:border-primary transition-colors"
        />
      </div>

      {/* Reciter List */}
      <div className="space-y-2">
        {filteredReciters.map((reciter) => {
          const isSelected = selectedReciter === reciter.id;
          return (
            <Button
              key={reciter.id}
              onClick={() => setSelectedReciter(reciter.id)}
              fullWidth
              active={isSelected}
              className="justify-between"
            >
              <span className="text-sm font-medium">{reciter.label}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </Button>
          );
        })}
        {filteredReciters.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No reciters found
          </div>
        )}
      </div>
    </div>
  );
}