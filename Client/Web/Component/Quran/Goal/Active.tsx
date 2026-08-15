import { Clock, Target, Trash2, MapPin } from "lucide-react";
import { cn } from "@/Library/utils";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { Progress_Ring } from "./Progress";
import type { Goal_Progress } from "./Types";

interface Active_Props {
  activeGoal: any;
  weekProgress: any[];
  totalMinutesRead: number;
  todayMinutes: number;
  todaySeconds?: number;
  todayPercentage: number;
  dayProgress: Goal_Progress | null;
  overallProgress: number;
  versesRead: number;
  totalVerses: number;
  currentSurah: any;
  currentAyah: number;
  currentJuz: number;
  currentPage: number;
  onDeleteGoal: () => void;
  onCreateNewGoal: () => void;
}

export function Active({
  activeGoal,
  totalMinutesRead,
  todayMinutes,
  todaySeconds = 0,
  todayPercentage,
  dayProgress,
  overallProgress,
  versesRead,
  totalVerses,
  currentSurah,
  currentAyah,
  currentJuz,
  currentPage,
  onDeleteGoal,
}: Active_Props) {
  const today = new Date();
  const endDate = activeGoal?.end_date ? new Date(activeGoal.end_date) : null;
  const daysRemaining = endDate
    ? Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000))
    : null;
  const dailyTarget = activeGoal?.daily_target || 0;

  const totalTodaySeconds = todayMinutes * 60 + todaySeconds;
  const targetSeconds = dailyTarget * 60;
  const remainingSeconds = Math.max(0, targetSeconds - totalTodaySeconds);

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes === 0) return `${secs}s`;
    return `${minutes}m ${secs}s`;
  };

  const isGoalCompleted = totalTodaySeconds >= targetSeconds && targetSeconds > 0;
  const ringValue =
    activeGoal?.goal_type === "time_based"
      ? todayPercentage
      : activeGoal?.goal_type === "khatm"
      ? overallProgress
      : dayProgress?.todayPercent || 0;
  const ringLabel =
    activeGoal?.goal_type === "time_based"
      ? !isGoalCompleted
        ? formatTimeRemaining(remainingSeconds)
        : "Done"
      : `${ringValue}%`;
  const ringSublabel =
    activeGoal?.goal_type === "time_based"
      ? "Left today"
      : dayProgress
      ? `Day ${dayProgress.dayNumber}`
      : "Overall";

  const subtitle =
    activeGoal?.goal_type === "time_based"
      ? `${dailyTarget} min / day`
      : activeGoal?.goal_type === "khatm"
      ? `Khatm${daysRemaining !== null ? ` · ${daysRemaining}d left` : ""}`
      : "Custom";

  if (!activeGoal) return null;

  return (
    <div className="space-y-4">
      {/* Hero ring + Current Position + stats */}
      <Container className="!p-5 sm:!p-7">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <Progress_Ring
            value={ringValue}
            size={150}
            strokeWidth={6}
            label={ringLabel}
            sublabel={ringSublabel}
            variant="segmented"
            segments={60}
          />
          <div className="flex-1 w-full space-y-3">
            <p className="text-xs text-muted-foreground text-center sm:text-left">{subtitle}</p>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Current Position</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Surah", value: currentSurah?.englishName || "Al-Fatihah" },
                { label: "Ayah", value: currentAyah || 1 },
                { label: "Juz", value: currentJuz || 1 },
                { label: "Page", value: currentPage || 1 },
              ].map((it) => (
                <Container key={it.label} className="!p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.label}</p>
                  <p className="font-semibold text-xs truncate mt-0.5">{it.value}</p>
                </Container>
              ))}
            </div>
            <Container className="!p-2 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-foreground/80" />
              <p className="text-xl font-bold tabular-nums leading-none">{totalMinutesRead}</p>
              <p className="text-[10px] mt-1 uppercase tracking-wider text-muted-foreground">Total min</p>
            </Container>
          </div>
        </div>
      </Container>

      {/* Khatm day */}
      {activeGoal.goal_type === "khatm" && dayProgress && (
        <Container className="!p-4 sm:!p-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-semibold">
              Day {dayProgress.dayNumber} / {dayProgress.totalDays}
            </span>
            <span className="text-xs font-bold">{dayProgress.todayPercent}%</span>
          </div>
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: 10 }).map((_, i) => {
              const filled = i < Math.round((dayProgress.todayPercent / 100) * 10);
              return (
                <div
                  key={i}
                  className={cn(
                    "h-2.5 flex-1 rounded-sm transition-colors duration-500",
                    filled ? "bg-foreground" : "bg-muted"
                  )}
                />
              );
            })}
          </div>
          <div className="flex gap-2 items-stretch">
            <Container className="!p-2.5 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">From</p>
              <p className="text-xs truncate font-medium">
                {dayProgress.startPos?.surahName || "Start"}
              </p>
            </Container>
            <div className="flex items-center text-muted-foreground">→</div>
            <Container className="!p-2.5 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">To</p>
              <p className="text-xs truncate font-medium">
                {dayProgress.endPos?.surahName || "End"}
                {dayProgress.endPos?.ayah ? ` (${dayProgress.endPos.ayah})` : ""}
              </p>
            </Container>
          </div>
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Overall Progress</span>
              <span className="text-xs font-bold tabular-nums">{overallProgress}%</span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 20 }).map((_, i) => {
                const filled = i < Math.round((overallProgress / 100) * 20);
                return (
                  <div
                    key={i}
                    className={cn("h-1.5 flex-1 rounded-sm", filled ? "bg-foreground" : "bg-muted")}
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
              {versesRead.toLocaleString()} / {totalVerses.toLocaleString()} verses
            </p>
          </div>
        </Container>
      )}

      {/* Delete CTA (replaces New Goal button) */}
      <Button
        onClick={onDeleteGoal}
        variant="secondary"
        fullWidth
        className="h-12 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete Goal
      </Button>
    </div>
  );
}
