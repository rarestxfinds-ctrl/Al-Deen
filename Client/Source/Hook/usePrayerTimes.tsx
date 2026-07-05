import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Coordinates, CalculationMethod, PrayerTimes as AdhanPrayerTimes, Madhab, HighLatitudeRule, SunnahTimes } from "adhan";
import uq from "@umalqura/core";
import { useApp } from "@/Context/App";
import type { PrayerTimesData, HijriDate, LocationData, PrayerSettings } from "@/Component/Aid/Prayer/Types";

function methodFromId(id: number) {
  switch (id) {
    case 1: return CalculationMethod.Karachi();
    case 2: return CalculationMethod.NorthAmerica();
    case 3: return CalculationMethod.MuslimWorldLeague();
    case 4: return CalculationMethod.UmmAlQura();
    case 5: return CalculationMethod.Egyptian();
    case 7: case 0: return CalculationMethod.Tehran();
    case 8: case 16: return CalculationMethod.Dubai();
    case 9: return CalculationMethod.Kuwait();
    case 10: return CalculationMethod.Qatar();
    case 11: return CalculationMethod.Singapore();
    case 13: return CalculationMethod.Turkey();
    default: return CalculationMethod.MuslimWorldLeague();
  }
}

function fmt(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const HIJRI_MONTHS_EN = ["Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani","Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"];
const HIJRI_MONTHS_AR = ["محرم","صفر","ربيع الأول","ربيع الثاني","جمادى الأولى","جمادى الثانية","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const WEEKDAYS_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WEEKDAYS_AR = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

export function computeHijri(date: Date): HijriDate {
  const h = uq(date);
  return {
    day: String(h.hd),
    month: { number: h.hm, en: HIJRI_MONTHS_EN[h.hm - 1], ar: HIJRI_MONTHS_AR[h.hm - 1] },
    year: String(h.hy),
    weekday: { en: WEEKDAYS_EN[date.getDay()], ar: WEEKDAYS_AR[date.getDay()] },
    designation: { abbreviated: "AH", expanded: "Anno Hegirae" },
  };
}

export function usePrayerTimes() {
  const {
    prayerCalculationMethod,
    prayerSchool,
    prayerLatitudeMethod,
    prayerTimeFormat,
    prayerAutoLocation,
    prayerSavedLocation,
    setPrayerSavedLocation,
  } = useApp();

  const [location, setLocation] = useState<LocationData | null>(null);
  const [timings, setTimings] = useState<PrayerTimesData | null>(null);
  const [hijri, setHijri] = useState<HijriDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState("");

  // Ref to prevent multiple simultaneous fetches
  const isFetchingRef = useRef(false);
  const initialFetchDoneRef = useRef(false);

  // Memoize settings
  const settings = useMemo<PrayerSettings>(() => ({
    method: prayerCalculationMethod,
    school: prayerSchool,
    latitudeAdjustmentMethod: prayerLatitudeMethod,
    timeFormat: prayerTimeFormat,
  }), [prayerCalculationMethod, prayerSchool, prayerLatitudeMethod, prayerTimeFormat]);

  const fetchPrayerTimes = useCallback(async (lat: number, lng: number) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      setDateStr(`${dd}-${mm}-${yyyy}`);

      const coords = new Coordinates(lat, lng);
      const params = methodFromId(settings.method);
      params.madhab = settings.school === 1 ? Madhab.Hanafi : Madhab.Shafi;
      const hl = [HighLatitudeRule.MiddleOfTheNight, HighLatitudeRule.SeventhOfTheNight, HighLatitudeRule.TwilightAngle];
      params.highLatitudeRule = hl[Math.max(0, Math.min(2, settings.latitudeAdjustmentMethod - 1))] ?? HighLatitudeRule.MiddleOfTheNight;

      const pt = new AdhanPrayerTimes(coords, today, params);
      const sunnah = new SunnahTimes(pt);
      // Imsak ≈ Fajr - 10 minutes
      const imsak = new Date(pt.fajr.getTime() - 10 * 60 * 1000);

      setTimings({
        Fajr: fmt(pt.fajr),
        Sunrise: fmt(pt.sunrise),
        Dhuhr: fmt(pt.dhuhr),
        Asr: fmt(pt.asr),
        Maghrib: fmt(pt.maghrib),
        Isha: fmt(pt.isha),
        Imsak: fmt(imsak),
        Midnight: fmt(sunnah.middleOfTheNight),
      });

      setHijri(computeHijri(today));
    } catch (err) {
      console.error(err);
      setError("Failed to compute prayer times.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [settings]);

  // Separate function to get location and then fetch
  const requestLocation = useCallback(() => {
    if (isFetchingRef.current) return;

    // Use saved location if auto-location is disabled and saved location exists
    if (!prayerAutoLocation && prayerSavedLocation) {
      const loc = { 
        latitude: prayerSavedLocation.lat, 
        longitude: prayerSavedLocation.lng,
        city: prayerSavedLocation.city,
        country: prayerSavedLocation.country
      };
      setLocation(loc);
      fetchPrayerTimes(loc.latitude, loc.longitude);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        const city = tz.split("/").pop()?.replace(/_/g, " ") || "";
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city,
        };
        setLocation(loc);
        fetchPrayerTimes(loc.latitude, loc.longitude);
        if (prayerAutoLocation && !prayerSavedLocation) {
          setPrayerSavedLocation({ city, country: "", lat: loc.latitude, lng: loc.longitude });
        }
      },
      () => {
        setError("Unable to determine your location. Please select a location in Settings.");
        setLoading(false);
      },
      { timeout: 5000 }
    );
  }, [fetchPrayerTimes, prayerAutoLocation, prayerSavedLocation, setPrayerSavedLocation]);

  const setManualLocation = useCallback((lat: number, lng: number, city: string, country: string) => {
    const loc = { latitude: lat, longitude: lng, city, country };
    setLocation(loc);
    setError(null);
    fetchPrayerTimes(lat, lng);
    
    if (!prayerAutoLocation) {
      setPrayerSavedLocation({ city, country, lat, lng });
    }
  }, [fetchPrayerTimes, prayerAutoLocation, setPrayerSavedLocation]);

  // One-time initial fetch
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array ensures it runs once

  // Re-fetch when calculation settings change, but only if we have a location
  const prevSettingsRef = useRef(settings);
  useEffect(() => {
    if (location && (
      prevSettingsRef.current.method !== settings.method ||
      prevSettingsRef.current.school !== settings.school ||
      prevSettingsRef.current.latitudeAdjustmentMethod !== settings.latitudeAdjustmentMethod
    )) {
      prevSettingsRef.current = settings;
      fetchPrayerTimes(location.latitude, location.longitude);
    }
  }, [settings.method, settings.school, settings.latitudeAdjustmentMethod, location, fetchPrayerTimes]);

  const methodLabel = useMemo(() => {
    const methods: Record<number, string> = {
      0: "Shia Ithna-Ashari",
      1: "University of Islamic Sciences, Karachi",
      2: "Islamic Society of North America (ISNA)",
      3: "Muslim World League (MWL)",
      4: "Umm Al-Qura University, Makkah",
      5: "Egyptian General Authority of Survey",
    };
    return methods[settings.method] || "Unknown";
  }, [settings.method]);

  return {
    location,
    timings,
    hijri,
    loading,
    error,
    dateStr,
    settings,
    requestLocation,
    setManualLocation,
    methodLabel,
    isUsingSavedLocation: !prayerAutoLocation && !!prayerSavedLocation,
  };
}