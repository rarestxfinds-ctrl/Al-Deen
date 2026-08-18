// Surah-Grid
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";

import { Fetch_Suwar } from "@/Library/Quran-API";
import type { Surah_Metadata } from "@/Library/Quran-Types";

interface SurahGridProps {
  filterType: "surah" | "juz" | "hizb" | "page" | null;
  surahSortOrder: "ascending" | "descending" | "revelation";
  onSelectSurah?: (surahId: number) => void;
  onListLoaded?: (list: Surah_Metadata[]) => void;
}

export const SurahGrid = ({
  filterType,
  surahSortOrder,
  onSelectSurah,
  onListLoaded,
}: SurahGridProps) => {
  const [surahs, setSurahs] = useState<Surah_Metadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    Fetch_Suwar()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setSurahs(list);
        setError(null);
        if (onListLoaded) onListLoaded(list);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Failed to load Surah list.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-sm text-destructive">{error}</div>;
  }

  const sortedSurahs = (() => {
    const list = [...surahs];
    if (surahSortOrder === "descending") {
      return list.reverse();
    }
    if (surahSortOrder === "revelation") {
      return list.sort((a, b) => (a["Revelation_Order"] ?? 0) - (b["Revelation_Order"] ?? 0));
    }
    return list;
  })();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {sortedSurahs.map((surah: Surah_Metadata) => {
        const surahId = surah["Surah"];
        const titleName = surah["Transliteration"];
        const translationName = surah["Translation"];
        const revelationLoc = surah["Revelation_Place"];
        const verseCount = surah["Ayah_Count"];
        const fontName = String(surahId).padStart(3, "0");

        return (
          <div
            key={surahId}
            onClick={() => {
              if (filterType === "surah" && onSelectSurah) {
                onSelectSurah(surahId);
              } else {
                navigate(`/Quran/Surah/${surahId}`);
              }
            }}
            className="cursor-pointer"
          >
            <Card className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition-all duration-200 group">
              <Button
                size="sm"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0 flex items-center justify-center flex-shrink-0"
              >
                {fontName}
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                  {titleName}
                </h3>
                <p className="text-xs sm:text-sm truncate [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                  {translationName}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground [.high-contrast_&]:group-hover:text-white/80 [.high-contrast_&]:dark:group-hover:text-black/80">
                    {revelationLoc === "Meccan" || revelationLoc === "Makkah"
                      ? "Meccan"
                      : "Medinan"}
                  </span>
                  <p
                    className="font-surah text-base sm:text-lg [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black"
                    dir="rtl"
                  >
                    {fontName}
                  </p>
                </div>
                <p className="text-[10px] sm:text-xs [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                  {verseCount} Ayah
                </p>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};