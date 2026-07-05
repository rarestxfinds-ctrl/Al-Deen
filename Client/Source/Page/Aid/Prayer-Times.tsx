import { useState, useEffect } from "react";
import { Layout } from "@/Component/Layout/Index";
import { Loader2, MapPin } from "lucide-react";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";
import { usePrayerTimes } from "@/Hook/usePrayerTimes";
import { Header } from "@/Component/Aid/Prayer/Header";
import { NextPrayer } from "@/Component/Aid/Prayer/NextPrayer";
import { PrayerCard } from "@/Component/Aid/Prayer/PrayerCard";
import { getNextPrayer, getElapsedProgress, formatTime } from "@/Component/Aid/Prayer/Utility";
import { MAIN_PRAYERS } from "@/Component/Aid/Prayer/Constant";

export default function PrayerPage() {
  const {
    location,
    timings,
    hijri,
    loading,
    error,
    settings,
    requestLocation,
    methodLabel,
    isUsingSavedLocation,
  } = usePrayerTimes();

  const [, setTick] = useState(0);

  // Tick every minute to update progress
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const nextPrayer = timings ? getNextPrayer(timings) : null;
  const progress = timings && nextPrayer ? getElapsedProgress(timings, nextPrayer) : 0;

  // Loading state
  if (loading) {
    return (
      <Layout>
        <Container className="w-full !rounded-[48px] p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Fetching prayer times...</p>
        </Container>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <Container className="w-full !rounded-[48px] p-8 text-center space-y-4">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Please select a location in Settings to get prayer times.
          </p>
          <Button onClick={requestLocation} variant="secondary">
            Try Auto Location Again
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!timings) return null;

  return (
    <Layout>
      {/* Keep Header – no extra wrapping div */}
      <Header
        location={location}
        hijri={hijri}
        onRefresh={requestLocation}
      />

      {/* Prayer Times Content – inside a Container, no margins */}
      <Container className="w-full !rounded-[48px] p-6 space-y-3">
        {MAIN_PRAYERS.map((prayer) => (
          <PrayerCard
            key={prayer}
            prayer={prayer}
            timings={timings}
            settings={settings}
            isNext={prayer === nextPrayer}
          />
        ))}

        {/* Imsak & Midnight side by side, matching PrayerCard layout */}
        {(timings.Imsak || timings.Midnight) && (
          <div className="grid grid-cols-2 gap-3">
            {timings.Imsak && (
              <Container className="!p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Imsak</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatTime(timings.Imsak, settings.timeFormat)}
                  </p>
                </div>
              </Container>
            )}
            {timings.Midnight && (
              <Container className="!p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Midnight</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatTime(timings.Midnight, settings.timeFormat)}
                  </p>
                </div>
              </Container>
            )}
          </div>
        )}

        {/* Footer: method and manual location indicator */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          {methodLabel}
          {isUsingSavedLocation && " • Manual Location"}
        </p>
      </Container>
    </Layout>
  );
}