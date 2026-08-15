import { useState, useEffect } from "react";
import { Card } from "@Web/Component/UI/Card";
import { Target } from "lucide-react";

interface GoalCardProps {
  surahList: any[];
  totalVersesCount: number;
}

const MIFTAH_HADAF_AL_QIRA_AH = "Hadaf_Al_Qira_ah";

export const GoalCard = ({ surahList, totalVersesCount }: GoalCardProps) => {
  const [completedAyahs, setCompletedAyahs] = useState<number>(0);
  const [dailyTarget, setDailyTarget] = useState<number>(10);

  useEffect(() => {
    try {
      const storedProgress = localStorage.getItem(MIFTAH_HADAF_AL_QIRA_AH);
      if (storedProgress) {
        const parsed = JSON.parse(storedProgress);
        setCompletedAyahs(parsed.completedAyahs || 0);
        setDailyTarget(parsed.dailyTarget || 10);
      }
    } catch (e) {
      console.warn("Failed to load daily goal state:", e);
    }
  }, []);

  const progressPercentage = Math.min(
    100,
    Math.round((completedAyahs / (dailyTarget || 1)) * 100)
  );

  return (
    <Card className="flex-1 min-w-[280px] p-4 bg-card flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Daily Goal
            </p>
            <p className="text-xs font-semibold">
              {completedAyahs} / {dailyTarget} Ayahs
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-primary">
          {progressPercentage}%
        </span>
      </div>

      <div className="w-full bg-secondary/20 h-2 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </Card>
  );
};