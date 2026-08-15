export interface Goal_Progress {
  dayNumber: number;
  totalDays: number;
  startPos: { surahId: number; surahName: string; ayah: number };
  endPos: { surahId: number; surahName: string; ayah: number };
  todayVersesTarget: number;
  completedToday: number;
  todayPercent: number;
}

export interface Goal_Stats {
  totalMinutesRead: number;
  todayMinutes: number;
  todayPercentage: number;
  versesRead: number;
  overallProgress: number;
  currentSurah: any;
  currentAyah: number;
  currentJuz: number;
  currentPage: number;
}