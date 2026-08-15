import { Sun, Sunrise, Sunset, Moon } from "lucide-react";
import type { MainPrayer } from "./Types";

export const DEFAULT_SETTINGS = {
  method: 2,
  school: 0,
  latitudeAdjustmentMethod: 3,
  timeFormat: "12h" as const,
};

export const CALCULATION_METHODS = [
  { value: 0, label: "Shia Ithna-Ashari" },
  { value: 1, label: "University of Islamic Sciences, Karachi" },
  { value: 2, label: "Islamic Society of North America (ISNA)" },
  { value: 3, label: "Muslim World League (MWL)" },
  { value: 4, label: "Umm Al-Qura University, Makkah" },
  { value: 5, label: "Egyptian General Authority of Survey" },
  { value: 7, label: "Institute of Geophysics, University of Tehran" },
  { value: 8, label: "Gulf Region" },
  { value: 9, label: "Kuwait" },
  { value: 10, label: "Qatar" },
  { value: 11, label: "Majlis Ugama Islam Singapura" },
  { value: 12, label: "Union Organization Islamic de France" },
  { value: 13, label: "Diyanet İşleri Başkanlığı, Turkey" },
  { value: 14, label: "Spiritual Administration of Muslims of Russia" },
  { value: 15, label: "Moonsighting Committee Worldwide" },
  { value: 16, label: "Dubai" },
  { value: 17, label: "JAKIM, Malaysia" },
  { value: 18, label: "Tunisia" },
  { value: 19, label: "Algeria" },
  { value: 20, label: "KEMENAG, Indonesia" },
  { value: 21, label: "Morocco" },
  { value: 22, label: "Comunidade Islamica de Lisboa" },
  { value: 23, label: "Ministry of Awqaf and Islamic Affairs, Jordan" },
  { value: 99, label: "Custom" },
];

export const SCHOOLS = [
  { value: 0, label: "Shafi'i / Standard" },
  { value: 1, label: "Hanafi" },
];

export const LAT_METHODS = [
  { value: 1, label: "Middle of the Night" },
  { value: 2, label: "One Seventh" },
  { value: 3, label: "Angle Based" },
];

export const MAIN_PRAYERS: MainPrayer[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

export const PRAYER_ICONS: Record<MainPrayer, typeof Sun> = {
  Fajr: Sunrise,
  Sunrise: Sun,
  Dhuhr: Sun,
  Asr: Sun,
  Maghrib: Sunset,
  Isha: Moon,
};

export const PRAYER_ARABIC: Record<MainPrayer, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

export const PRAYER_GRADIENTS: Record<MainPrayer, string> = {
  Fajr: "from-blue-500/10 to-indigo-500/10",
  Sunrise: "from-amber-400/10 to-orange-400/10",
  Dhuhr: "from-yellow-400/10 to-amber-400/10",
  Asr: "from-orange-400/10 to-amber-500/10",
  Maghrib: "from-rose-500/10 to-orange-500/10",
  Isha: "from-indigo-600/10 to-purple-600/10",
};