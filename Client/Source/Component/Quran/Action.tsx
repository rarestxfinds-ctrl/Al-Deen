import { Info, Play, Pause } from "lucide-react";
import { TooltipProvider } from "@/Component/UI/tooltip";
import { useAudio } from "@/Context/Audio";
import { useTranslation } from "@/Hook/Use-Translation";

interface ActionsProps {
  surahId: number;
  surahName?: string;
  onInfoClick: () => void;
  onAudioClick?: () => void; // FIX: added missing prop
}

export function Action({ surahId, onInfoClick, onAudioClick }: ActionsProps) {
  const { t } = useTranslation();
  const {
    isPlaying: isAudioPlaying,
    isLoading: isAudioLoading,
    currentSurah: audioCurrentSurah,
    playFullSurah,
    togglePlayPause,
  } = useAudio();

  const isThisSurahPlaying = audioCurrentSurah === surahId && isAudioPlaying;

  const handleAudioClick = () => {
    // FIX: always show the AudioPlayer modal when the play button is clicked
    onAudioClick?.();

    if (isThisSurahPlaying) {
      togglePlayPause();
    } else if (audioCurrentSurah === surahId && !isAudioPlaying) {
      togglePlayPause();
    } else {
      playFullSurah(surahId);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
      <TooltipProvider>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onInfoClick}
            className="glass-hover flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
          >
            <Info className="h-4 w-4" />
            {t.quran.surahInfo}
          </button>

          <button
            className="glass-btn px-4 py-2.5 gap-2 text-sm text-primary disabled:opacity-50"
            disabled={isAudioLoading}
            onClick={handleAudioClick}
          >
            {isThisSurahPlaying ? (
              <><Pause className="h-4 w-4 fill-current" />{t.quran.pauseAudio}</>
            ) : (
              <><Play className="h-4 w-4 fill-current" />{t.quran.playAudio}</>
            )}
          </button>
        </div>
      </TooltipProvider>
    </div>
  );
}