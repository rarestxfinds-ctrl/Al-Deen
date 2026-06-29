import { useState, useMemo } from "react";
import { Layout } from "Client/Component/Layout/Index";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "Client/Component/UI/Button";
import { Container } from "Client/Component/UI/Container";
import { DateDialog } from "Client/Component/Dialog/Date";
import uq from "@umalqura/core";
import { computeHijri } from "Client/Hook/usePrayerTimes";

// --- Types ---
interface CalendarDay {
  hijri: {
    day: string;
    month: { number: number; en: string; ar: string };
    year: string;
    weekday: { en: string; ar: string };
    designation: { abbreviated: string };
  };
  gregorian: {
    date: string; // "DD-MM-YYYY"
    day: string;
    month: { number: number; en: string };
    year: string;
    weekday: { en: string };
  };
}

interface Holiday {
  name: string;
  gregorianDate: string; // "YYYY-MM-DD" for logic
  hijriDay: number;
  hijriMonth: number;
  type: string;
}

const HIJRI_MONTHS_EN = ["Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani","Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"];
const HIJRI_MONTHS_AR = ["محرم","صفر","ربيع الأول","ربيع الثاني","جمادى الأولى","جمادى الثانية","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const GREG_MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEK_FULL_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Fixed-date Islamic holidays (Hijri month, day)
const ISLAMIC_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: "Islamic New Year" },
  { month: 1, day: 10, name: "Day of Ashura" },
  { month: 3, day: 12, name: "Mawlid al-Nabi" },
  { month: 7, day: 27, name: "Isra and Mi'raj" },
  { month: 8, day: 15, name: "Shab-e-Barat" },
  { month: 9, day: 1, name: "First day of Ramadan" },
  { month: 9, day: 27, name: "Laylat al-Qadr" },
  { month: 10, day: 1, name: "Eid al-Fitr" },
  { month: 12, day: 8, name: "Day of Tarwiyah" },
  { month: 12, day: 9, name: "Day of Arafah" },
  { month: 12, day: 10, name: "Eid al-Adha" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function buildMonth(hYear: number, hMonth: number): CalendarDay[] {
  // @umalqura/core: lengthOfMonth via uq(year, month, 1).daysInMonth
  const first = uq(hYear, hMonth, 1);
  const len = first.daysInMonth;
  const out: CalendarDay[] = [];
  for (let d = 1; d <= len; d++) {
    const h = uq(hYear, hMonth, d);
    const g = h.date as Date;
    out.push({
      hijri: {
        day: String(d),
        month: { number: hMonth, en: HIJRI_MONTHS_EN[hMonth - 1], ar: HIJRI_MONTHS_AR[hMonth - 1] },
        year: String(hYear),
        weekday: { en: WEEK_FULL_EN[g.getDay()], ar: "" },
        designation: { abbreviated: "AH" },
      },
      gregorian: {
        date: `${pad(g.getDate())}-${pad(g.getMonth() + 1)}-${g.getFullYear()}`,
        day: String(g.getDate()),
        month: { number: g.getMonth() + 1, en: GREG_MONTHS_EN[g.getMonth()] },
        year: String(g.getFullYear()),
        weekday: { en: WEEK_FULL_EN[g.getDay()] },
      },
    });
  }
  return out;
}

const HijriCalendarPage = () => {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  const todayISO = today.toISOString().slice(0, 10);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const todayHijri = useMemo(() => computeHijri(today), []);
  const [hijriMonth, setHijriMonth] = useState<number>(todayHijri.month.number);
  const [hijriYear, setHijriYear] = useState<number>(parseInt(todayHijri.year));
  const [holidaysPage, setHolidaysPage] = useState(0);
  const HOLIDAYS_PER_PAGE = 7;

  // Dialog State
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Compute month grid locally
  const days: CalendarDay[] = useMemo(() => buildMonth(hijriYear, hijriMonth), [hijriYear, hijriMonth]);
  const loading = false;
  const error: string | null = null;

  // Compute holidays for the year locally
  const holidays: Holiday[] = useMemo(() => {
    return ISLAMIC_HOLIDAYS.map((h) => {
      const g = uq(hijriYear, h.month, h.day).date as Date;
      return {
        name: h.name,
        gregorianDate: `${g.getFullYear()}-${pad(g.getMonth() + 1)}-${pad(g.getDate())}`,
        hijriDay: h.day,
        hijriMonth: h.month,
        type: "Religious",
      };
    }).sort((a, b) => a.gregorianDate.localeCompare(b.gregorianDate));
  }, [hijriYear]);
  const holidaysLoading = false;

  // Pagination Logic
  const upcomingHolidays = useMemo(() => {
    return holidays.filter((h) => h.gregorianDate >= todayISO);
  }, [holidays, todayISO]);

  const currentHolidaysBatch = useMemo(() => {
    const start = holidaysPage * HOLIDAYS_PER_PAGE;
    return upcomingHolidays.slice(start, start + HOLIDAYS_PER_PAGE);
  }, [upcomingHolidays, holidaysPage]);

  // Navigation
  const goNext = () => {
    if (hijriMonth === 12) {
      setHijriMonth(1);
      setHijriYear((y) => y + 1);
    } else {
      setHijriMonth((m) => m + 1);
    }
  };

  const goPrev = () => {
    if (hijriMonth === 1) {
      setHijriMonth(12);
      setHijriYear((y) => y - 1);
    } else {
      setHijriMonth((m) => m - 1);
    }
  };

  // Grid Logic
  const getOffset = () => {
    if (days.length === 0) return 0;
    const firstDayName = days[0].gregorian.weekday.en;
    return weekDays.indexOf(firstDayName.substring(0, 3));
  };

  const getHolidayForDay = (gregorianDate: string) => {
    const [d, m, y] = gregorianDate.split("-");
    const iso = `${y}-${m}-${d}`;
    return holidays.find((h) => h.gregorianDate === iso);
  };

  return (
    <Layout>
      <section className="py-6">
        <div className="container max-w-2xl mx-auto">
          {/* Calendar Header */}
          <Container className="!py-3 !px-4 mb-4">
            <div className="flex items-center justify-between">
              <Button size="sm" className="w-9 h-9 p-0 rounded-full" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {days[0]?.hijri.month.en || "..."} {hijriYear} AH
                </p>
                <p className="text-xs text-muted-foreground">
                  {days[0]?.gregorian.month.en} {days[0]?.gregorian.year}
                </p>
              </div>
              <Button size="sm" className="w-9 h-9 p-0 rounded-full" onClick={goNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Container>

          {(
            <>
              {/* Weekday labels */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((d) => (
                  <Container key={d} className="!py-1 !px-0 text-center">
                    <span className="text-xs text-muted-foreground font-medium">{d}</span>
                  </Container>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getOffset() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map((day) => {
                  const activeFlag = day.gregorian.date === todayStr;
                  const holiday = getHolidayForDay(day.gregorian.date);
                  return (
                    <button
                      key={day.gregorian.date}
                      onClick={() => { setSelectedDay(day); setModalOpen(true); }}
                      className={`
                        group relative rounded-[40px] transition-all duration-200 py-2 px-1 text-center border-2
                        ${activeFlag
                          ? "bg-black dark:bg-white border-white dark:border-black"
                          : "bg-white dark:bg-black border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                        }
                      `}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <p className={`text-sm font-semibold leading-tight ${activeFlag ? "text-white dark:text-black" : "text-black dark:text-white [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black"}`}>
                          {day.hijri.day}
                        </p>
                        {holiday && <span className="text-[10px] text-yellow-500">★</span>}
                      </div>
                      <p className={`text-xs leading-tight mt-0.5 ${activeFlag ? "text-white/70 dark:text-black/70" : "text-muted-foreground"}`}>
                        {day.gregorian.day}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* ----- Upcoming Islamic Holidays ----- */}
              <Container className="mt-8 !py-5 !px-4">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg leading-tight truncate">
                      Upcoming Islamic Holidays
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {upcomingHolidays.length} remaining in {hijriYear} AH
                    </p>
                  </div>
                  {upcomingHolidays.length > HOLIDAYS_PER_PAGE && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full w-8 h-8 p-0"
                        onClick={() => setHolidaysPage(p => p - 1)}
                        disabled={holidaysPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">
                        {holidaysPage + 1}/{Math.ceil(upcomingHolidays.length / HOLIDAYS_PER_PAGE)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full w-8 h-8 p-0"
                        onClick={() => setHolidaysPage(p => p + 1)}
                        disabled={(holidaysPage + 1) * HOLIDAYS_PER_PAGE >= upcomingHolidays.length}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {upcomingHolidays.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No upcoming holidays found for this year.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {currentHolidaysBatch.map((holiday, idx) => {
                      const dateObj = new Date(holiday.gregorianDate);
                      const formattedDate = dateObj.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      });
                      const daysAway = Math.max(
                        0,
                        Math.ceil((dateObj.getTime() - today.getTime()) / 86400000)
                      );
                      return (
                        <div
                          key={`${holiday.gregorianDate}-${idx}`}
                          className="p-3 rounded-2xl bg-accent/60 border border-border/40 hover:bg-accent transition-colors flex flex-col gap-1"
                        >
                          <p className="font-semibold text-xs leading-tight line-clamp-2 min-h-[2rem]">
                            {holiday.name}
                          </p>
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                            <span className="text-[10px] font-medium text-foreground/80">
                              {daysAway === 0 ? "Today" : `${daysAway}d`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Container>
            </>
          )}
        </div>
      </section>

      <DateDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        day={selectedDay}
        hijriMonth={hijriMonth || 1}
        hijriYear={hijriYear || 1447}
        holiday={selectedDay ? getHolidayForDay(selectedDay.gregorian.date) : undefined}
      />
    </Layout>
  );
};

export default HijriCalendarPage;