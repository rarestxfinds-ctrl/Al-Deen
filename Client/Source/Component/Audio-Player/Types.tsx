import { ReactNode } from "react";

export type SettingsMenu = "main" | "repeat" | "speed";
export type AudioPlayLevel = "surah" | "ayah" | "juz" | "hizb";

export interface AudioPlayerProps {
  isVisible: boolean;
  onClose: () => void;
  surahId?: number;
  surahName?: string;
}

export interface AudioPlayerMainProps {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  trackTitle: string | null;
  repeatMode: "none" | "surah" | "page";
  playbackSpeed: number;
  playbackMode: "surah" | "page";
  volume: number;
  isMuted: boolean;
  settingsOpen: boolean;
  settingsMenu: SettingsMenu;
  onTogglePlayPause: () => void;
  onSeek: (value: number[]) => void;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
  onSettingsOpenChange: (open: boolean) => void;
  onSettingsMenuChange: (menu: SettingsMenu) => void;
  onRepeatModeChange: (mode: "none" | "surah" | "page") => void;
  onPlaybackSpeedChange: (speed: number) => void;
  onClose: () => void;
  currentSurahId?: number;
  onSelectSurah: (id: number) => void;
  onSelectAyah: (surahId: number, ayah: number) => void;
  onSelectJuz: (juz: number) => void;
  onSelectHizb: (hizb: number) => void;
}
