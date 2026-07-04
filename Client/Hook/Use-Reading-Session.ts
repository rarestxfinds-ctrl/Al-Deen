import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "Client/Integration/supabase/client";
import { useAuth } from "Client/Context/Auth";
import { useApp } from "Client/Context/App";

export function useReadingSession() {
  const { user } = useAuth();
  const { readingIdleTimeout, readingSaveInterval, readingTrackingEnabled } = useApp();
  
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const accumulatedSecondsRef = useRef(0);
  
  const IDLE_TIMEOUT = (readingIdleTimeout || 60) * 1000;
  const SAVE_INTERVAL = (readingSaveInterval || 10) * 1000;
  const isTrackingEnabled = readingTrackingEnabled !== false;

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!isActive && isTrackingEnabled) setIsActive(true);
  }, [isActive, isTrackingEnabled]);

  const startSession = useCallback(() => {
    if (!isTrackingEnabled) return;
    
    startTimeRef.current = Date.now();
    accumulatedSecondsRef.current = 0;
    setIsActive(true);
    setSessionMinutes(0);
    setSessionSeconds(0);
  }, [isTrackingEnabled]);

  const stopSession = useCallback(async (): Promise<number> => {
    if (!startTimeRef.current || !isTrackingEnabled) return 0;

    const elapsedSeconds = accumulatedSecondsRef.current + (isActive ? (Date.now() - startTimeRef.current) / 1000 : 0);
    const totalSeconds = Math.round(elapsedSeconds);
    
    startTimeRef.current = null;
    setIsActive(false);
    setSessionMinutes(0);
    setSessionSeconds(0);
    accumulatedSecondsRef.current = 0;

    return totalSeconds;
  }, [isActive, isTrackingEnabled]);

  const saveSecondsToGoal = useCallback(async (goalId: string, seconds: number) => {
    if (!user || seconds <= 0 || !isTrackingEnabled) return;

    const today = new Date().toISOString().split("T")[0];

    try {
      const { data: existing, error: fetchError } = await supabase
        .from("goal_progress")
        .select("*")
        .eq("goal_id", goalId)
        .eq("date", today)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing progress:", fetchError);
        return;
      }

      const currentSeconds = existing 
        ? ((existing.minutes_read || 0) * 60) + (existing.seconds_read || 0)
        : 0;
      
      const newTotalSeconds = currentSeconds + seconds;
      const newMinutes = Math.floor(newTotalSeconds / 60);
      const newSeconds = newTotalSeconds % 60;

      if (existing) {
        const { error: updateError } = await supabase
          .from("goal_progress")
          .update({
            minutes_read: newMinutes,
            seconds_read: newSeconds,
            completed: true,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Error updating goal progress:", updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from("goal_progress")
          .insert({
            goal_id: goalId,
            user_id: user.id,
            date: today,
            completed: true,
            minutes_read: newMinutes,
            seconds_read: newSeconds,
          });

        if (insertError) {
          console.error("Error inserting goal progress:", insertError);
        }
      }
    } catch (error) {
      console.error("Error saving reading seconds:", error);
    }
  }, [user, isTrackingEnabled]);

  const saveMinutesToGoal = useCallback(async (goalId: string, minutes: number) => {
    await saveSecondsToGoal(goalId, minutes * 60);
  }, [saveSecondsToGoal]);

  useEffect(() => {
    if (!startTimeRef.current || !isTrackingEnabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;

      if (idleTime > IDLE_TIMEOUT) {
        if (isActive) {
          accumulatedSecondsRef.current += (now - (startTimeRef.current || now)) / 1000;
          startTimeRef.current = now;
          setIsActive(false);
        }
        return;
      }

      if (!isActive) {
        startTimeRef.current = now;
        setIsActive(true);
      }

      const totalSeconds = accumulatedSecondsRef.current + (now - (startTimeRef.current || now)) / 1000;
      setSessionMinutes(Math.floor(totalSeconds / 60));
      setSessionSeconds(Math.floor(totalSeconds % 60));
    }, SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [isActive, IDLE_TIMEOUT, SAVE_INTERVAL, isTrackingEnabled]);

  useEffect(() => {
    if (!isTrackingEnabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isActive && startTimeRef.current) {
          accumulatedSecondsRef.current += (Date.now() - startTimeRef.current) / 1000;
          startTimeRef.current = Date.now();
          setIsActive(false);
        }
      } else {
        markActivity();
        if (startTimeRef.current) {
          startTimeRef.current = Date.now();
          setIsActive(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("scroll", markActivity);
    window.addEventListener("mousemove", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("click", markActivity);
    window.addEventListener("touchstart", markActivity);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("click", markActivity);
      window.removeEventListener("touchstart", markActivity);
    };
  }, [isActive, markActivity, isTrackingEnabled]);

  return {
    sessionMinutes,
    sessionSeconds,
    isActive,
    startSession,
    stopSession,
    saveMinutesToGoal,
    saveSecondsToGoal,
    markActivity,
    isTrackingEnabled,
  };
}