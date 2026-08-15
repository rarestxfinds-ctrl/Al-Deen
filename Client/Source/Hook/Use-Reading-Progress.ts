import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/Integration/supabase/client";
import { useAuth } from "@Web/Context/Auth";

interface ReadingProgress {
  last_surah_id: number;
  last_ayah_id: number;
  last_juz_id: number | null;
  last_page_id: number | null;
}

export function useReadingProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!user) {
      // Load from localStorage for non-authenticated users
      const stored = localStorage.getItem("reading_progress");
      if (stored) {
        setProgress(JSON.parse(stored));
      }
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProgress({
          last_surah_id: data.last_surah_id,
          last_ayah_id: data.last_ayah_id,
          last_juz_id: data.last_juz_id,
          last_page_id: data.last_page_id,
        });
      }
    } catch (error) {
      console.error("Error fetching reading progress:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateProgress = useCallback(async (
    surahId: number,
    ayahId: number,
    juzId?: number,
    pageId?: number
  ) => {
    const newProgress = {
      last_surah_id: surahId,
      last_ayah_id: ayahId,
      last_juz_id: juzId || null,
      last_page_id: pageId || null,
    };

    if (!user) {
      // Save to localStorage for non-authenticated users
      localStorage.setItem("reading_progress", JSON.stringify(newProgress));
      setProgress(newProgress);
      return true;
    }

    try {
      const { data: existing } = await supabase
        .from("reading_progress")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("reading_progress")
          .update(newProgress)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("reading_progress").insert({
          user_id: user.id,
          ...newProgress,
        });

        if (error) throw error;
      }

      setProgress(newProgress);
      return true;
    } catch (error) {
      console.error("Error updating reading progress:", error);
      return false;
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    isLoading,
    updateProgress,
    refetch: fetchProgress,
  };
}