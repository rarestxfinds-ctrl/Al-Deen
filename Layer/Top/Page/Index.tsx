import { useState } from "react";
import { Layout } from "@/Top/Component/Layout/Index";
import { surahList, getSurahsByRevelationOrder, getSurah, getJuzCount, getHizbCount, getPageCount } from "@/Bottom/API/Quran";
import { Filter } from "@/Top/Component/Quran/Filter";
import { TrendingUp, Filter as FilterIcon, ChevronDown, Flame, ChevronRight, Clock, Calendar } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/Middle/Context/Auth";
import { useReadingProgress } from "@/Middle/Hook/Use-Reading-Progress";
import { useQuranGoals } from "@/Middle/Hook/Use-Quran-Goals";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/Top/Component/UI/Card";
import { Button } from "@/Top/Component/UI/Button";
import { Progress_Ring } from "@/Top/Component/Quran/Goal/Progress";

const revelationOrderedSurahs = getSurahsByRevelationOrder();
const TOTAL_VERSES = 6236;

function versesBeforeSurah(surahId: number): number {
  return surahList.filter(s => s.id < surahId).reduce((sum, s) => sum + s.numberOfAyahs, 0);
}

const Quran = () => {
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState<"surah" | "juz" | "hizb" | "page" | "revelation" | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [revelationOrder, setRevelationOrder] = useState<"asc" | "desc">("asc");
  const { user } = useAuth();
  const { progress } = useReadingProgress();
  const { activeGoal, weekProgress } = useQuranGoals();
  const navigate = useNavigate();

  const continueReadingSurah = progress ? surahList.find((s) => s.id === progress.last_surah_id) : null;
  const continueReadingUrl = continueReadingSurah
    ? `/Quran/Surah/${continueReadingSurah.id}?verse=${progress?.last_ayah_id || 1}`
    : "/Quran/Surah/1";

  // Keep this query only for potential future use (if needed elsewhere)
  const { data: surahData } = useQuery({
    queryKey: ['surah', selectedSurah, selectedAyah ? 'wbw' : 'standard'],
    queryFn: () => selectedSurah ? getSurah(selectedSurah, { 
      wbw: selectedAyah !== null,
      wbwSource: "Saheeh"
    }) : null,
    enabled: !!selectedSurah && !!selectedAyah, // only fetch if we need wbw (but we removed kalimah view)
  });

  const selectedSurahMeta = selectedSurah ? surahList.find(s => s.id === selectedSurah) : null;
  const ayahs = selectedSurahMeta ? Array.from({ length: selectedSurahMeta.numberOfAyahs }, (_, i) => i + 1) : [];

  const getGoalDisplay = () => {
    if (!activeGoal) return null;

    const versesRead = progress 
      ? versesBeforeSurah(progress.last_surah_id) + (progress.last_ayah_id || 0) 
      : 0;

    if (activeGoal.goal_type === "time_based") {
      const dailyTarget = activeGoal.daily_target || 30;
      const todayProgress = weekProgress?.find(p => {
        const today = new Date().toISOString().split('T')[0];
        return p.date === today;
      });
      const todayMinutes = todayProgress?.minutes_read || 0;
      const todaySeconds = todayProgress?.seconds_read || 0;
      const totalTodaySeconds = (todayMinutes * 60) + todaySeconds;
      const targetSeconds = dailyTarget * 60;
      const remainingSeconds = Math.max(0, targetSeconds - totalTodaySeconds);
      
      const remainingMinutes = Math.floor(remainingSeconds / 60);
      const remainingSecs = remainingSeconds % 60;
      const timeRemaining = remainingMinutes > 0 
        ? `${remainingMinutes}m ${remainingSecs}s` 
        : `${remainingSecs}s`;
      
      const percentage = Math.min(100, (totalTodaySeconds / targetSeconds) * 100);
      
      return {
        type: "time",
        streak: activeGoal.current_streak || 0,
        percentage,
        timeRemaining,
        progressValue: `${todayMinutes}:${String(todaySeconds).padStart(2, '0')}`,
        progressLabel: `${dailyTarget} min`,
        remainingValue: `${remainingMinutes}`,
        remainingLabel: "min left",
      };
    }
    
    if (activeGoal.goal_type === "khatm") {
      const percentage = Math.min(100, (versesRead / TOTAL_VERSES) * 100);
      const remainingVerses = TOTAL_VERSES - versesRead;
      
      return {
        type: "khatm",
        streak: activeGoal.current_streak || 0,
        percentage,
        progressValue: `${versesRead}`,
        progressLabel: "verses",
        remainingValue: remainingVerses.toLocaleString(),
        remainingLabel: "left",
        sublabel: `${Math.ceil(remainingVerses / 15)} pages`
      };
    }
    
    return null;
  };

  const goalDisplay = getGoalDisplay();
  const completedDays = weekProgress?.filter(p => p.completed).length || 0;

  const getView = () => {
    // Kalimah view is removed - we now navigate to a separate page for word-by-word.
    if (selectedSurah && !selectedAyah) {
      return { type: "ayahs", data: ayahs, surah: selectedSurahMeta };
    }
    
    if (filterType === "juz") {
      const juzCount = getJuzCount();
      return { type: "juz", data: Array.from({ length: juzCount }, (_, i) => i + 1) };
    }
    
    if (filterType === "hizb") {
      const hizbCount = getHizbCount();
      return { type: "hizb", data: Array.from({ length: hizbCount }, (_, i) => i + 1) };
    }
    
    if (filterType === "page") {
      const pageCount = getPageCount();
      return { type: "page", data: Array.from({ length: pageCount }, (_, i) => i + 1) };
    }
    
    if (filterType === "revelation") {
      const sorted = revelationOrder === "asc" ? revelationOrderedSurahs : [...revelationOrderedSurahs].reverse();
      return { type: "revelation", data: sorted };
    }
    
    return { type: "surahs", data: surahList };
  };

  const view = getView();

  const handleApplyFilter = () => {
    setShowFilter(false);
  };

  const handleReset = () => {
    setFilterType(null);
    setSelectedSurah(null);
    setSelectedAyah(null);
    setRevelationOrder("asc");
  };

  const getFilterLabel = () => {
    if (selectedSurah && selectedAyah) return `Surah ${selectedSurah}, Ayah ${selectedAyah}`;
    if (selectedSurah) return `Surah ${selectedSurah}`;
    if (filterType === "juz") return "Juz";
    if (filterType === "hizb") return "Hizb";
    if (filterType === "page") return "Page";
    if (filterType === "revelation") return revelationOrder === "asc" ? "Revelation (1→114)" : "Revelation (114→1)";
    return "Filter";
  };

  return (
    <Layout>
      {/* Continue Reading Cards */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link to={continueReadingUrl} className="flex-1 min-w-[200px]">
          <Card className="p-4 sm:p-5 w-full hover:scale-[1.02] group h-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium group-hover:text-white dark:group-hover:text-black">Continue Reading</h2>
              <Button size="sm" className="text-xs">
                {progress?.last_ayah_id ? `Ayah ${progress.last_ayah_id}` : "Start"}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-surah text-3xl sm:text-4xl group-hover:text-white dark:group-hover:text-black" dir="rtl">
                {continueReadingSurah?.surahFontName || "001"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm sm:text-base group-hover:text-white dark:group-hover:text-black">
                  {continueReadingSurah
                    ? `${continueReadingSurah.id}. ${continueReadingSurah.englishNameTransliteration || continueReadingSurah.englishName}`
                    : "1. Al-Fatihah"}
                </p>
                <p className="text-xs group-hover:text-white dark:group-hover:text-black">
                  {continueReadingSurah?.englishNameTranslation || "The Opener"}
                </p>
              </div>
            </div>
          </Card>
        </Link>

        {/* Goals Card */}
        <div className="flex-1 min-w-[280px]">
          <Card
            onClick={() => {
              if (!user) { navigate("/Sign-Up"); return; }
              navigate("/Quran/Goal");
            }}
            className="p-4 sm:p-5 w-full h-full hover:scale-[1.02] group cursor-pointer overflow-hidden relative"
          >
            <div className="flex items-center gap-3 h-full relative z-10">
              <div className="flex-shrink-0">
                {goalDisplay ? (
                  <Progress_Ring
                    value={goalDisplay.percentage}
                    size={64}
                    strokeWidth={3}
                    label={`${Math.round(goalDisplay.percentage)}%`}
                    labelClassName="text-xxs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center transition-all group-hover:border-primary/50">
                    <TrendingUp className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {goalDisplay ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold group-hover:text-white dark:group-hover:text-black">
                        {goalDisplay.type === "time" ? "Daily Reading" : "Khatm Progress"}
                      </p>
                      {goalDisplay.streak > 0 && (
                        <div className="flex items-center gap-0.5 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                          <Flame className="h-3 w-3 text-orange-500" />
                          <span className="text-xs font-medium text-orange-500">
                            {goalDisplay.streak} day streak
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-0.5">
                      {goalDisplay.type === "time" ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-primary">
                            {goalDisplay.timeRemaining || "0m 0s"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Left
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-primary">
                              {goalDisplay.progressValue}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {goalDisplay.progressLabel} completed
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Remaining:</span>
                            <span className="font-semibold text-foreground group-hover:text-white dark:group-hover:text-black">
                              {goalDisplay.remainingValue} {goalDisplay.remainingLabel}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold group-hover:text-white dark:group-hover:text-black">
                      Set a Goal
                    </p>
                    <p className="text-xs text-muted-foreground group-hover:text-white/80 dark:group-hover:text-black/80 mt-1">
                      Track your progress & build streaks
                    </p>
                  </>
                )}
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-white dark:group-hover:text-black transition-transform group-hover:translate-x-0.5" />
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-2 ${filterType || selectedSurah ? "active" : ""}`}
        >
          <FilterIcon className="h-4 w-4" />
          {getFilterLabel()}
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilter ? "rotate-180" : ""}`} />
        </Button>
        <Filter
          isOpen={showFilter}
          onClose={() => setShowFilter(false)}
          filterType={filterType}
          setFilterType={setFilterType}
          selectedSurah={selectedSurah}
          setSelectedSurah={setSelectedSurah}
          selectedAyah={selectedAyah}
          setSelectedAyah={setSelectedAyah}
          revelationOrder={revelationOrder}
          setRevelationOrder={setRevelationOrder}
          onApply={handleApplyFilter}
          onReset={handleReset}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* KALIMAH VIEW REMOVED (now handled by separate page) */}

        {/* Ayahs View - now navigates to dedicated route */}
        {view.type === "ayahs" && view.data.map((ayahNum) => (
          <div key={ayahNum}>
            <Button
              onClick={() => navigate(`/Quran/Surah/${selectedSurah}/Ayah/${ayahNum}`)}
              className="w-full p-4 text-center transition-all hover:scale-[1.02] group"
              fullWidth
            >
              <p className="font-semibold text-lg group-hover:text-white dark:group-hover:text-black">{ayahNum}</p>
            </Button>
          </div>
        ))}

        {/* Juz View */}
        {view.type === "juz" && view.data.map((juzNum) => (
          <div key={juzNum}>
            <Link to={`/Quran/Juz/${juzNum}`} className="w-full block">
              <Card className="p-4 text-center transition-all hover:scale-[1.02] group">
                <p className="font-semibold text-lg group-hover:text-white dark:group-hover:text-black">{juzNum}</p>
              </Card>
            </Link>
          </div>
        ))}

        {/* Hizb View */}
        {view.type === "hizb" && view.data.map((hizbNum) => (
          <div key={hizbNum}>
            <Link to={`/Quran/Hizb/${hizbNum}`} className="w-full block">
              <Card className="p-4 text-center transition-all hover:scale-[1.02] group">
                <p className="font-semibold text-lg group-hover:text-white dark:group-hover:text-black">{hizbNum}</p>
              </Card>
            </Link>
          </div>
        ))}

        {/* Page View */}
        {view.type === "page" && view.data.map((pageNum) => (
          <div key={pageNum}>
            <Link to={`/Quran/Page/${pageNum}`} className="w-full block">
              <Card className="p-4 text-center transition-all hover:scale-[1.02] group">
                <p className="font-semibold text-lg group-hover:text-white dark:group-hover:text-black">{pageNum}</p>
              </Card>
            </Link>
          </div>
        ))}

        {/* Revelation Order View */}
        {view.type === "revelation" && view.data.map((surah) => (
          <div
            key={surah.id}
            onClick={() => navigate(`/Quran/Surah/${surah.id}`)}
            className="cursor-pointer"
          >
            <Card className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition-all duration-200 group hover:scale-[1.02]">
              <Button
                size="sm"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0 flex items-center justify-center flex-shrink-0"
              >
                {String(surah.id).padStart(3, '0')}
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-white dark:group-hover:text-black">
                  {surah.englishNameTransliteration || surah.englishName}
                </h3>
                <p className="text-xs sm:text-sm truncate group-hover:text-white dark:group-hover:text-black">
                  {surah.englishNameTranslation}
                </p>
                {/* Revelation place added */}
                <p className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-white/80 dark:group-hover:text-black/80">
                  {surah.revelationType === "Meccan" ? "Meccan" : "Medinan"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {/* Surah number before Arabic name */}
                <p className="font-surah text-base sm:text-lg group-hover:text-white dark:group-hover:text-black" dir="rtl">
                  {surah.id}. {surah.surahFontName}
                </p>
                <p className="text-[10px] sm:text-xs group-hover:text-white dark:group-hover:text-black">
                  {surah.numberOfAyahs} Ayahs
                </p>
              </div>
            </Card>
          </div>
        ))}

        {/* Surahs View (Default) - with revelation place and surah number before Arabic */}
        {view.type === "surahs" && view.data.map((surah) => (
          <div
            key={surah.id}
            onClick={() => {
              if (filterType === "surah") {
                setSelectedSurah(surah.id);
              } else {
                navigate(`/Quran/Surah/${surah.id}`);
              }
            }}
            className="cursor-pointer"
          >
            <Card className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition-all duration-200 group hover:scale-[1.02]">
              <Button
                size="sm"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0 flex items-center justify-center flex-shrink-0"
              >
                {String(surah.id).padStart(3, '0')}
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-white dark:group-hover:text-black">
                  {surah.englishNameTransliteration || surah.englishName}
                </h3>
                <p className="text-xs sm:text-sm truncate group-hover:text-white dark:group-hover:text-black">
                  {surah.englishNameTranslation}
                </p>
                {/* Revelation place added */}
                <p className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-white/80 dark:group-hover:text-black/80">
                  {surah.revelationType === "Meccan" ? "Meccan" : "Medinan"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {/* Surah number before Arabic name */}
                <p className="font-surah text-base sm:text-lg group-hover:text-white dark:group-hover:text-black" dir="rtl">
                  {surah.id}. {surah.surahFontName}
                </p>
                <p className="text-[10px] sm:text-xs group-hover:text-white dark:group-hover:text-black">
                  {surah.numberOfAyahs} Ayahs
                </p>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Quran;