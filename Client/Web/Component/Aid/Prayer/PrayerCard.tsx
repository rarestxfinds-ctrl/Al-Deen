import { cn } from "@/Library/utils";
import { formatTime } from "./Utility";
import { Container } from "@Web/Component/UI/Container";
import type { PrayerTimesData, MainPrayer, PrayerSettings } from "./Types";

interface PrayerCardProps {
  prayer: MainPrayer;
  timings: PrayerTimesData;
  settings: PrayerSettings;
  isNext: boolean;
}

export function PrayerCard({ prayer, timings, settings, isNext }: PrayerCardProps) {
  return (
    <Container
      className={cn(
        "!p-4 transition-all",
        isNext && "!bg-black dark:!bg-white !border-white dark:!border-black !text-white dark:!text-black"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={cn("font-medium", isNext && "text-white dark:text-black")}>{prayer}</p>
        </div>
        <p className={cn("text-lg font-semibold tabular-nums", isNext && "text-white dark:text-black")}>
          {formatTime(timings[prayer], settings.timeFormat)}
        </p>
      </div>
    </Container>
  );
}