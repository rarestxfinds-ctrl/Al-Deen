// Component/Settings/Content/Aid/Tab/PrayerTimes.tsx
import { useState } from "react";
import { Clock, MapPin, Search, X } from "lucide-react";
import { Switch } from "@Web/Component/UI/Switch";
import { Card } from "@Web/Component/UI/Card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@Web/Component/UI/Select";
import { Button } from "@Web/Component/UI/Button";
import { useApp } from "@Web/Context/App";

const CALCULATION_METHODS = [
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

const SCHOOLS = [
  { value: 0, label: "Shafi'i / Standard" },
  { value: 1, label: "Hanafi" },
];

const LAT_METHODS = [
  { value: 1, label: "Middle of the Night" },
  { value: 2, label: "One Seventh" },
  { value: 3, label: "Angle Based" },
];

interface LocationSuggestion {
  name: string;
  country: string;
  lat: number;
  lon: number;
  state?: string;
}

export function PrayerTimesTab() {
  const {
    prayerCalculationMethod,
    setPrayerCalculationMethod,
    prayerSchool,
    setPrayerSchool,
    prayerLatitudeMethod,
    setPrayerLatitudeMethod,
    prayerTimeFormat,
    setPrayerTimeFormat,
    prayerAutoLocation,
    setPrayerAutoLocation,
    prayerSavedLocation,
    setPrayerSavedLocation,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchCities = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const results: LocationSuggestion[] = data.results.map((item: any) => ({
          name: item.name,
          country: item.country,
          lat: item.latitude,
          lon: item.longitude,
          state: item.admin1,
        }));
        setSuggestions(results);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    setPrayerSavedLocation({
      city: suggestion.name,
      country: suggestion.country,
      lat: suggestion.lat,
      lng: suggestion.lon,
    });
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setPrayerAutoLocation(false);
  };

  const handleClearLocation = () => {
    setPrayerSavedLocation(null);
    setPrayerAutoLocation(true);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Prayer Times</h3>
        </div>
      </div>

      {/* Location Selection */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Location</p>
        </div>
        
        {/* Location Mode Selector */}
        <div className="flex gap-2 mb-3">
          <Card
            onClick={() => setPrayerAutoLocation(true)}
            className={`
              flex-1 py-2.5 px-4 text-center cursor-pointer transition-all group
              ${prayerAutoLocation ? "bg-black dark:bg-white text-white dark:text-black" : ""}
            `}
          >
            <span className={`text-sm font-medium ${prayerAutoLocation ? "text-white dark:text-black" : "text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black"}`}>
              Auto Location
            </span>
          </Card>
          <Card
            onClick={() => setPrayerAutoLocation(false)}
            className={`
              flex-1 py-2.5 px-4 text-center cursor-pointer transition-all group
              ${!prayerAutoLocation ? "bg-black dark:bg-white text-white dark:text-black" : ""}
            `}
          >
            <span className={`text-sm font-medium ${!prayerAutoLocation ? "text-white dark:text-black" : "text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black"}`}>
              Manual Location
            </span>
          </Card>
        </div>

        {/* Manual Location Search */}
        {!prayerAutoLocation && (
          <Card className="p-4 space-y-3">
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchCities(e.target.value);
                  }}
                  placeholder="Search for a city..."
                  className="w-full pl-10 pr-10 py-2 rounded-[40px] bg-muted/30 border-2 border-black dark:border-white text-sm outline-none focus:border-primary transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSuggestions([]);
                      setShowDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              
              {showDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-black border-2 border-black dark:border-white rounded-[20px] shadow-lg max-h-60 overflow-y-auto">
                  {isSearching ? null : suggestions.length > 0 ? (
                    suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectLocation(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors first:rounded-t-[20px] last:rounded-b-[20px]"
                      >
                        <p className="font-medium text-sm">
                          {suggestion.name}
                          {suggestion.state && <span className="text-muted-foreground">, {suggestion.state}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{suggestion.country}</p>
                      </button>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No locations found. Try a different name.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {prayerSavedLocation && (
              <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                <div>
                  <p className="text-xs text-muted-foreground">Selected Location</p>
                  <p className="text-sm font-medium">
                    {prayerSavedLocation.city}
                    {prayerSavedLocation.country && `, ${prayerSavedLocation.country}`}
                  </p>
                </div>
                <Button onClick={handleClearLocation} variant="ghost" size="sm">
                  Clear
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Calculation Method */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Calculation Method</p>
        </div>
        <Card className="py-2.5 px-4 transition-all group">
          <Select 
            value={String(prayerCalculationMethod)} 
            onValueChange={(v) => setPrayerCalculationMethod(Number(v))}
          >
            <SelectTrigger className="bg-transparent border-0 p-0 h-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALCULATION_METHODS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* Asr Juristic Method */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Asr Juristic Method</p>
        </div>
        <Card className="py-2.5 px-4 transition-all group">
          <Select 
            value={String(prayerSchool)} 
            onValueChange={(v) => setPrayerSchool(Number(v))}
          >
            <SelectTrigger className="bg-transparent border-0 p-0 h-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHOOLS.map((s) => (
                <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* High Latitude Rule */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">High Latitude Rule</p>
        </div>
        <Card className="py-2.5 px-4 transition-all group">
          <Select 
            value={String(prayerLatitudeMethod)} 
            onValueChange={(v) => setPrayerLatitudeMethod(Number(v))}
          >
            <SelectTrigger className="bg-transparent border-0 p-0 h-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAT_METHODS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* Time Format */}
      <div className="space-y-1.5">
        <div className="relative rounded-[40px] bg-white dark:bg-black border-2 border-black dark:border-white transition-all duration-200 py-1 px-3 inline-flex">
          <p className="text-xs font-medium text-foreground">Time Format</p>
        </div>
        <div className="flex gap-2">
          {(["12h", "24h"] as const).map((fmt) => (
            <Card
              key={fmt}
              onClick={() => setPrayerTimeFormat(fmt)}
              className={`
                flex-1 py-2.5 px-4 text-center cursor-pointer transition-all group
                ${prayerTimeFormat === fmt ? "bg-black dark:bg-white text-white dark:text-black" : ""}
              `}
            >
              <span className={`text-sm font-medium ${prayerTimeFormat === fmt ? "text-white dark:text-black" : "text-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black"}`}>
                {fmt === "12h" ? "12-hour" : "24-hour"}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}