import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/Integration/supabase/client";
import { useAuth } from "@/Context/Auth";
import { toast } from "@/Hook/Use-Toast";

export interface QuranGoal {
  id: string;
  user_id: string;
  goal_type: string;
  preset: string | null;
  frequency: string;
  target_duration: number | null;
  daily_target: number | null;
  start_date: string;
  end_date: string | null;
  current_streak: number;
  longest_streak: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  minutes_read: number;
  verses_read: number;
  created_at: string;
}

export interface GoalPreset {
  id: string;
  title: string;
  description: string;
  goal_type: string;
  daily_target?: number;
  duration?: number;
  icon: string;
  recommended?: boolean;
}

export const GOAL_PRESETS: GoalPreset[] = [
  {
    id: "ten_minutes",
    title: "Read 10 Minutes A Day",
    description: "A Simple Beginner-Friendly Goal",
    goal_type: "time_based",
    daily_target: 10,
    icon: "clock",
    recommended: true,
  },
  {
    id: "thirty_days",
    title: "Read The Quran In 30 Days",
    description: "A Classic Khatm Goal. Read 1 Juz A Day",
    goal_type: "khatm",
    duration: 30,
    icon: "book",
  },
  {
    id: "one_year",
    title: "Read The Quran In A Year",
    description: "Read The Quran At Your Own Pace Over The Next Year",
    goal_type: "khatm",
    duration: 365,
    icon: "calendar",
  },
  {
    id: "custom",
    title: "Custom",
    description: "Set A Custom Goal That Suits You",
    goal_type: "custom",
    icon: "settings",
  },
];

export function useQuranGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<QuranGoal[]>([]);
  const [activeGoal, setActiveGoal] = useState<QuranGoal | null>(null);
  const [weekProgress, setWeekProgress] = useState<GoalProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setActiveGoal(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("quran_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const goalsData = (data || []) as QuranGoal[];
      setGoals(goalsData);
      setActiveGoal(goalsData.find((g) => g.is_active) || null);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchWeekProgress = useCallback(async () => {
    if (!user || !activeGoal) {
      setWeekProgress([]);
      return;
    }

    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      const { data, error } = await supabase
        .from("goal_progress")
        .select("*")
        .eq("goal_id", activeGoal.id)
        .gte("date", weekStart.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) throw error;
      setWeekProgress((data || []) as GoalProgress[]);
    } catch (error) {
      console.error("Error fetching week progress:", error);
    }
  }, [user, activeGoal]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    fetchWeekProgress();
  }, [fetchWeekProgress]);

  const createGoal = async (
    preset: string,
    goalType: string,
    frequency: string = "daily",
    dailyTarget?: number,
    duration?: number
  ) => {
    if (!user) return null;

    try {
      // Deactivate existing goals
      if (activeGoal) {
        await supabase
          .from("quran_goals")
          .update({ is_active: false })
          .eq("id", activeGoal.id);
      }

      const startDate = new Date().toISOString().split("T")[0];
      let endDate: string | null = null;
      
      if (duration) {
        const end = new Date();
        end.setDate(end.getDate() + duration);
        endDate = end.toISOString().split("T")[0];
      }

      const { data, error } = await supabase
        .from("quran_goals")
        .insert({
          user_id: user.id,
          goal_type: goalType,
          preset,
          frequency,
          daily_target: dailyTarget || null,
          target_duration: duration || null,
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const newGoal = data as QuranGoal;
      setGoals((prev) => [newGoal, ...prev.map((g) => ({ ...g, is_active: false }))]);
      setActiveGoal(newGoal);
      toast({ title: "Goal created successfully!" });
      return newGoal;
    } catch (error: any) {
      console.error("Error creating goal:", error);
      const msg = error?.message || error?.error_description || "Failed to create goal";
      toast({ title: "Failed to create goal", description: msg, variant: "destructive" });
      return null;
    }
  };

  const markTodayComplete = async () => {
    if (!user || !activeGoal) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data: existing } = await supabase
        .from("goal_progress")
        .select("*")
        .eq("goal_id", activeGoal.id)
        .eq("date", today)
        .single();

      if (existing) {
        // Toggle completion
        const { error } = await supabase
          .from("goal_progress")
          .update({ completed: !(existing as GoalProgress).completed })
          .eq("id", (existing as GoalProgress).id);

        if (error) throw error;
      } else {
        // Create new progress entry
        const { error } = await supabase
          .from("goal_progress")
          .insert({
            goal_id: activeGoal.id,
            user_id: user.id,
            date: today,
            completed: true,
          });

        if (error) throw error;
      }

      // Update streak
      const newStreak = activeGoal.current_streak + 1;
      await supabase
        .from("quran_goals")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, activeGoal.longest_streak),
        })
        .eq("id", activeGoal.id);

      fetchGoals();
      fetchWeekProgress();
      toast({ title: "Progress updated!" });
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({ title: "Failed to update progress", variant: "destructive" });
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("quran_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      if (activeGoal?.id === goalId) {
        setActiveGoal(null);
      }
      toast({ title: "Goal deleted" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({ title: "Failed to delete goal", variant: "destructive" });
    }
  };

  return {
    goals,
    activeGoal,
    weekProgress,
    isLoading,
    createGoal,
    markTodayComplete,
    deleteGoal,
    refetch: fetchGoals,
  };
}
