import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Repeat,
  Calendar,
  Clock,
  Book,
  Settings,
  Star,
} from "lucide-react";
import { cn } from "@/Library/utils";
import { Container } from "@Web/Component/UI/Container";
import { Button } from "@Web/Component/UI/Button";
import { Input } from "@Web/Component/UI/Input";
import { Label } from "@Web/Component/UI/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@Web/Component/UI/Select";
import { GOAL_PRESETS, type GoalPreset } from "@/Hook/Use-Quran-Goals";
import { useQuery } from "@tanstack/react-query";

const iconMap: Record<string, any> = {
  clock: Clock,
  book: Book,
  calendar: Calendar,
  settings: Settings,
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TOTAL_VERSES = 6236;
const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchQuranCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/quran-corpus`);
  if (!response.ok) throw new Error("Failed to load unified Quran corpus data map");
  return response.json();
}

interface Creation_Props {
  onCreateGoal: (goal: any) => Promise<void>;
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3;

export function Creation({ onCreateGoal, onClose }: Creation_Props) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedPreset, setSelectedPreset] = useState<GoalPreset | null>(null);
  const [frequency, setFrequency] = useState<"daily" | "duration">("daily");
  const [isCreating, setIsCreating] = useState(false);

  const [customGoalType, setCustomGoalType] = useState<"time_based" | "khatm" | "verses">("time_based");
  const [customDailyTarget, setCustomDailyTarget] = useState(15);
  const [customDuration, setCustomDuration] = useState(30);
  const [customVersesPerDay, setCustomVersesPerDay] = useState(20);

  const totalSteps = 3;
  const isCustom = selectedPreset?.id === "custom";

  // Ingest structural database maps over unified reactive client context query cache
  const { data: corpus, isLoading: isCorpusLoading } = useQuery({
    queryKey: ["quranCorpusBackend"],
    queryFn: fetchQuranCorpusFromBackend,
    staleTime: 1000 * 60 * 30,
  });

  const surahList = useMemo(() => corpus?.surahs || [], [corpus]);

  const handleCreate = async () => {
    if (!selectedPreset) return;
    setIsCreating(true);
    try {
      if (isCustom) {
        await onCreateGoal({
          id: "custom",
          goal_type: customGoalType,
          frequency,
          daily_target:
            customGoalType === "time_based"
              ? customDailyTarget
              : customGoalType === "verses"
              ? customVersesPerDay
              : undefined,
          duration:
            customGoalType === "khatm" || customGoalType === "verses"
              ? customDuration
              : undefined,
        });
      } else {
        await onCreateGoal({
          id: selectedPreset.id,
          goal_type: selectedPreset.goal_type,
          frequency,
          daily_target: selectedPreset.daily_target,
          duration: selectedPreset.duration,
        });
      }
      setStep(1);
      setSelectedPreset(null);
      onClose();
    } catch (error) {
      console.error("Error creating goal:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const generateSchedule = () => {
    if (!selectedPreset || surahList.length === 0) return [];
    const schedule: Array<{ day: string; task: string }> = [];
    const today = new Date();
    let days: number;
    let versesPerDay = 0;
    let dailyMinutes: number | undefined;

    if (isCustom) {
      days = customGoalType === "time_based" ? 7 : customDuration;
      versesPerDay =
        customGoalType === "khatm"
          ? Math.ceil(TOTAL_VERSES / customDuration)
          : customGoalType === "verses"
          ? customVersesPerDay
          : 0;
      dailyMinutes = customGoalType === "time_based" ? customDailyTarget : undefined;
    } else {
      days = selectedPreset.duration || 7;
      versesPerDay = selectedPreset.goal_type === "khatm" ? Math.ceil(TOTAL_VERSES / days) : 0;
      dailyMinutes = selectedPreset.daily_target;
    }

    let currentVerse = 1;
    const findSurah = (v: number) => {
      let remaining = v;
      for (const s of surahList) {
        if (remaining <= s.numberOfAyahs) return s;
        remaining -= s.numberOfAyahs;
      }
      return surahList[surahList.length - 1];
    };

    for (let i = 0; i < Math.min(days, 6); i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayName = DAYS_OF_WEEK[d.getDay()];
      if (dailyMinutes) {
        schedule.push({ day: dayName, task: `${dailyMinutes} min` });
      } else if (versesPerDay > 0) {
        const startSurah = findSurah(currentVerse);
        const endVerse = Math.min(currentVerse + versesPerDay, TOTAL_VERSES);
        const endSurah = findSurah(endVerse);
        schedule.push({
          day: dayName,
          task: `${startSurah?.englishName || "Surah"} → ${endSurah?.englishName || "Surah"}`,
        });
        currentVerse = endVerse;
      }
    }
    if (days > 6) schedule.push({ day: `+${days - 6}d`, task: "more" });
    return schedule;
  };

  const canAdvance =
    (step === 1 && !!selectedPreset) ||
    step === 2 ||
    step === 3;

  const stepTitle =
    step === 1 ? "Choose a Goal" : step === 2 ? (isCustom ? "Configure" : "Frequency") : "Schedule";

  if (isCorpusLoading) return null;

  return (
    <div className="container max-w-md mx-auto select-none">
      <div className="flex flex-col items-center min-h-[580px]">
        <div className="w-full flex-grow flex flex-col pt-2">
          {/* Step title */}
          <div className="flex justify-center mt-2 mb-4">
            <span className="text-sm font-medium">{stepTitle}</span>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8 mt-2">
            {[1, 2, 3].map((s, idx) => {
              const isCurrent = step === s;
              return (
                <React.Fragment key={s}>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2",
                      isCurrent
                        ? "bg-foreground text-background border-foreground"
                        : step > s
                        ? "bg-muted-foreground border-muted-foreground text-background"
                        : "bg-transparent border-border text-muted-foreground"
                    )}
                  >
                    {step > s ? <Check className="h-4 w-4" /> : s}
                  </div>
                  {idx < 2 && (
                    <div
                      className={cn(
                        "h-[2px] transition-all duration-500 ease-in-out",
                        isCurrent ? "bg-foreground w-12 mx-2" : "bg-muted w-4 mx-1"
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="flex-grow space-y-4" key={`step-${step}`}>
            {step === 1 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {GOAL_PRESETS.map((preset) => {
                  const Icon = iconMap[preset.icon] || Clock;
                  const isSelected = selectedPreset?.id === preset.id;
                  return (
                    <Container
                      key={preset.id}
                      className={cn(
                        "!p-4 cursor-pointer transition-all",
                        isSelected
                          ? "ring-2 ring-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPreset(preset)}
                        className="w-full flex items-center gap-4 text-left"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            isSelected
                              ? "bg-foreground text-background"
                              : "bg-muted text-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{preset.title}</p>
                            {preset.recommended && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded-full bg-foreground/10 text-foreground">
                                <Star className="h-2.5 w-2.5" /> Rec
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </button>
                    </Container>
                  );
                })}
              </div>
            )}

            {step === 2 && !isCustom && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {[
                  { id: "daily" as const, icon: Repeat, title: "Daily", desc: "Resets every day" },
                  { id: "duration" as const, icon: Calendar, title: "Duration", desc: "Track over set days" },
                ].map((opt) => {
                  const active = frequency === opt.id;
                  const Icon = opt.icon;
                  return (
                    <Container
                      key={opt.id}
                      className={cn(
                        "!p-4 cursor-pointer transition-all",
                        active ? "ring-2 ring-foreground" : "hover:bg-accent"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setFrequency(opt.id)}
                        className="w-full flex items-center gap-4 text-left"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            active ? "bg-foreground text-background" : "bg-muted text-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{opt.title}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </button>
                    </Container>
                  );
                })}
              </div>
            )}

            {step === 2 && isCustom && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label className="text-xs ml-1">Goal type</Label>
                  <Select value={customGoalType} onValueChange={(v) => setCustomGoalType(v as any)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_based">Time-based (min/day)</SelectItem>
                      <SelectItem value="khatm">Complete Quran (Khatm)</SelectItem>
                      <SelectItem value="verses">Verses per day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {customGoalType === "time_based" && (
                  <div className="space-y-2">
                    <Label className="text-xs ml-1">Daily minutes</Label>
                    <Input
                      type="number"
                      value={customDailyTarget}
                      onChange={(e) => setCustomDailyTarget(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-11"
                      min={1}
                      max={120}
                    />
                  </div>
                )}

                {customGoalType === "khatm" && (
                  <div className="space-y-2">
                    <Label className="text-xs ml-1">Duration (days)</Label>
                    <Input
                      type="number"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-11"
                      min={1}
                      max={730}
                    />
                    <p className="text-xs text-muted-foreground ml-1">
                      ≈ {Math.ceil(TOTAL_VERSES / customDuration)} verses/day
                    </p>
                  </div>
                )}

                {customGoalType === "verses" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs ml-1">Verses per day</Label>
                      <Input
                        type="number"
                        value={customVersesPerDay}
                        onChange={(e) => setCustomVersesPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-11"
                        min={1}
                        max={300}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs ml-1">Duration (days)</Label>
                      <Input
                        type="number"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-11"
                        min={1}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2">
                  {generateSchedule().map((item, index) => (
                    <Container key={index} className="!py-3 !px-4 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide">{item.day}</span>
                      <span className="text-xs text-muted-foreground truncate ml-3">{item.task}</span>
                    </Container>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="py-8 flex gap-4 mt-auto">
            <Button
              onClick={() => (step > 1 ? setStep((s) => (s - 1) as WizardStep) : onClose())}
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full shrink-0"
            >
              <ChevronLeft size={20} />
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as WizardStep)}
                className="flex-grow font-bold uppercase tracking-widest text-[10px] h-12"
                disabled={!canAdvance}
              >
                Continue <ChevronRight size={14} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-grow font-bold uppercase tracking-widest text-[10px] h-12"
              >
                {isCreating ? "Creating" : "Start Goal"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}