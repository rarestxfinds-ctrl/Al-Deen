// @/Component/Quran/Layout/Safhah/Utility.tsx
import React, { useRef } from "react";
import { useApp } from "@/Context/App";
import { Tooltip } from "@/Component/UI/Tooltip";
import type { WordTooltipProps } from "./Types";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

export function WordTooltip({ 
  translation,
  transliteration,
  enabled, 
  onClick, 
  onMouseEnter, 
  onMouseLeave, 
  children 
}: WordTooltipProps) {
  let tooltipContent: React.ReactNode = null;
  
  if (translation && transliteration) {
    tooltipContent = (
      <div className="space-y-0.5">
        <div className="text-black dark:text-white text-sm">
          {translation}
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-xs">
          {transliteration}
        </div>
      </div>
    );
  } else if (translation) {
    tooltipContent = (
      <div className="text-black dark:text-white text-sm">
        {translation}
      </div>
    );
  } else if (transliteration) {
    tooltipContent = (
      <div className="text-gray-500 dark:text-gray-400 text-sm">
        {transliteration}
      </div>
    );
  }
  
  return (
    <Tooltip 
      content={tooltipContent} 
      enabled={enabled && !!tooltipContent} 
      side="top" 
      offset={48}
    >
      <span
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ display: "inline" }}
      >
        {children}
      </span>
    </Tooltip>
  );
}

// ── ms range string "start-end" → { start, end } ────────────────────────────
function parseRange(r: string): { start: number; end: number } {
  const [start, end] = r.split("-").map(Number);
  return { start, end };
}

// Client-safe endpoints substituting the server-side infrastructure
async function fetchAyahTimestamps(surahId: number, verseNumber: number, reciter: string): Promise<string[] | null> {
  try {
    const formattedReciter = reciter.replace(/\s+/g, "_").replace(/'/g, "");
    const response = await fetch(
      `${BACKEND_BASE_URL}/api/audio/timestamps/ayah?surah=${surahId}&verse=${verseNumber}&reciter=${encodeURIComponent(formattedReciter)}`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchSurahAudioUrl(surahId: number, reciter: string): Promise<string | null> {
  try {
    const formattedReciter = reciter.replace(/\s+/g, "_").replace(/'/g, "");
    const response = await fetch(
      `${BACKEND_BASE_URL}/api/audio/url?surah=${surahId}&reciter=${encodeURIComponent(formattedReciter)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  } catch {
    return null;
  }
}

export function useAudioPlayback(surahId: number) {
  const { hoverRecitation, selectedReciter } = useApp();
  const [playingKey, setPlayingKey] = React.useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrent = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // Plays a slice [startMs, endMs) of the full surah audio file, stopping
  // itself at endMs since there's no standalone ayah/word audio file anymore.
  const playClip = (url: string, key: string, startMs: number, endMs: number) => {
    stopCurrent();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.currentTime = startMs / 1000;

    const onTimeUpdate = () => {
      if (audio.currentTime * 1000 >= endMs) {
        cleanup();
      }
    };
    const cleanup = () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.pause();
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setPlayingKey(null);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.play().catch(cleanup);
  };

  // Plays the whole ayah's slice of the surah's audio file.
  const playAyahClip = async (verseNumber: number, key: string) => {
    const words = await fetchAyahTimestamps(surahId, verseNumber, selectedReciter);
    if (!words || words.length === 0) {
      setPlayingKey(null);
      return;
    }
    const { start } = parseRange(words[0]);
    const { end } = parseRange(words[words.length - 1]);

    const url = await fetchSurahAudioUrl(surahId, selectedReciter);
    if (!url) {
      setPlayingKey(null);
      return;
    }
    
    const absoluteUrl = url.startsWith("http") ? url : new URL(url, window.location.origin).toString();
    playClip(absoluteUrl, key, start, end);
  };

  // Plays just one word's slice of the ayah, using its individual timestamp entry.
  const playWordClip = async (verseNumber: number, wordIndex: number, key: string) => {
    const words = await fetchAyahTimestamps(surahId, verseNumber, selectedReciter);
    const wordRange = words?.[wordIndex];
    if (!wordRange) {
      setPlayingKey(null);
      return;
    }
    const { start, end } = parseRange(wordRange);

    const url = await fetchSurahAudioUrl(surahId, selectedReciter);
    if (!url) {
      setPlayingKey(null);
      return;
    }
    
    const absoluteUrl = url.startsWith("http") ? url : new URL(url, window.location.origin).toString();
    playClip(absoluteUrl, key, start, end);
  };

  const playWordAudio = async (verseNumber: number, wordIndex: number) => {
    if (!hoverRecitation) return;
    const key = `word-${verseNumber}-${wordIndex}`;
    if (playingKey === key) return;
    setPlayingKey(key);
    await playWordClip(verseNumber, wordIndex, key);
  };

  const playVerseAudio = async (verseNumber: number) => {
    const key = `ayah-${verseNumber}`;
    if (playingKey === key) return;
    setPlayingKey(key);
    await playAyahClip(verseNumber, key);
  };

  const isPlaying = (key: string) => playingKey === key;

  return { playingKey, playWordAudio, playVerseAudio, isPlaying };
}

export const extractVerseNumberFromMarker = (glyph: string): number | null => {
  if (!glyph) return null;
  if (glyph.includes(':')) {
    const parts = glyph.split(':');
    const maybeVerse = parts[0];
    const num = parseInt(maybeVerse, 10);
    return isNaN(num) ? null : num;
  }
  const num = parseInt(glyph, 10);
  return isNaN(num) ? null : num;
};