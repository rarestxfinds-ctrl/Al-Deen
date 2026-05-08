import { Info, Play, Pause, Loader2, BookOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Top/Component/UI/tooltip";
import { useAudio } from "@/Middle/Context/Audio";
import { useTranslation } from "@/Middle/Hook/Use-Translation";
import { Container } from "@/Top/Component/UI/Container";
import { Button } from "@/Top/Component/UI/Button";
import type { SurahMeta } from "@/Bottom/API/Quran";

interface SurahHeaderProps {
  surah: SurahMeta;
  fontClass: string;          // for the surah name
  arabicFontSize: string;
  onInfoClick: () => void;
  onTafsirClick: () => void;
  onAudioClick: () => void;
}

export function SurahHeader({
  surah,
  fontClass,
  arabicFontSize,
  onInfoClick,
  onTafsirClick,
  onAudioClick,
}: SurahHeaderProps) {
  const { t } = useTranslation();
  const {
    isPlaying: isAudioPlaying,
    isLoading: isAudioLoading,
    currentSurah: audioCurrentSurah,
    playFullSurah,
    togglePlayPause,
  } = useAudio();

  const isThisSurahPlaying = audioCurrentSurah === surah.id && isAudioPlaying;

  const handleAudioClick = () => {
    onAudioClick(); // open the AudioPlayer modal

    if (isThisSurahPlaying) {
      togglePlayPause();
    } else if (audioCurrentSurah === surah.id && !isAudioPlaying) {
      togglePlayPause();
    } else {
      playFullSurah(surah.id);
    }
  };

  return (
    <Container className="!px-6 !py-4 rounded-t-[40px] rounded-b-none">
      <div className="space-y-3">
        {/* Title row: surah number, Arabic name, English translation, actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            {/* Surah number */}
            <span className="text-sm font-medium text-muted-foreground">
              {surah.id}
            </span>
            {/* Arabic surah name (via special font) */}
            <div
              className="font-surah leading-tight"
              style={{ fontSize: `calc(${arabicFontSize} * 1.2)` }}
            >
              {surah.surahFontName}
            </div>
            {/* English translation */}
            <div className="text-sm text-muted-foreground">
              {surah.englishNameTranslation}
            </div>
          </div>

          {/* Action buttons with Tooltips */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onInfoClick}
                    aria-label="Surah info"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t.quran.surahInfo}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onTafsirClick}
                    aria-label="View Tafsir"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Tafsir (Verse 1)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isAudioLoading}
                    onClick={handleAudioClick}
                    aria-label={isThisSurahPlaying ? "Pause" : "Play surah"}
                  >
                    {isAudioLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isThisSurahPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isThisSurahPlaying ? t.quran.pauseAudio : t.quran.playAudio}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </Container>
  );
}