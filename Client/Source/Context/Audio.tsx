import { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { useApp } from "@/Context/App";
import { useQuery } from '@tanstack/react-query';

type PlaybackMode = 'surah' | 'page' | 'ayah';

interface Clip {
  surahId: number;
  startMs: number;
  endMs: number;
}

interface AudioContextType {
  isPlaying: boolean;
  isLoading: boolean;
  currentSurah: number | null;
  currentPage: number | null;
  currentAyah: { surahId: number; ayahNumber: number } | null;
  currentTime: number;
  duration: number;
  progress: number;
  playbackMode: PlaybackMode;
  activeVerse: number | null;
  activeWord: number | null;
  playFullSurah: (surahNumber: number) => void;
  playPage: (pageNumber: number) => void;
  playAyah: (surahId: number, ayahNumber: number) => void;
  togglePlayPause: () => void;
  stop: () => void;
  seekTo: (progress: number) => void;
  setVolume: (volume: number) => void;
  repeatMode: 'none' | 'surah' | 'page' | 'ayah';
  setRepeatMode: (mode: 'none' | 'surah' | 'page' | 'ayah') => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

const AppAudioContext = createContext<AudioContextType | undefined>(undefined);

// ============================================================================
// Network Fetch Client Handlers
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

// ============================================================================
// In-Memory Parsing & Range Helpers
// ============================================================================
function parseRange(r: string): { start: number; end: number } {
  const [start, end] = r.split("-").map(Number);
  return { start, end };
}

function parseClientPageSegments(pageMapEntry: string | undefined): any[] | null {
  if (!pageMapEntry) return null;
  const segments = pageMapEntry.split('|');
  const result: any[] = [];
  
  for (const segment of segments) {
    const [start, end] = segment.split('-');
    if (!start || !end) continue;
    
    const [startSurahVerse] = start.split('.');
    const [startSurah, startVerse] = startSurahVerse.split(':').map(Number);
    
    const [endSurahVerse] = end.split('.');
    const [endSurah, endVerse] = endSurahVerse.split(':').map(Number);
    
    result.push({
      surah: startSurah,
      startVerse,
      endSurah,
      endVerse
    });
  }
  return result.length > 0 ? result : null;
}

function verseMsRange(data: string[][], verseIndex1: number): { start: number; end: number } | null {
  const words = data[verseIndex1 - 1];
  if (!words || words.length === 0) return null;
  const { start } = parseRange(words[0]);
  const { end } = parseRange(words[words.length - 1]);
  return { start, end };
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const { selectedReciter } = useApp();

  // 🌟 Centralized React Query database pipeline
  const { data: corpus } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // 30 minutes client cache validity
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [currentAyah, setCurrentAyah] = useState<{ surahId: number; ayahNumber: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [repeatMode, setRepeatMode] = useState<'none' | 'surah' | 'page' | 'ayah'>('none');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('surah');
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [activeWord, setActiveWord] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackModeRef = useRef<PlaybackMode>('surah');

  const timestampsRef = useRef<Array<{ verse: number; word: number; start: number; end: number }> | null>(null);
  const loadedSurahForTimestampsRef = useRef<number | null>(null);
  const ayahTimestampsRef = useRef<string[] | null>(null);

  const clipQueueRef = useRef<Clip[]>([]);
  const clipIndexRef = useRef<number>(0);
  const stopAtMsRef = useRef<number | null>(null);
  const pendingSeekMsRef = useRef<number | null>(null);

  // ── Compute dynamic asset parameters directly from in-memory cache metadata ──
  const getAudioFileUrl = useCallback((surahId: number, reciter: string) => {
    return `https://everyayah.com/data/${reciter}/${String(surahId).padStart(3, '0')}.mp3`;
  }, []);

  const getTimestampsFromCache = useCallback((surahId: number, reciter: string) => {
    if (!corpus?.audioTimestamps?.[reciter]?.[surahId]) return null;
    return corpus.audioTimestamps[reciter][surahId] as string[][];
  }, [corpus]);

  // ── Load flattened word timestamps for a surah's full audio file ───────────
  const loadTimestampsForSurah = useCallback((surahId: number) => {
    loadedSurahForTimestampsRef.current = surahId;
    const data = getTimestampsFromCache(surahId, selectedReciter);
    
    if (loadedSurahForTimestampsRef.current !== surahId) return;
    if (data) {
      const flat: Array<{ verse: number; word: number; start: number; end: number }> = [];
      for (let v = 0; v < data.length; v++) {
        const words = data[v];
        for (let w = 0; w < words.length; w++) {
          const { start, end } = parseRange(words[w]);
          flat.push({ verse: v + 1, word: w, start, end });
        }
      }
      timestampsRef.current = flat;
    } else {
      timestampsRef.current = null;
    }
  }, [selectedReciter, getTimestampsFromCache]);

  // ── Main audio element setup ────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const ct = audio.currentTime;
      setCurrentTime(ct);
      if (audio.duration) {
        setProgress((ct / audio.duration) * 100);
      }

      const ms = ct * 1000;

      if (stopAtMsRef.current != null && ms >= stopAtMsRef.current) {
        advanceOrFinish();
        return;
      }

      const mode = playbackModeRef.current;
      if (mode === 'surah' || mode === 'page') {
        const ts = timestampsRef.current;
        if (ts && ts.length > 0) {
          let foundVerse: number | null = null;
          let foundWord: number | null = null;
          for (let i = 0; i < ts.length; i++) {
            const item = ts[i];
            if (ms >= item.start && ms < item.end) {
              foundVerse = item.verse;
              foundWord = item.word;
              break;
            }
          }
          setActiveVerse(foundVerse);
          setActiveWord(foundWord);
        }
      } else if (mode === 'ayah') {
        const ts = ayahTimestampsRef.current;
        if (ts && ts.length > 0) {
          let foundWord: number | null = null;
          for (let i = 0; i < ts.length; i++) {
            const { start, end } = parseRange(ts[i]);
            if (ms >= start && ms < end) {
              foundWord = i;
              break;
            }
          }
          setActiveWord(foundWord);
        }
      } else {
        setActiveVerse(null);
        setActiveWord(null);
      }
    };

    const handleLoadedMetadata = () => {
      if (pendingSeekMsRef.current != null) {
        audio.currentTime = pendingSeekMsRef.current / 1000;
        pendingSeekMsRef.current = null;
      }
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // ── Load a surah's audio file (raw, whole file, no clip bounds) ────────────
  const loadAndPlay = useCallback((surahId: number, seekMs?: number, stopMs?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsLoading(true);
    setActiveVerse(null);
    setActiveWord(null);
    stopAtMsRef.current = stopMs ?? null;
    pendingSeekMsRef.current = seekMs ?? null;

    const url = getAudioFileUrl(surahId, selectedReciter);
    audio.src = url;
    audio.playbackRate = playbackSpeed;
    
    try {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Audio playback initialization failed:', error);
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Audio asset injection exception:', error);
      setIsLoading(false);
    }
  }, [selectedReciter, playbackSpeed, getAudioFileUrl]);

  // ── Advance to next clip in queue, or finish (handles repeat) ──────────────
  const advanceOrFinish = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const queue = clipQueueRef.current;
    const nextIndex = clipIndexRef.current + 1;

    if (queue.length > 0 && nextIndex < queue.length) {
      clipIndexRef.current = nextIndex;
      const clip = queue[nextIndex];
      if (clip.surahId === loadedSurahForTimestampsRef.current && audio.src.includes(String(clip.surahId))) {
        stopAtMsRef.current = clip.endMs;
        audio.currentTime = clip.startMs / 1000;
        audio.play().catch(err => console.error("Clip advance play error:", err));
      } else {
        loadTimestampsForSurah(clip.surahId);
        loadAndPlay(clip.surahId, clip.startMs, clip.endMs);
      }
      return;
    }

    const mode = playbackModeRef.current;
    const shouldRepeat =
      (mode === 'surah' && repeatMode === 'surah') ||
      (mode === 'page' && repeatMode === 'page') ||
      (mode === 'ayah' && repeatMode === 'ayah');

    if (shouldRepeat && queue.length > 0) {
      clipIndexRef.current = 0;
      const clip = queue[0];
      stopAtMsRef.current = clip.endMs;
      audio.currentTime = clip.startMs / 1000;
      audio.play().catch(err => console.error("Clip repeat play error:", err));
    } else if (shouldRepeat) {
      audio.currentTime = 0;
      audio.play().catch(err => console.error("Whole loop play error:", err));
    } else {
      audio.pause();
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setActiveVerse(null);
      setActiveWord(null);
    }
  }, [loadAndPlay, loadTimestampsForSurah, repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => advanceOrFinish();
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [advanceOrFinish]);

  // ── Play Full Surah ─────────────────────────────────────────────────────────
  const playFullSurah = useCallback(async (surahNumber: number) => {
    playbackModeRef.current = 'surah';
    setPlaybackMode('surah');
    setCurrentPage(null);
    setCurrentAyah(null);
    setCurrentSurah(surahNumber);
    clipQueueRef.current = [];
    clipIndexRef.current = 0;

    loadTimestampsForSurah(surahNumber);

    const needsBasmallah = surahNumber !== 1 && surahNumber !== 9;
    if (needsBasmallah) {
      try {
        const basmallahUrl = getAudioFileUrl(1, selectedReciter);
        const basmallahTimestamps = getTimestampsFromCache(1, selectedReciter);
        const range = basmallahTimestamps ? verseMsRange(basmallahTimestamps, 1) : null;
        if (basmallahUrl && range) {
          setIsLoading(true);
          await new Promise<void>((resolve) => {
            const pre = new Audio(basmallahUrl);
            pre.currentTime = range.start / 1000;
            pre.playbackRate = playbackSpeed;
            const done = () => {
              pre.removeEventListener('timeupdate', onTime);
              pre.removeEventListener('ended', done);
              pre.removeEventListener('error', done);
              pre.pause();
              resolve();
            };
            const onTime = () => {
              if (pre.currentTime * 1000 >= range.end) done();
            };
            pre.addEventListener('timeupdate', onTime);
            pre.addEventListener('ended', done);
            pre.addEventListener('error', done);
            pre.play().catch(done);
          });
        }
      } catch (e) {
        console.warn('Basmallah template audio exception skipped', e);
      }
    }

    loadAndPlay(surahNumber);
  }, [loadAndPlay, loadTimestampsForSurah, selectedReciter, playbackSpeed, getAudioFileUrl, getTimestampsFromCache]);

  // ── Play Page ──────────────────────────────────────────────────────────────
  const playPage = useCallback((pageNumber: number) => {
    playbackModeRef.current = 'page';
    setPlaybackMode('page');
    setCurrentSurah(null);
    setCurrentAyah(null);
    setCurrentPage(pageNumber);

    if (!corpus?.pageMap) return;
    const rawPageData = corpus.pageMap[pageNumber - 1];
    const segments = parseClientPageSegments(rawPageData);
    
    if (!segments || segments.length === 0) {
      console.error(`No segment array indices resolved for page ${pageNumber}`);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const clips: Clip[] = [];
    for (const seg of segments) {
      const data = getTimestampsFromCache(seg.surah, selectedReciter);
      if (!data) continue;
      const startRange = verseMsRange(data, seg.startVerse);
      const endRange = verseMsRange(data, seg.endVerse);
      if (!startRange || !endRange) continue;
      clips.push({ surahId: seg.surah, startMs: startRange.start, endMs: endRange.end });
    }

    if (clips.length === 0) {
      console.error(`Could not match runtime geometry boundaries on page ${pageNumber}`);
      setIsLoading(false);
      return;
    }

    clipQueueRef.current = clips;
    clipIndexRef.current = 0;
    loadTimestampsForSurah(clips[0].surahId);
    loadAndPlay(clips[0].surahId, clips[0].startMs, clips[0].endMs);
  }, [loadAndPlay, loadTimestampsForSurah, selectedReciter, corpus, getTimestampsFromCache]);

  // ── Play a single Ayah ──────────────────────────────────────────────────────
  const playAyah = useCallback((surahId: number, ayahNumber: number) => {
    playbackModeRef.current = 'ayah';
    setPlaybackMode('ayah');
    setCurrentSurah(null);
    setCurrentPage(null);
    setCurrentAyah({ surahId, ayahNumber });

    const data = getTimestampsFromCache(surahId, selectedReciter);
    const words = data?.[ayahNumber - 1];
    ayahTimestampsRef.current = words || null;

    if (!words || words.length === 0) {
      console.error(`Missing segment coordinate maps for target ayah ${surahId}:${ayahNumber}`);
      setIsLoading(false);
      return;
    }

    const { start } = parseRange(words[0]);
    const { end } = parseRange(words[words.length - 1]);

    clipQueueRef.current = [{ surahId, startMs: start, endMs: end }];
    clipIndexRef.current = 0;
    setActiveVerse(ayahNumber);

    loadAndPlay(surahId, start, end);
  }, [loadAndPlay, selectedReciter, getTimestampsFromCache]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(err => console.error("Toggle play error:", err));
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
    setIsPlaying(false);
    setCurrentSurah(null);
    setCurrentPage(null);
    setCurrentAyah(null);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setActiveVerse(null);
    setActiveWord(null);
    timestampsRef.current = null;
    ayahTimestampsRef.current = null;
    loadedSurahForTimestampsRef.current = null;
    clipQueueRef.current = [];
    clipIndexRef.current = 0;
    stopAtMsRef.current = null;
    pendingSeekMsRef.current = null;
  }, []);

  const seekTo = useCallback((newProgress: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    const clip = clipQueueRef.current[clipIndexRef.current];
    if (clip) {
      const span = clip.endMs - clip.startMs;
      const targetMs = clip.startMs + (newProgress / 100) * span;
      audio.currentTime = targetMs / 1000;
    } else {
      audio.currentTime = (newProgress / 100) * audio.duration;
    }
    setProgress(newProgress);
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const contextValue = useMemo(() => ({
    isPlaying,
    isLoading,
    currentSurah,
    currentPage,
    currentAyah,
    currentTime,
    duration,
    progress,
    playbackMode,
    activeVerse,
    activeWord,
    playFullSurah,
    playPage,
    playAyah,
    togglePlayPause,
    stop,
    seekTo,
    setVolume,
    repeatMode,
    setRepeatMode,
    playbackSpeed,
    setPlaybackSpeed,
  }), [
    isPlaying, isLoading, currentSurah, currentPage, currentAyah,
    currentTime, duration, progress, playbackMode,
    activeVerse, activeWord,
    playFullSurah, playPage, playAyah, togglePlayPause, stop,
    seekTo, setVolume, repeatMode, playbackSpeed,
  ]);

  return (
    <AppAudioContext.Provider value={contextValue}>
      {children}
    </AppAudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AppAudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}