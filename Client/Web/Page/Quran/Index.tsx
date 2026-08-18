import { useState } from "react";
import { Layout } from "@Web/Component/Layout/Index";
import { Filter } from "@Web/Component/Quran/Filter";
import { SurahGrid } from "@Web/Component/Quran/Surah-Grid";
import { Filter as FilterIcon, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";
import { ContinueReading } from "@Web/Component/Quran/Continue-Reading";
import { GoalCard } from "@Web/Component/Quran/Goal/Card";
import type { Quran as QuranType } from "@/Library/Quran-Types";

type SurahSortOrder = "ascending" | "descending" | "revelation";

const Quran = () => {
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState<"surah" | "juz" | "hizb" | "page" | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [surahSortOrder, setSurahSortOrder] = useState<SurahSortOrder>("ascending");

  const [surahList, setSurahList] = useState<QuranType[]>([]);
  const [totalVersesCount, setTotalVersesCount] = useState<number>(6236);

  const navigate = useNavigate();

  const handleListLoaded = (list: QuranType[]) => {
    setSurahList(list);
    const totalSum = list.reduce(
      (acc: number, s: QuranType) => acc + (s.Ayah_Count ?? 0),
      0
    );
    if (totalSum > 0) setTotalVersesCount(totalSum);
  };

  const handleApplyFilter = () => {
    setShowFilter(false);
    if (selectedSurah) {
      if (selectedAyah) {
        navigate(`/Quran/Surah/${selectedSurah}?ayah=${selectedAyah}`);
      } else {
        navigate(`/Quran/Surah/${selectedSurah}`);
      }
    }
  };

  const handleReset = () => {
    setFilterType(null);
    setSelectedSurah(null);
    setSelectedAyah(null);
    setSurahSortOrder("ascending");
  };

  const getFilterLabel = () => {
    if (filterType === "juz") return "Juz";
    if (filterType === "hizb") return "Hizb";
    if (filterType === "page") return "Page";
    if (selectedSurah) return `Surah ${selectedSurah}`;
    return "Filter";
  };

  return (
    <Layout>
      <div className="flex flex-wrap gap-3 mb-6">
        <ContinueReading surahList={surahList} />
        <GoalCard surahList={surahList} totalVersesCount={totalVersesCount} />
      </div>

      <div className="flex justify-end mb-6 relative">
        <Button
          onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-2 ${filterType || selectedSurah ? "active" : ""}`}
        >
          <FilterIcon className="h-4 w-4" />
          {getFilterLabel()}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showFilter ? "rotate-180" : ""}`}
          />
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
          surahSortOrder={surahSortOrder}
          setSurahSortOrder={setSurahSortOrder}
          onApply={handleApplyFilter}
          onReset={handleReset}
        />
      </div>

      {filterType === "juz" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => (
            <Link key={juzNum} to={`/Quran/Juz/${juzNum}`} className="w-full block">
              <Card className="p-4 text-center transition-all group">
                <p className="font-semibold text-lg">{juzNum}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {filterType === "hizb" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 60 }, (_, i) => i + 1).map((hizbNum) => (
            <Link key={hizbNum} to={`/Quran/Hizb/${hizbNum}`} className="w-full block">
              <Card className="p-4 text-center transition-all group">
                <p className="font-semibold text-lg">{hizbNum}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {filterType === "page" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 604 }, (_, i) => i + 1).map((pageNum) => (
            <Link key={pageNum} to={`/Quran/Page/${pageNum}`} className="w-full block">
              <Card className="p-4 text-center transition-all group">
                <p className="font-semibold text-lg">{pageNum}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!filterType && (
        <SurahGrid
          filterType={filterType}
          surahSortOrder={surahSortOrder}
          onSelectSurah={(id) => setSelectedSurah(id)}
          onListLoaded={handleListLoaded}
        />
      )}
    </Layout>
  );
};

export default Quran;