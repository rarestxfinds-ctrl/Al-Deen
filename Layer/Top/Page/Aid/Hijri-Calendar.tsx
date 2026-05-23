import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/Top/Component/Layout/Index";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";
import { DateDialog } from "@/Top/Component/Dialog/Date";

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
}

const HijriCalendarPage = () => {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  const todayISO = today.toISOString().slice(0, 10);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // State
  const [hijriMonth, setHijriMonth] = useState<number | null>(null);
  const [hijriYear, setHijriYear] = useState<number | null>(null);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Holiday State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysPage, setHolidaysPage] = useState(0);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const HOLIDAYS_PER_PAGE = 7;

  // Dialog State
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 1. Initial Load: Get current Hijri status
  useEffect(() => {
    fetch(`https://api.aladhan.com/v1/gToH/${todayStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.hijri) {
          setHijriMonth(data.data.hijri.month.number);
          setHijriYear(parseInt(data.data.hijri.year));
        }
      })
      .catch(console.error);
  }, []);

  // 2. Fetch Monthly Grid
  useEffect(() => {
    if (hijriMonth === null || hijriYear === null) return;

    setLoading(true);
    fetch(`https://api.aladhan.com/v1/hToGCalendar/${hijriMonth}/${hijriYear}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200) {
          setDays(data.data);
          setError(null);
        } else {
          setError("Failed to load calendar data.");
        }
      })
      .catch(() => setError("Unable to connect to the calendar server."))
      .finally(() => setLoading(false));
  }, [hijriMonth, hijriYear]);

  // 3. Fetch Year Holidays (Using exact paths from your provided JSON model)
  useEffect(() => {
    if (hijriYear === null) return;

    setHolidaysLoading(true);
    fetch(`https://api.aladhan.com/v1/islamicHolidaysByHijriYear/${hijriYear}?calendarMethod=UAQ`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200 && Array.isArray(data.data)) {
          const mappedHolidays = data.data.map((item: any) => {
            // Path: item.gregorian.date & item.hijri.holidays
            const rawGregorian = item.gregorian?.date; // "DD-MM-YYYY"
            const holidayNames = item.hijri?.holidays;

            if (!rawGregorian || !holidayNames || holidayNames.length === 0) return null;

            const [d, m, y] = rawGregorian.split("-");
            return {
              name: holidayNames[0],
              gregorianDate: `${y}-${m}-${d}`, // Correctly reversed for sorting
              hijriDay: parseInt(item.hijri.day),
              hijriMonth: item.hijri.month.number,
            };
          }).filter(Boolean) as Holiday[];

          setHolidays(mappedHolidays);
        }
      })
      .catch((err) => console.error("Holiday API Error:", err))
      .finally(() => setHolidaysLoading(false));
  }, [hijriYear]);

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
      setHijriYear((y) => (y ? y + 1 : null));
    } else {
      setHijriMonth((m) => (m ? m + 1 : null));
    }
  };

  const goPrev = () => {
    if (hijriMonth === 1) {
      setHijriMonth(12);
      setHijriYear((y) => (y ? y - 1 : null));
    } else {
      setHijriMonth((m) => (m ? m - 1 : null));
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
              <Button size="sm" className="w-9 h-9 p-0 rounded-full" onClick={goPrev} disabled={loading}>
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
              <Button size="sm" className="w-9 h-9 p-0 rounded-full" onClick={goNext} disabled={loading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Container>

          {loading ? (
            <Container className="p-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </Container>
          ) : error ? (
            <Container className="p-8 text-center flex flex-col items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </Container>
          ) : (
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
                        <p className={`text-sm font-semibold leading-tight ${activeFlag ? "text-white dark:text-black" : "text-black dark:text-white group-hover:text-white dark:group-hover:text-black"}`}>
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

              {/* ----- Upcoming Islamic Holidays Container ----- */}
              <Container className="mt-8 !py-4">
                <h3 className="font-semibold text-lg mb-3 text-center">📅 Upcoming Islamic Holidays</h3>
                
                {holidaysLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : upcomingHolidays.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No upcoming holidays found for this year.
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full w-8 h-8 p-0"
                      onClick={() => setHolidaysPage(p => p - 1)}
                      disabled={holidaysPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-7 gap-2">
                      {currentHolidaysBatch.map((holiday, idx) => {
                        const dateObj = new Date(holiday.gregorianDate);
                        const formattedDate = dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                        return (
                          <div
                            key={`${holiday.gregorianDate}-${idx}`}
                            className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                          >
                            <p className="font-semibold text-[10px] truncate">{holiday.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{formattedDate}</p>
                          </div>
                        );
                      })}
                    </div>

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