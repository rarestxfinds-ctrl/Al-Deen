import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "Client/Component/Layout/Index";
import { useAuth } from "Client/Context/Auth";
import { useQuranGoals, GOAL_PRESETS, type GoalPreset } from "Client/Hook/Use-Quran-Goals";
import { useReadingProgress } from "Client/Hook/Use-Reading-Progress";
import { surahList, juzData } from "Server/API/Quran";
import { supabase } from "Client/Integration/supabase/client";
import { Loader2 } from "lucide-react";
import { Container } from "Client/Component/UI/Container";
import { Button } from "Client/Component/UI/Button";
import { Active } from "Client/Component/Quran/Goal/Active";
import { Creation } from "Client/Component/Quran/Goal/Creation";
import type { Goal_Progress } from "Client/Component/Quran/Goal/Types";

function versesBeforeSurah(surahId: number): number {
  return surahList.filter(s => s.id < surahId).reduce((sum, s) => sum + s.numberOfAyahs, 0);
}

const TOTAL_VERSES = 6236;

export default function Goal() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeGoal, weekProgress, isLoading: goalsLoading, createGoal, deleteGoal } = useQuranGoals();
  const { progress } = useReadingProgress();

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

  if (authLoading || goalsLoading) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Container className="!p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Container>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const currentSurah = progress ? surahList.find((s) => s.id === progress.last_surah_id) : null;
  const currentJuz = progress?.last_juz_id || (progress ? juzData.find(j => j.surahs.some(s => s.id === progress.last_surah_id))?.juzNumber : null) || 1;
  const currentPage = progress?.last_page_id || 1;
  const currentAyah = progress?.last_ayah_id || 1;

  const versesRead = progress ? versesBeforeSurah(progress.last_surah_id) + (progress.last_ayah_id || 0) : 0;
  const overallProgress = Math.round((versesRead / TOTAL_VERSES) * 100);
  const dailyTarget = activeGoal?.daily_target;
  
  const totalTodaySeconds = (todayMinutes * 60) + todaySeconds;
  const targetSeconds = (dailyTarget || 0) * 60;
  const todayPercentage = targetSeconds > 0 ? Math.min(100, Math.round((totalTodaySeconds / targetSeconds) * 100)) : 0;

  const getDayProgress = (): Goal_Progress | null => {
    if (!activeGoal || activeGoal.goal_type !== "khatm" || !activeGoal.target_duration) return null;

    const startDate = new Date(activeGoal.start_date);
    const today = new Date();
    const dayNumber = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / 86400000));
    const versesPerDay = Math.ceil(TOTAL_VERSES / activeGoal.target_duration);
    const dayStartVerse = (dayNumber - 1) * versesPerDay;
    const dayEndVerse = Math.min(dayNumber * versesPerDay, TOTAL_VERSES);

    const findPosition = (verseCount: number) => {
      let remaining = verseCount;
      for (const s of surahList) {
        if (remaining <= s.numberOfAyahs) {
          return { surahId: s.id, surahName: s.englishName, ayah: Math.max(1, remaining) };
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
  };

  const dayProgress = getDayProgress();

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