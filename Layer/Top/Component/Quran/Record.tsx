import { Mic, MicOff, Eye, EyeOff, Play } from "lucide-react";
import { Card } from "@/Top/Component/UI/Card";
import { cn } from "@/Middle/Library/utils";

interface AudioControlsProps {
  isRecording?: boolean;
  onRecordToggle?: () => void;
  onTestAudio?: () => void;
  hideVerses?: boolean;
  onHideVersesToggle?: (checked: boolean) => void;
  transcript?: string;
  className?: string;
}

export function AudioControls({
  isRecording = false,
  onRecordToggle,
  onTestAudio,
  hideVerses = false,
  onHideVersesToggle,
  transcript = "",
  className,
}: AudioControlsProps) {
  const handleEyeClick = () => {
    onHideVersesToggle?.(!hideVerses);
  };

  return (
    <div className={cn("fixed right-4 bottom-24 z-40 flex flex-col gap-3", className)}>
      {/* Record Button */}
      <Card
        className={cn(
          "p-3 rounded-full cursor-pointer transition-all group",
          isRecording
            ? "bg-red-500 hover:bg-red-600 border-red-500"
            : "bg-white dark:bg-black hover:scale-105"
        )}
        onClick={onRecordToggle}
      >
        {isRecording ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-foreground group-hover:text-white dark:group-hover:text-black" />
        )}
      </Card>

      {/* Test Audio Button */}
      {onTestAudio && (
        <Card
          className="p-3 rounded-full cursor-pointer transition-all hover:scale-105 bg-white dark:bg-black"
          onClick={onTestAudio}
        >
          <Play className="h-6 w-6 text-foreground group-hover:text-white dark:group-hover:text-black" />
        </Card>
      )}

      {/* Eye-knop met kleur (groen = aan / rood = uit) */}
      <Card
        className={cn(
          "p-3 rounded-full cursor-pointer transition-all w-fit inline-flex items-center justify-center",
          !hideVerses ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
        )}
        onClick={handleEyeClick}
      >
        {hideVerses ? (
          <EyeOff className="h-5 w-5 text-white" />
        ) : (
          <Eye className="h-5 w-5 text-white" />
        )}
      </Card>

      {/* Transcript */}
      {transcript && (
        <Card className="p-3 max-w-[200px] bg-white/90 dark:bg-black/90 backdrop-blur-sm">
          <p className="text-xs text-foreground break-words">{transcript}</p>
        </Card>
      )}
    </div>
  );
}