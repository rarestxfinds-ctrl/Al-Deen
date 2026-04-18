import { Mic, MicOff, Eye, EyeOff, Play } from "lucide-react";
import { Switch } from "@/Top/Component/UI/Switch";
import { Card } from "@/Top/Component/UI/Card";
import { cn } from "@/Middle/Library/utils";

interface AudioControlsProps {
  isRecording?: boolean;
  onRecordToggle?: () => void;
  onTestAudio?: () => void;   // new
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

      {/* Test Audio Button (sends a fixed MP3 file) */}
      {onTestAudio && (
        <Card
          className="p-3 rounded-full cursor-pointer transition-all hover:scale-105 bg-white dark:bg-black"
          onClick={onTestAudio}
        >
          <Play className="h-6 w-6 text-foreground group-hover:text-white dark:group-hover:text-black" />
        </Card>
      )}

      {/* Hide Verses Toggle */}
      <Card className="p-2 rounded-full flex items-center justify-center">
        <Switch
          checked={hideVerses}
          onCheckedChange={onHideVersesToggle}
          size="md"
          icon={<Eye className="h-4 w-4" />}
          iconChecked={<EyeOff className="h-4 w-4" />}
        />
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