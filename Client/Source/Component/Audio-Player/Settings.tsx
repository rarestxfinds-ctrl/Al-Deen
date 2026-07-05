import { Slider } from "@/Component/UI/Slider";
import {
  Repeat,
  ChevronLeft,
  Gauge,
  Check,
  Volume2,
  VolumeX,
  Settings2,
} from "lucide-react";
import { cn } from "@/Library/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Component/UI/Popover";
import { Button } from "@/Component/UI/Button"; // updated Button
import type { SettingsMenu } from "./Types";
import { getRepeatLabel, playbackSpeeds } from "./Utility";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: SettingsMenu;
  onMenuChange: (menu: SettingsMenu) => void;
  repeatMode: "none" | "surah" | "page";
  onRepeatModeChange: (mode: "none" | "surah" | "page") => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  playbackMode: "surah" | "page";
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
}

export const Settings = ({
  open,
  onOpenChange,
  menu,
  onMenuChange,
  repeatMode,
  onRepeatModeChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  playbackMode,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: SettingsProps) => {
  const repeatOptions =
    playbackMode === "surah"
      ? [
          { value: "none" as const, label: "Off" },
          { value: "surah" as const, label: "Surah" },
        ]
      : [
          { value: "none" as const, label: "Off" },
          { value: "page" as const, label: "Page" },
        ];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "w-8 h-8 p-0 rounded-full",
            repeatMode !== "none" && "text-primary"
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        className="w-56 p-0 overflow-hidden bg-white dark:bg-black border-2 border-black dark:border-white rounded-[40px] z-[10000]"
      >
        <div className="p-1">
          {/* Main menu */}
          {menu === "main" && (
            <div className="py-1">
              {/* Volume slider */}
              <div className="px-3 py-2 flex items-center gap-2">
                <Button
                  size="sm"
                  className="w-6 h-6 p-0 rounded-full shrink-0"
                  onClick={onToggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={onVolumeChange}
                  className={cn(
                    "flex-1 cursor-pointer",
                    "[&>span:first-child]:h-1",
                    "[&>span:first-child]:bg-muted",
                    "[&>span:first-child>span]:bg-primary",
                    "[&_[role=slider]]:h-3",
                    "[&_[role=slider]]:w-3",
                    "[&_[role=slider]]:border-0",
                    "[&_[role=slider]]:bg-primary"
                  )}
                />
              </div>

              {/* Repeat button */}
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-[40px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm"
                onClick={() => onMenuChange("repeat")}
              >
                <div className="flex items-center gap-2">
                  <Repeat className="h-3.5 w-3.5" />
                  <span className="text-sm">Repeat</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getRepeatLabel(repeatMode)}
                </span>
              </button>

              {/* Speed button */}
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-[40px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm"
                onClick={() => onMenuChange("speed")}
              >
                <div className="flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-sm">Speed</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {playbackSpeed}x
                </span>
              </button>
            </div>
          )}

          {/* Repeat submenu */}
          {menu === "repeat" && (
            <div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-[40px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                onClick={() => onMenuChange("main")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Repeat</span>
              </button>
              <div className="py-1">
                {repeatOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-[40px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                      repeatMode === value && "bg-black/10 dark:bg-white/10"
                    )}
                    onClick={() => {
                      onRepeatModeChange(value);
                      onMenuChange("main");
                    }}
                  >
                    <span className="text-sm">{label}</span>
                    {repeatMode === value && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Speed submenu */}
          {menu === "speed" && (
            <div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-[40px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                onClick={() => onMenuChange("main")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Speed</span>
              </button>
              <div className="py-1">
                {playbackSpeeds.map((speed) => (
                  <button
                    key={speed}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-[40px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                      playbackSpeed === speed && "bg-black/10 dark:bg-white/10"
                    )}
                    onClick={() => {
                      onPlaybackSpeedChange(speed);
                      onMenuChange("main");
                    }}
                  >
                    <span className="text-sm">{speed}x</span>
                    {playbackSpeed === speed && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};