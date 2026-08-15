import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";
import { BookOpen, ArrowRight } from "lucide-react";

interface LastReadState {
  As_Surah: number;
  Al_Ayah: number;
  At_Timestamp: number;
}

const MIFTAH_AKHIR_QIRA_AH = "Akhir_Qira_ah";

export const ContinueReading = ({ surahList }: { surahList: any[] }) => {
  const [lastRead, setLastRead] = useState<LastReadState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MIFTAH_AKHIR_QIRA_AH);
      if (raw) {
        setLastRead(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("Failed to read last reading position from storage:", e);
    }
  }, []);

  const surahId = lastRead?.As_Surah ?? 1;
  const ayahNum = lastRead?.Al_Ayah ?? 1;

  const surahMeta = surahList.find((s) => Number(s.As_Surah ?? s.id) === Number(surahId));
  const surahName = surahMeta?.An_Nataqah ?? surahMeta?.Nataqah ?? surahMeta?.englishNameTransliteration ?? `Surah ${surahId}`;

  return (
    <Card className="flex-1 min-w-[280px] p-4 bg-card hover:bg-accent/5 transition-all flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {lastRead ? "Continue Reading" : "Start Reading"}
          </p>
          <h4 className="font-semibold text-sm sm:text-base">
            {surahName}
          </h4>
          <p className="text-xs text-muted-foreground">
            Ayah {ayahNum}
          </p>
        </div>
      </div>

      <Link to={`/Quran/As_Surah/${surahId}/Ayah/${ayahNum}`}>
        <Button size="sm" className="gap-2 flex-shrink-0">
          <span>Read</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </Card>
  );
};