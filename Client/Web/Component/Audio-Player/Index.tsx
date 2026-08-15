import { memo, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAudio } from "@Web/Context/Audio";
import { useQuery } from "@tanstack/react-query";
import { AudioPlayerMain } from "./Main";
import type { AudioPlayerProps, SettingsMenu } from "./Types";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

export const AudioPlayer = memo(function AudioPlayer({
  isVisible,
  onClose,
  surahId,
  surahName,
}: AudioPlayerProps) {
  const {
    isPlaying,
    isLoading: isAudioLoading,
    currentSurah,
    currentPage,
    currentTime,
    duration,
    progress,
    togglePlayPause,
    stop,
    seekTo,
    setVolume,
    repeatMode,
    setRepeatMode,
    playbackSpeed,
    setPlaybackSpeed,
    playbackMode,
    playFullSurah,
    playAyah,
  } = useAudio();

  const [volume, setLocalVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState<SettingsMenu>("main");

  // Ingest structural segment and database maps over unified reactive query cache
  const { data: corpus } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
    enabled: isVisible,
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);
  const juzSegmentsMap = useMemo(() => corpus?.juzSegments || {}, [corpus]);
  const hizbSegmentsMap = useMemo(() => corpus?.hizbSegments || {}, [corpus]);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    setVolume(isMuted ? 0 : newVolume);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? volume : 0);
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleClose = () => {
    stop();
    onClose();
  };

  const resolvedSurahId = currentSurah ?? surahId;
  const currentSurahData = useMemo(() => {
    if (!resolvedSurahId || surahList.length === 0) return null;
    return surahList.find((s: any) => s.id === resolvedSurahId) || null;
  }, [resolvedSurahId, surahList]);

  const trackTitle = currentSurahData
    ? currentSurahData.englishName
    : surahName ?? (currentPage ? `Page ${currentPage}` : null);

  const handleSelectJuz = (juz: number) => {
    // Dynamic matching over cached dictionary objects
    const segs = juzSegmentsMap[juz] || [];
    if (segs && segs[0]) {
      playAyah(segs[0].surah, segs[0].startVerse);
    }
  };

  const handleSelectHizb = (hizb: number) => {
    // Dynamic matching over cached dictionary objects
    const segs = hizbSegmentsMap[hizb] || [];
    if (segs && segs[0]) {
      playAyah(segs[0].surah, segs[0].startVerse);
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <AudioPlayerMain
      isPlaying={isPlaying}
      isLoading={isAudioLoading}
      progress={progress}
      currentTime={currentTime}
      duration={duration}
      trackTitle={trackTitle}
      repeatMode={repeatMode}
      playbackSpeed={playbackSpeed}
      playbackMode={playbackMode}
      volume={volume}
      isMuted={isMuted}
      settingsOpen={settingsOpen}
      settingsMenu={settingsMenu}
      onTogglePlayPause={togglePlayPause}
      onSeek={handleSeek}
      onVolumeChange={handleVolumeChange}
      onToggleMute={toggleMute}
      onSettingsOpenChange={setSettingsOpen}
      onSettingsMenuChange={setSettingsMenu}
      onRepeatModeChange={setRepeatMode}
      onPlaybackSpeedChange={setPlaybackSpeed}
      onClose={handleClose}
      currentSurahId={resolvedSurahId ?? undefined}
      onSelectSurah={(id) => playFullSurah(id)}
      onSelectAyah={(s, a) => playAyah(s, a)}
      onSelectJuz={handleSelectJuz}
      onSelectHizb={handleSelectHizb}
    />,
    document.body
  );
});