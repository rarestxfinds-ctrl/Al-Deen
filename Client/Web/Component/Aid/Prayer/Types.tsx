export interface PrayerTimesData {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak?: string;
  Midnight?: string;
}

export interface HijriDate {
  day: string;
  weekday: { en: string; ar: string };
  month: { number: number; en: string; ar: string };
  year: string;
  designation: { abbreviated: string; expanded: string };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface PrayerSettings {
  method: number;
  school: number;
  latitudeAdjustmentMethod: number;
  timeFormat: "12h" | "24h";
}

export type MainPrayer = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";