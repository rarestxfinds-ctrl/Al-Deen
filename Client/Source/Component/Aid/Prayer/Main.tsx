import { useState, useEffect } from "react";
import { Layout } from "@/Component/Layout/Index";
import { usePrayerTimes } from "@/Hook/usePrayerTimes";
import { Header } from "./Header";
import { Settings } from "./Settings";
import { NextPrayer } from "./NextPrayer";
import { PrayerCard } from "./PrayerCard";
import { AdditionalTimes } from "./AdditionalTimes";
import { formatTime, getElapsedProgress, getNextPrayer } from "./Utility";
import { DEFAULT_SETTINGS, MAIN_PRAYERS } from "./Constant";

export default function PrayerTimes() {
  const {
    location,
    timings,
    hijri,
    loading,
    error,
    dateStr,
    settings,
    updateSetting,
    requestLocation,
    methodLabel,
  } = usePrayerTimes();

  const [showSettings, setShowSettings] = useState(false);
  const [, setTick] = useState(0);

  // Tick every minute to update progress
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const nextPrayer = timings ? getNextPrayer(timings) : null;
  const progress = timings && nextPrayer ? getElapsedProgress(timings, nextPrayer) : 0;

  if (loading) return null;

  if (error) {
    return (
      <Layout>
        <div className="container max-w-2xl mx-auto py-6">
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button className="glass-btn px-4 py-2" onClick={requestLocation}>Try Again</button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!timings) return null;

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto py-6">
        <Header
          location={location}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onRefresh={requestLocation}
        />

        {/* Hijri Date */}
        {hijri && (
          <p className="text-sm text-muted-foreground mb-4 font-arabic">
            {hijri.day} {hijri.month.ar} {hijri.year} {hijri.designation.abbreviated}
            <span className="mx-2 opacity-30">•</span>
            <span className="font-sans">{hijri.day} {hijri.month.en} {hijri.year} {hijri.designation.abbreviated}</span>
          </p>
        )}

        {/* Settings Panel */}
        {showSettings && <Settings settings={settings} onUpdate={updateSetting} />}

        {/* Prayer Times Content */}
        <div className="space-y-3">
          {/* Next prayer highlight */}
          {nextPrayer && (
            <NextPrayer
              nextPrayer={nextPrayer}
              timings={timings}
              settings={settings}
              progress={progress}
            />
          )}

          {/* All prayers */}
          {MAIN_PRAYERS.map((prayer) => (
            <PrayerCard
              key={prayer}
              prayer={prayer}
              timings={timings}
              settings={settings}
              isNext={prayer === nextPrayer}
            />
          ))}

          {/* Imsak & Midnight */}
          <AdditionalTimes timings={timings} settings={settings} />

          <p className="text-xs text-muted-foreground text-center pt-2">
            {dateStr} • {methodLabel}
          </p>
        </div>
      </div>
    </Layout>
  );
}