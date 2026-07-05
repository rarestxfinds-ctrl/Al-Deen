import { Mic, MicOff, Eye, EyeOff, Play } from "lucide-react";
import { Card } from "@/Component/UI/Card";
import { cn } from "@/Library/utils";

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
          "p-3 rounded-full cursor-pointer transition-all group inline-flex items-center justify-center w-fit",
          isRecording
            ? "bg-red-500 hover:bg-red-600 border-red-500"
            : ""
        )}
        onClick={onRecordToggle}
      >
        {isRecording ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
        )}
      </Card>

      {/* Play Surah Button */}
      {onTestAudio && (
        <Card
          className="p-3 rounded-full cursor-pointer transition-all inline-flex items-center justify-center w-fit group"
          onClick={onTestAudio}
        >
          <Play className="h-6 w-6 text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
        </Card>
      )}

      {/* Hide Verses toggle — uses Card for consistent (gray) hover styling */}
      <Card
        active={hideVerses}
        className="p-3 rounded-full cursor-pointer inline-flex items-center justify-center w-fit group"
        onClick={handleEyeClick}
      >
        {hideVerses ? (
          <EyeOff className="h-6 w-6 text-foreground [.high-contrast_&]:text-white [.high-contrast_&]:dark:text-black [.high-contrast_&]:group-hover:text-black [.high-contrast_&]:dark:group-hover:text-white" />
        ) : (
          <Eye className="h-6 w-6 text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black" />
        )}
      </Card>

      {/* Transcript */}
      {transcript && (
        <Card className="p-3 max-w-[200px] backdrop-blur-sm" hoverable={false}>
          <p className="text-xs text-foreground break-words">{transcript}</p>
        </Card>
      )}
    </div>
  );
}
