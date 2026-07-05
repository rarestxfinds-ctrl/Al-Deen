import { useMemo, useState } from "react";
import {
  Play,
  Pause,
  Loader2,
  X,
  ListMusic,
  Search,
  ChevronDown,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Button } from "@/Component/UI/Button";
import { Container } from "@/Component/UI/Container";
import { Slider } from "@/Component/UI/Slider";
import { Input } from "@/Component/UI/Input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Component/UI/Popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/Component/UI/Dropdown-Menu";
import { cn } from "@/Library/utils";
import { useQuery } from "@tanstack/react-query";
import type { AudioPlayerMainProps, AudioPlayLevel } from "./Types";
import { formatTime } from "./Utility";
import { Settings } from "./Settings";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

const Timeline = ({
  progress,
  currentTime,
  duration,
  onSeek,
}: {
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (value: number[]) => void;
}) => (
  <div className="flex items-center gap-2 w-full">
    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
      {formatTime(currentTime)}
    </span>
    <Slider
      value={[progress]}
      max={100}
      step={0.1}
      onValueChange={onSeek}
      className="flex-1"
    />
    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
      {formatTime(duration)}
    </span>
  </div>
);

const LEVEL_LABELS: Record<AudioPlayLevel, string> = {
  surah: "Surah",
  ayah: "Ayah",
  juz: "Juz",
  hizb: "Hizb",
};

const AudioPicker = ({
  currentSurahId,
  onSelectSurah,
  onSelectAyah,
  onSelectJuz,
  onSelectHizb,
}: {
  currentSurahId?: number;
  onSelectSurah: (id: number) => void;
  onSelectAyah: (surahId: number, ayah: number) => void;
  onSelectJuz: (juz: number) => void;
  onSelectHizb: (hizb: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<AudioPlayLevel>("surah");
  const [query, setQuery] = useState("");
  const [ayahSurah, setAyahSurah] = useState<number | null>(null);

  // Ingest structural database maps over unified reactive query cache
  const { data: corpus } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
    enabled: open,
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setAyahSurah(null);
  };

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahList;
    return surahList.filter(
      (s: any) =>
        s.englishName.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.id.toString() === q
    );
  }, [query, surahList]);

  const renderBody = () => {
    if (level === "surah") {
      return (
        <div className="max-h-72 overflow-y-auto py-1">
          {filteredSurahs.map((s: any) => (
            <button
              key={s.id}
              onClick={() => {
                onSelectSurah(s.id);
                close();
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-between gap-2",
                currentSurahId === s.id && "bg-black/5 dark:bg-white/5 font-medium"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground w-6 shrink-0">{s.id}</span>
                <span className="truncate">{s.englishName}</span>
              </span>
              <span className="font-arabic text-sm shrink-0">{s.name}</span>
            </button>
          ))}
          {filteredSurahs.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No results</p>
          )}
        </div>
      );
    }

    if (level === "ayah") {
      if (!ayahSurah) {
        return (
          <div className="max-h-72 overflow-y-auto py-1">
            {filteredSurahs.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setAyahSurah(s.id)}
                className="w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-6 shrink-0">{s.id}</span>
                  <span className="truncate">{s.englishName}</span>
                </span>
                <span className="font-arabic text-sm shrink-0">{s.name}</span>
              </button>
            ))}
          </div>
        );
      }
      const meta = surahList.find((s: any) => s.id === ayahSurah);
      if (!meta) return null;
      return (
        <div className="flex flex-col max-h-72">
          <div className="flex items-center gap-2 px-2 pt-2">
            <button onClick={() => setAyahSurah(null)} className="p-1 rounded hover:bg-muted/10">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">{meta.englishName}</span>
          </div>
          <div className="overflow-y-auto grid grid-cols-5 gap-1 p-2">
            {Array.from({ length: meta.numberOfAyahs }, (_, i) => i + 1).map((a) => (
              <button
                key={a}
                onClick={() => {
                  onSelectAyah(ayahSurah, a);
                  close();
                }}
                className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (level === "juz" || level === "hizb") {
      const total = level === "juz" ? 30 : 60;
      return (
        <div className="grid grid-cols-5 gap-1 p-2 max-h-72 overflow-y-auto">
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => {
                level === "juz" ? onSelectJuz(n) : onSelectHizb(n);
                close();
              }}
              className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10"
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    return null;
  };

  const showSearch = level === "surah" || (level === "ayah" && !ayahSurah);

  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="w-9 h-9 p-0 rounded-full shadow-lg"
          title="Select what to play"
          aria-label="Select what to play"
        >
          <ListMusic className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-72 p-0 z-[10000]"
      >
        <div className="p-2 border-b flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs font-medium px-2 py-1 h-8">
                {LEVEL_LABELS[level]}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px] z-[10001]">
              {(Object.keys(LEVEL_LABELS) as AudioPlayLevel[]).map((l) => (
                <DropdownMenuItem
                  key={l}
                  onClick={() => {
                    setLevel(l);
                    setQuery("");
                    setAyahSurah(null);
                  }}
                  className={cn("flex items-center justify-between text-xs", level === l && "font-medium")}
                >
                  {LEVEL_LABELS[l]}
                  {level === l && <Check className="h-3 w-3 ml-2" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search surah..."
                className="pl-7 h-8 text-xs"
                autoFocus
              />
            </div>
          )}
        </div>
        {renderBody()}
      </PopoverContent>
    </Popover>
  );
};

export const AudioPlayerMain = ({
  isPlaying,
  isLoading,
  progress,
  currentTime,
  duration,
  trackTitle,
  repeatMode,
  playbackSpeed,
  playbackMode,
  volume,
  isMuted,
  settingsOpen,
  settingsMenu,
  onTogglePlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onSettingsOpenChange,
  onSettingsMenuChange,
  onRepeatModeChange,
  onPlaybackSpeedChange,
  onClose,
  currentSurahId,
  onSelectSurah,
  onSelectAyah,
  onSelectJuz,
  onSelectHizb,
}: AudioPlayerMainProps) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-between gap-2 mb-1 px-1">
        <AudioPicker
          currentSurahId={currentSurahId}
          onSelectSurah={onSelectSurah}
          onSelectAyah={onSelectAyah}
          onSelectJuz={onSelectJuz}
          onSelectHizb={onSelectHizb}
        />

        <div className="flex items-center gap-2">
          <Settings
            open={settingsOpen}
            onOpenChange={onSettingsOpenChange}
            menu={settingsMenu}
            onMenuChange={onSettingsMenuChange}
            repeatMode={repeatMode}
            onRepeatModeChange={onRepeatModeChange}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={onPlaybackSpeedChange}
            playbackMode={playbackMode}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          <Button
            size="sm"
            className="w-9 h-9 p-0 rounded-full shadow-lg"
            onClick={onTogglePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          <Button
            size="sm"
            className="w-8 h-8 p-0 rounded-full shadow-lg"
            onClick={onClose}
            title="Close player"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Container className="!py-2 !px-3 shadow-lg">
        <Timeline
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
        />
        {trackTitle && (
          <div className="mt-1 text-xs font-medium truncate text-center">
            {trackTitle}
          </div>
        )}
      </Container>
    </div>
  );
};