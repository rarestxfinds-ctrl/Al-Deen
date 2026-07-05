import { Link } from "react-router-dom";
import { Button } from "@/Component/UI/Button";
import { Container } from "@/Component/UI/Container";
import { BookOpen } from "lucide-react";

interface HistoryTabProps {
  continueReadingSurah: any;
  progress: any;
  setSettingsSidebarOpen: (open: boolean) => void;
}

export function HistoryTab({
  continueReadingSurah,
  progress,
  setSettingsSidebarOpen,
}: HistoryTabProps) {
  if (!continueReadingSurah) {
    return (
      <Container className="text-center py-6">
        <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No reading history yet</p>
        <Link to="/Quran" onClick={() => setSettingsSidebarOpen(false)}>
          <Button className="mt-3 gap-1">Start Reading</Button>
        </Link>
      </Container>
    );
  }

  return (
    <div className="space-y-2">
      <Link
        to={`/Quran/Surah/${progress?.last_surah_id}?verse=${progress?.last_ayah_id}`}
        onClick={() => setSettingsSidebarOpen(false)}
      >
        <Container className="!p-3 flex items-center gap-3 group transition-transform">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">{continueReadingSurah.id}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{continueReadingSurah.englishName}</p>
            <p className="text-xs text-muted-foreground">Ayah {progress?.last_ayah_id}</p>
          </div>
          <span className="font-arabic text-sm" dir="rtl">{continueReadingSurah.name}</span>
        </Container>
      </Link>
    </div>
  );
}