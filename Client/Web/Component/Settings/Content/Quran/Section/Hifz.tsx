import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@Web/Context/App";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";
import { ArrowLeft, Check } from "lucide-react";

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

// Dynamic types matching the updated network layout schema
export interface SurahMetadata {
  id: number;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  surahFontName: string;
}

export interface UnifiedCorpusResponse {
  surahs: SurahMetadata[];
}

export interface VerseData {
  verseNumber: number;
  words: string[];
}

export interface SurahDetailsResponse {
  id: number;
  verses: VerseData[];
}

// Client-safe async fetch implementations
async function fetchQuranCorpus(): Promise<UnifiedCorpusResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to pull unified surah list metadata");
  return response.json();
}

async function fetchSurahVerses(surahId: number): Promise<SurahDetailsResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/surah/${surahId}?fontType=Standard`);
  if (!response.ok) throw new Error(`Failed to pull verses for surah: ${surahId}`);
  return response.json();
}

// Get stroke color based on progress
const getStrokeColor = (progress: number, completed: boolean): string => {
  if (completed) return "#10b981";
  if (progress >= 0.75) return "#10b981";
  if (progress >= 0.5) return "#3b82f6";
  if (progress >= 0.25) return "#eab308";
  return "#ef4444";
};

// Get text color for percentage (same ranges)
const getTextColor = (progress: number, completed: boolean): string => {
  if (completed) return "#10b981";
  if (progress >= 0.75) return "#10b981";
  if (progress >= 0.5) return "#3b82f6";
  if (progress >= 0.25) return "#eab308";
  return "#ef4444";
};

// Progress Circle Component
const ProgressCircle = ({
  progress,
  size = 40,
  strokeWidth = 4,
  onClick,
  completed = false,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  onClick?: () => void;
  completed?: boolean;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const showPercentage = progress > 0 && progress < 1;
  const percentValue = Math.round(progress * 100);
  const strokeColor = getStrokeColor(progress, completed);
  const textColor = getTextColor(progress, completed);

  return (
    <div
      className="relative inline-flex items-center justify-center cursor-pointer group/circle"
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Inner filled circle – white default, black on hover */}
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="white"
          className="group-hover/circle:fill-black transition-colors"
        />
        {/* Background stroke (unfilled) – black default, white on hover */}
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke="black"
          strokeWidth={strokeWidth}
          className="group-hover/circle:stroke-white transition-colors"
        />
        {/* Progress stroke – dynamic color, NO hover change */}
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {completed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check
            size={size * 0.5}
            stroke="black"
            strokeWidth={3}
            className="group-hover/circle:stroke-white transition-colors"
          />
        </div>
      )}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color: textColor }}>
            {percentValue}%
          </span>
        </div>
      )}
    </div>
  );
};

function getNonMarkerWordCount(verse: any): number {
  if (!verse?.words) return 0;
  return verse.words.length - 1;
}

type View = "surahs" | "verses" | "words";

export function Hifz() {
  const { hifz } = useApp();
  const [currentView, setCurrentView] = useState<View>("surahs");
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [selectedVerseNumber, setSelectedVerseNumber] = useState<number | null>(null);

  // Unified global corpus query loop substitution
  const { data: corpusData } = useQuery({
    queryKey: ["quranCorpusMetadata"],
    queryFn: fetchQuranCorpus,
    staleTime: 1000 * 60 * 60,
  });

  const surahList = useMemo(() => corpusData?.surahs || [], [corpusData]);

  // Lazy load verses details conditionally based on current structural layer depth
  const { data: detailsData, isLoading } = useQuery({
    queryKey: ["surahVersesData", selectedSurahId],
    queryFn: () => fetchSurahVerses(selectedSurahId!),
    enabled: !!selectedSurahId,
    staleTime: 1000 * 60 * 15,
  });

  const [surahCache, setSurahCache] = useState<Record<number, any>>({});
  
  useEffect(() => {
    if (selectedSurahId && detailsData && !isLoading) {
      setSurahCache(prev => ({ ...prev, [selectedSurahId]: detailsData }));
    }
  }, [selectedSurahId, detailsData, isLoading]);

  const getVerseProgress = useCallback((surahId: number, verseNum: number, verse: any): number => {
    const totalWords = getNonMarkerWordCount(verse);
    if (totalWords === 0) return 1;
    let completed = 0;
    for (let i = 0; i < totalWords; i++) {
      if (hifz.isWordCompleted(surahId, verseNum, i)) completed++;
    }
    return completed / totalWords;
  }, [hifz]);

  const getSurahProgress = useCallback((surahId: number): { progress: number; completed: boolean } => {
    const data = surahCache[surahId];
    if (!data?.verses) return { progress: 0, completed: false };
    let completedVerses = 0;
    for (let i = 0; i < data.verses.length; i++) {
      const verseNum = i + 1;
      const prog = getVerseProgress(surahId, verseNum, data.verses[i]);
      if (prog === 1) completedVerses++;
    }
    const prog = data.verses.length === 0 ? 0 : completedVerses / data.verses.length;
    return { progress: prog, completed: prog === 1 };
  }, [surahCache, getVerseProgress]);

  // Helper: mark all words in a verse as completed
  const markAllWordsInVerse = (surahId: number, verseNum: number, verse: any) => {
    const totalWords = getNonMarkerWordCount(verse);
    for (let i = 0; i < totalWords; i++) {
      if (!hifz.isWordCompleted(surahId, verseNum, i)) {
        hifz.markWordCompleted(surahId, verseNum, i);
      }
    }
  };

  // Helper: mark all verses in a surah as completed
  const markAllVersesInSurah = (surahId: number) => {
    const data = surahCache[surahId];
    if (!data?.verses) return;
    for (let i = 0; i < data.verses.length; i++) {
      const verseNum = i + 1;
      markAllWordsInVerse(surahId, verseNum, data.verses[i]);
    }
  };

  // Surah circle click: if completed -> reset, else mark all words
  const handleSurahClick = (surahId: number, surahName: string) => {
    const { completed } = getSurahProgress(surahId);
    if (completed) {
      if (window.confirm(`Reset ALL memorization for ${surahName}?`)) {
        hifz.resetSurah(surahId);
        setSurahCache(prev => ({ ...prev }));
      }
    } else {
      if (window.confirm(`Mark all verses of ${surahName} as memorized?`)) {
        markAllVersesInSurah(surahId);
        setSurahCache(prev => ({ ...prev }));
      }
    }
  };

  // Verse circle click: if completed -> reset, else mark all words in that verse
  const handleVerseClick = (surahId: number, verseNum: number, surahName: string, verse: any) => {
    const progress = getVerseProgress(surahId, verseNum, verse);
    const completed = progress === 1;
    if (completed) {
      if (window.confirm(`Reset memorization for verse ${verseNum} of ${surahName}?`)) {
        hifz.resetVerse(surahId, verseNum);
        setSurahCache(prev => ({ ...prev }));
      }
    } else {
      if (window.confirm(`Mark verse ${verseNum} of ${surahName} as memorized?`)) {
        markAllWordsInVerse(surahId, verseNum, verse);
        setSurahCache(prev => ({ ...prev }));
      }
    }
  };

  const handleToggleWord = (surahId: number, verseNum: number, wordIndex: number, isCompleted: boolean) => {
    if (isCompleted) hifz.unmarkWordCompleted(surahId, verseNum, wordIndex);
    else hifz.markWordCompleted(surahId, verseNum, wordIndex);
  };

  const goToSurahs = () => { setCurrentView("surahs"); setSelectedSurahId(null); setSelectedVerseNumber(null); };
  
  const goToVerses = async (surahId: number) => {
    setSelectedSurahId(surahId);
    setCurrentView("verses");
    setSelectedVerseNumber(null);
  };
  
  const goToWords = (surahId: number, verseNum: number) => { 
    setSelectedSurahId(surahId); 
    setSelectedVerseNumber(verseNum); 
    setCurrentView("words"); 
  };

  // Render Surah list
  const renderSurahs = () => (
    <div className="space-y-3">
      {surahList.map((surah: SurahMetadata) => {
        const { progress, completed } = getSurahProgress(surah.id);
        return (
          <Card
            key={surah.id}
            className="cursor-pointer transition-all duration-200 group bg-card"
            onClick={() => goToVerses(surah.id)}
          >
            <div className="flex items-center gap-4 p-4">
              <ProgressCircle progress={progress} size={50} strokeWidth={5} completed={completed}
                onClick={(e) => { e.stopPropagation(); handleSurahClick(surah.id, surah.englishName); }} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg text-foreground [.high-contrast_&]:group-hover:text-white transition-colors">
                  {surah.englishName}
                </h3>
                <p className="text-sm text-foreground [.high-contrast_&]:group-hover:text-white transition-colors">
                  {surah.englishNameTranslation} <span className="text-muted-foreground [.high-contrast_&]:group-hover:text-white/70">#{surah.id}</span>
                </p>
                <p className="text-xs text-muted-foreground [.high-contrast_&]:group-hover:text-white/70 transition-colors mt-0.5">
                  {surah.revelationType === "Meccan" ? "Meccan" : "Medinan"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-surah text-lg sm:text-xl text-foreground [.high-contrast_&]:group-hover:text-white transition-colors" dir="rtl">
                  {surah.surahFontName}
                </p>
                <p className="text-xs text-muted-foreground [.high-contrast_&]:group-hover:text-white/70 transition-colors">
                  {surah.numberOfAyahs} Ayahs
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  // Render Verses – Arabic name above ayah count
  const renderVerses = () => {
    const data = surahCache[selectedSurahId!];
    const surah = surahList.find((s: SurahMetadata) => s.id === selectedSurahId);
    if (!data?.verses) return <div className="text-center py-8 text-foreground">Loading verses...</div>;
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={goToSurahs} className="gap-1">
              <ArrowLeft size={16} /> Back to Surahs
            </Button>
            <span className="font-bold text-xl text-foreground">{surah?.englishName}</span>
          </div>
          <div className="text-right">
            <p className="font-surah text-xl text-foreground transition-colors" dir="rtl">
              {surah?.surahFontName}
            </p>
            <p className="text-xs text-muted-foreground">{surah?.numberOfAyahs} Ayahs</p>
          </div>
        </div>
        <div className="space-y-3">
          {data.verses.map((verse: any, idx: number) => {
            const verseNum = idx + 1;
            const progress = getVerseProgress(selectedSurahId!, verseNum, verse);
            const completed = progress === 1;
            return (
              <Card
                key={verseNum}
                className="cursor-pointer transition-all duration-200 group bg-card"
                onClick={() => goToWords(selectedSurahId!, verseNum)}
              >
                <div className="flex items-center gap-4 p-4">
                  <ProgressCircle progress={progress} size={40} strokeWidth={4} completed={completed}
                    onClick={(e) => { e.stopPropagation(); handleVerseClick(selectedSurahId!, verseNum, surah?.englishName || '', verse); }} />
                  <div className="flex-1">
                    <div className="font-medium text-foreground [.high-contrast_&]:group-hover:text-white transition-colors">
                      {verseNum}
                    </div>
                    <div className="text-right text-lg font-arabic mt-1 text-foreground [.high-contrast_&]:group-hover:text-white transition-colors" dir="rtl">
                      {verse.words?.slice(0, -1).join(' ') || ''}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Words
  const renderWords = () => {
    const data = surahCache[selectedSurahId!];
    const surah = surahList.find((s: SurahMetadata) => s.id === selectedSurahId);
    const verse = data?.verses?.[selectedVerseNumber! - 1];
    if (!verse) return <div className="text-center py-8 text-foreground">Loading words...</div>;
    const words = verse.words?.slice(0, -1) || [];
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Button variant="default" size="sm" onClick={() => goToVerses(selectedSurahId!)} className="gap-1">
            <ArrowLeft size={16} /> Back to Verses
          </Button>
          <span className="font-bold text-xl text-foreground">{surah?.englishName} - {selectedVerseNumber}</span>
        </div>
        <div className="space-y-2">
          {words.map((word: string, idx: number) => {
            const isCompleted = hifz.isWordCompleted(selectedSurahId!, selectedVerseNumber!, idx);
            const wordProgress = isCompleted ? 1 : 0;
            return (
              <Card key={idx} className="p-4 flex items-center gap-4 transition-all duration-200 group bg-card">
                <ProgressCircle progress={wordProgress} size={32} strokeWidth={3} completed={isCompleted}
                  onClick={() => handleToggleWord(selectedSurahId!, selectedVerseNumber!, idx, isCompleted)} />
                <div className="flex-1 text-right text-xl font-arabic text-foreground [.high-contrast_&]:group-hover:text-white transition-colors" dir="rtl">
                  {word}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {currentView === "surahs" && renderSurahs()}
      {currentView === "verses" && renderVerses()}
      {currentView === "words" && renderWords()}
    </div>
  );
}