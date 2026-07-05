import { PrayerTimesTab } from "./Tab/PrayerTimes";
import { DuaTab } from "./Tab/Dua";
import type { AidSubcategory } from "./Types";

interface AidSectionProps {
  activeSubcategory: AidSubcategory;
}

export function AidSection({ activeSubcategory }: AidSectionProps) {
  const renderActiveContent = () => {
    switch (activeSubcategory) {
      case "dua":
        return <DuaTab />;
      case "prayer-times":
        return <PrayerTimesTab />;
      default:
        return null;
    }
  };

  return <div className="space-y-4">{renderActiveContent()}</div>;
}