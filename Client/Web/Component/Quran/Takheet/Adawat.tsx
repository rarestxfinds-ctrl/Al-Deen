import React, { useRef } from "react";
import { useApp } from "@Web/Context/App";
import { Tooltip } from "@Web/Component/UI/Tooltip";
import type { Sifat_Mulahazat_Al_Kalimah } from "./Safhah/Anwaa";

const MASAR_QAIDAT_AL_KHADIM = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

export type Haql_Arabi = "Al-Arabiyyah" | "Al-Arabiyyah-A" | "Al-Arabiyyah-B";

export function getArabicField(quranFont: string): Haql_Arabi {
  switch (quranFont) {
    case "uthmani_v1":
      return "Al-Arabiyyah-A";
    case "uthmani_v2":
    case "uthmani_v4":
      return "Al-Arabiyyah-B";
    default:
      return "Al-Arabiyyah";
  }
}

export function pickArabicText<T extends Record<string, any>>(
  item: T,
  haql: Haql_Arabi
): string {
  if (!item) return "";
  
  if (item[haql]) return String(item[haql]);
  if (item["Al-Arabiyyah"]) return String(item["Al-Arabiyyah"]);
  
  if (haql === "Al-Arabiyyah-A" && item.Arabic_V1) return String(item.Arabic_V1);
  if (haql === "Al-Arabiyyah-B" && item.Arabic_V2) return String(item.Arabic_V2);
  if (item.Arabic) return String(item.Arabic);
  if (item.arabic) return String(item.arabic);

  return "";
}

/**
 * WordTooltip Component
 * Relies on the underlying Tooltip component's internal hover handling.
 * `enabled` / `Hal_Mufallat` is used only to check global user settings.
 */
export function WordTooltip(props: any) {
  const translation = props.translation ?? props.At_Tarjamah;
  const transliteration = props.transliteration ?? props.Al_Kitabah_As_Sawtiyyah;
  
  // Flag from global app settings (whether hover tooltips are enabled by user)
  const isFeatureEnabledInSettings = props.enabled ?? props.Hal_Mufallat ?? true;
  
  const onClick = props.onClick ?? props.Ind_An_Naqr;
  const children = props.children;

  let tooltipContent: React.ReactNode = null;
  
  if (translation && transliteration) {
    tooltipContent = (
      <div className="space-y-0.5 pointer-events-none select-none">
        <div className="text-black dark:text-white text-sm font-medium">
          {translation}
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-xs">
          {transliteration}
        </div>
      </div>
    );
  } else if (translation) {
    tooltipContent = (
      <div className="text-black dark:text-white text-sm font-medium pointer-events-none select-none">
        {translation}
      </div>
    );
  } else if (transliteration) {
    tooltipContent = (
      <div className="text-gray-500 dark:text-gray-400 text-sm pointer-events-none select-none">
        {transliteration}
      </div>
    );
  }
  
  const isEnabled = Boolean(isFeatureEnabledInSettings && tooltipContent);

  return (
    <Tooltip 
      content={tooltipContent} 
      enabled={isEnabled} 
      side="top" 
      offset={8}
    >
      <span
        onClick={onClick}
        className="inline-block cursor-pointer"
      >
        {children}
      </span>
    </Tooltip>
  );
}

function parseTimeSegment(segment: string): { startTime: number; endTime: number } {
  const [start, end] = segment.split("-").map(Number);
  return { startTime: start || 0, endTime: end || 0 };
}

async function fetchAyahTimestamps(
  surahId: number, 
  ayahNum: number, 
  reciter: string
): Promise<string[] | null> {
  try {
    const formattedReciter = reciter.replace(/\s+/g, "_").replace(/'/g, "");
    const res = await fetch(
      `${MASAR_QAIDAT_AL_KHADIM}/api/audio/timestamps/ayah?surah=${surahId}&verse=${ayahNum}&reciter=${encodeURIComponent(formattedReciter)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchSurahAudioUrl(surahId: number, reciter: string): Promise<string | null> {
  try {
    const formattedReciter = reciter.replace(/\s+/g, "_").replace(/'/g, "");
    const res = await fetch(
      `${MASAR_QAIDAT_AL_KHADIM}/api/audio/url?surah=${surahId}&reciter=${encodeURIComponent(formattedReciter)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

export function useAudioPlayback(surahId: number) {
  const { hoverRecitation, selectedReciter } = useApp();
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const playSegment = (url: string, key: string, startMs: number, endMs: number) => {
    stopCurrentAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.currentTime = startMs / 1000;

    const handleTimeUpdate = () => {
      if (audio.currentTime * 1000 >= endMs) {
        cleanup();
      }
    };

    const cleanup = () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.pause();
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setActiveKey(null);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.play().catch(cleanup);
  };

  const playAyahAudio = async (ayahNum: number) => {
    const key = `ayah-${surahId}-${ayahNum}`;
    if (activeKey === key) return;

    setActiveKey(key);
    const timestamps = await fetchAyahTimestamps(surahId, ayahNum, selectedReciter);
    if (!timestamps || timestamps.length === 0) {
      setActiveKey(null);
      return;
    }

    const { startTime } = parseTimeSegment(timestamps[0]);
    const { endTime } = parseTimeSegment(timestamps[timestamps.length - 1]);

    const audioUrl = await fetchSurahAudioUrl(surahId, selectedReciter);
    if (!audioUrl) {
      setActiveKey(null);
      return;
    }
    
    const fullUrl = audioUrl.startsWith("http") 
      ? audioUrl 
      : new URL(audioUrl, window.location.origin).toString();
      
    playSegment(fullUrl, key, startTime, endTime);
  };

  const playWordAudio = async (ayahNum: number, wordIndex: number) => {
    if (!hoverRecitation) return;
    const key = `word-${surahId}-${ayahNum}-${wordIndex}`;
    if (activeKey === key) return;

    setActiveKey(key);
    const timestamps = await fetchAyahTimestamps(surahId, ayahNum, selectedReciter);
    const wordSegment = timestamps?.[wordIndex];

    if (!wordSegment) {
      setActiveKey(null);
      return;
    }

    const { startTime, endTime } = parseTimeSegment(wordSegment);
    const audioUrl = await fetchSurahAudioUrl(surahId, selectedReciter);

    if (!audioUrl) {
      setActiveKey(null);
      return;
    }
    
    const fullUrl = audioUrl.startsWith("http") 
      ? audioUrl 
      : new URL(audioUrl, window.location.origin).toString();

    playSegment(fullUrl, key, startTime, endTime);
  };

  const isPlaying = (key: string) => activeKey === key;

  return { 
    activeKey, 
    playWordAudio, 
    playAyahAudio, 
    isPlaying 
  };
}

export const extractVerseNumberFromMarker = (marker: string): number | null => {
  if (!marker) return null;
  if (marker.includes(":")) {
    const parts = marker.split(":");
    const num = parseInt(parts[0], 10);
    return isNaN(num) ? null : num;
  }
  const num = parseInt(marker, 10);
  return isNaN(num) ? null : num;
};