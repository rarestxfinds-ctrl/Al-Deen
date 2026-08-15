import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@Web/Component/Layout/Index";
import { useAuth } from "@Web/Context/Auth";
import { useQuranGoals } from "@/Hook/Use-Quran-Goals";
import { useReadingProgress } from "@/Hook/Use-Reading-Progress";
import { supabase } from "@/Integration/supabase/client";
import { Container } from "@Web/Component/UI/Container";
import { Active } from "@Web/Component/Quran/Goal/Active";
import { Creation } from "@Web/Component/Quran/Goal/Creation";
import type { Goal_Progress } from "@Web/Component/Quran/Goal/Types";
import { useQuery } from "@tanstack/react-query";

const TOTAL_VERSES = 6236;

// ============================================================================
// Network Fetch Client Handler
// ============================================================================
async function fetchQuranCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/quran-corpus");
  if (!response.ok) throw new Error("Failed to stream Quran corpus database over the network");
  return response.json();
}

export default function Goal() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeGoal, weekProgress, isLoading: goalsLoading, createGoal, deleteGoal } = useQuranGoals();
  const { progress } = useReadingProgress();

  // 🌟 Ingest entire data block from the distributed backend network cache
  const { data: corpus, isLoading: isCorpusLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // 30 minutes client cache
  });

  const [showCreation, setShowCreation] = useState(false);
  const [totalMinutesRead, setTotalMinutesRead] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/Sign-Up");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !activeGoal) return;
    
    const fetchStats = async () => {
      try {
        const { data: allProgress } = await supabase
          .from("goal_progress")
          .select("minutes_read, seconds_read, date")
          .eq("goal_id", activeGoal.id);
        
        if (allProgress) {
          const total = allProgress.reduce((sum, p) => sum + ((p as any).minutes_read || 0), 0);
          setTotalMinutesRead(total);
          
          const today = new Date().toISOString().split("T")[0];
          const todayEntry = allProgress.find((p) => (p as any).date === today);
          
          if (todayEntry) {
            const minutes = (todayEntry as any).minutes_read || 0;
            const seconds = (todayEntry as any).seconds_read || 0;
            setTodayMinutes(minutes);
            setTodaySeconds(seconds);
          } else {
            setTodayMinutes(0);
            setTodaySeconds(0);
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    
    fetchStats();
  }, [user, activeGoal, weekProgress]);

  // Client-side mapping calculations based on active stream metrics
  const versesBeforeSurah = useMemo(() => {
    return (surahId: number): number => {
      if (!corpus?.surahs) return 0;
      return corpus.surahs
        .filter((s: any) => s.id < surahId)
        .reduce((sum: number, s: any) => sum + (s.numberOfAyahs || 0), 0);
    };
  }, [corpus]);

  const currentSurah = useMemo(() => {
    if (!progress || !corpus?.surahs) return null;
    return corpus.surahs.find((s: any) => s.id === progress.last_surah_id) || null;
  }, [progress, corpus]);

  const currentJuz = useMemo(() => {
    if (!progress) return 1;
    if (progress.last_juz_id) return progress.last_juz_id;
    if (corpus?.juzData) {
      const juzInfo = corpus.juzData.find((j: any) => j.surahs.some((s: any) => s.id === progress.last_surah_id));
      if (juzInfo) return juzInfo.juzNumber;
    }
    return 1;
  }, [progress, corpus]);

  const currentPage = progress?.last_page_id || 1;
  const currentAyah = progress?.last_ayah_id || 1;

  const versesRead = useMemo(() => {
    if (!progress) return 0;
    return versesBeforeSurah(progress.last_surah_id) + (progress.last_ayah_id || 0);
  }, [progress, versesBeforeSurah]);

  const overallProgress = Math.round((versesRead / TOTAL_VERSES) * 100);
  const dailyTarget = activeGoal?.daily_target;
  
  const totalTodaySeconds = (todayMinutes * 60) + todaySeconds;
  const targetSeconds = (dailyTarget || 0) * 60;
  const todayPercentage = targetSeconds > 0 ? Math.min(100, Math.round((totalTodaySeconds / targetSeconds) * 100)) : 0;

  const dayProgress = useMemo<Goal_Progress | null>(() => {
    if (!activeGoal || activeGoal.goal_type !== "khatm" || !activeGoal.target_duration || !corpus?.surahs) return null;

    const startDate = new Date(activeGoal.start_date);
    const today = new Date();
    const dayNumber = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / 86400000));
    const versesPerDay = Math.ceil(TOTAL_VERSES / activeGoal.target_duration);
    const dayStartVerse = (dayNumber - 1) * versesPerDay;
    const dayEndVerse = Math.min(dayNumber * versesPerDay, TOTAL_VERSES);

    const findPosition = (verseCount: number) => {
      let remaining = verseCount;
      for (const s of corpus.surahs) {
        if (remaining <= s.numberOfAyahs) {
          return { surahId: s.id, surahName: s.englishNameTransliteration || s.englishName, ayah: Math.max(1, remaining) };
        }
        remaining -= s.numberOfAyahs;
      }
      return { surahId: 114, surahName: "An-Nas", ayah: 6 };
    };

    const startPos = findPosition(dayStartVerse + 1);
    const endPos = findPosition(dayEndVerse);
    const todayVersesTarget = dayEndVerse - dayStartVerse;
    const completedToday = Math.max(0, versesRead - dayStartVerse);
    const todayPercent = Math.min(100, Math.round((completedToday / todayVersesTarget) * 100));

    return {
      dayNumber,
      totalDays: activeGoal.target_duration,
      startPos,
      endPos,
      todayVersesTarget,
      completedToday: Math.min(completedToday, todayVersesTarget),
      todayPercent,
    };
  }, [activeGoal, versesRead, corpus]);

  const handleDeleteGoal = async () => {
    if (activeGoal && window.confirm("Are you sure you want to delete this goal?")) {
      await deleteGoal(activeGoal.id);
    }
  };

  const handleCreateGoal = async (goalData: any) => {
    await createGoal(
      goalData.id,
      goalData.goal_type,
      goalData.frequency,
      goalData.daily_target,
      goalData.duration
    );
    setShowCreation(false);
  };

  if (authLoading || goalsLoading || isCorpusLoading) return null;

  if (!user) return null;

  if (activeGoal) {
    return (
      <Layout>
        <Active
          activeGoal={activeGoal}
          weekProgress={weekProgress}
          totalMinutesRead={totalMinutesRead}
          todayMinutes={todayMinutes}
          todaySeconds={todaySeconds}
          todayPercentage={todayPercentage}
          dayProgress={dayProgress}
          overallProgress={overallProgress}
          versesRead={versesRead}
          totalVerses={TOTAL_VERSES}
          currentSurah={currentSurah}
          currentAyah={currentAyah}
          currentJuz={currentJuz}
          currentPage={currentPage}
          onDeleteGoal={handleDeleteGoal}
          onCreateNewGoal={() => setShowCreation(true)}
        />
        {showCreation && (
          <Creation
            onCreateGoal={handleCreateGoal}
            onClose={() => setShowCreation(false)}
          />
        )}
      </Layout>
    );
  }

  return (
    <Layout>
      <Creation
        onCreateGoal={handleCreateGoal}
        onClose={() => navigate("/Quran")}
      />
    </Layout>
  );
}