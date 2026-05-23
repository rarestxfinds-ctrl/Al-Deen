import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Top/Component/UI/Dialog";
import { Button } from "@/Top/Component/UI/Button";

interface HijriDate {
  day: string;
  weekday: { en: string; ar: string };
  month: { number: number; en: string; ar: string };
  year: string;
  designation: { abbreviated: string };
}

interface CalendarDay {
  hijri: HijriDate;
  gregorian: {
    date: string;
    day: string;
    weekday: { en: string };
    month: { number: number; en: string };
    year: string;
  };
}

interface IslamicHoliday {
  hijriDay: number;
  hijriMonth: number;
  gregorianDate: string;
  name: string;
  type: string;
  description?: string;
}

interface DateDialogProps {
  open: boolean;
  onClose: () => void;
  day: CalendarDay | null;
  hijriMonth: number;
  hijriYear: number;
  holiday?: IslamicHoliday;      // ← Added holiday prop
}

export function DateDialog({ open, onClose, day, hijriMonth, hijriYear, holiday }: DateDialogProps) {
  if (!day) return null;

  const hasHoliday = !!holiday;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-black border-2 border-black dark:border-white rounded-[40px] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {day.hijri.month.en} {day.hijri.day}, {day.hijri.year} AH
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Islamic Holiday Section */}
          {hasHoliday ? (
            <div className="space-y-2 p-3 rounded-[40px] bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-1">
                🕌 Islamic Holiday
              </h3>
              <p className="font-medium text-base">{holiday.name}</p>
              {holiday.description && (
                <p className="text-sm text-muted-foreground">{holiday.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {holiday.type === "islamic" ? "Major observance" : "Optional observance"}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-[40px] bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">No Islamic holiday on this day.</p>
            </div>
          )}

          {/* Gregorian Date */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Gregorian Date</p>
            <p className="text-sm font-medium">
              {day.gregorian.weekday.en}, {day.gregorian.month.en} {day.gregorian.day}, {day.gregorian.year}
            </p>
          </div>

          {/* Hijri Details */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Hijri Month</p>
              <p className="text-sm font-medium">{day.hijri.month.en}</p>
              <p className="text-xs text-muted-foreground font-arabic">{day.hijri.month.ar}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weekday</p>
              <p className="text-sm font-medium">{day.hijri.weekday.en}</p>
              <p className="text-xs text-muted-foreground font-arabic">{day.hijri.weekday.ar}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={onClose} fullWidth>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}