import { useState, useEffect, useCallback, useMemo } from "react";
import { Compass, Navigation, AlertCircle, Loader2 } from "lucide-react";

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function calculateQiblaDirection(lat: number, lng: number): number {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABA_LAT * Math.PI) / 180;
  const Δλ = ((KAABA_LNG - lng) * Math.PI) / 180;
  const x = Math.sin(Δλ);
  const y = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  let qibla = (Math.atan2(x, y) * 180) / Math.PI;
  return (qibla + 360) % 360;
}

function getDistance(lat: number, lng: number): number {
  const R = 6371;
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABA_LAT * Math.PI) / 180;
  const Δφ = ((KAABA_LAT - lat) * Math.PI) / 180;
  const Δλ = ((KAABA_LNG - lng) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface QiblaCompassProps {
  latitude: number;
  longitude: number;
}

export function QiblaCompass({ latitude, longitude }: QiblaCompassProps) {
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");
  const [loading, setLoading] = useState(false);

  const qiblaAngle = calculateQiblaDirection(latitude, longitude);
  const distance = getDistance(latitude, longitude);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // Use webkitCompassHeading for iOS, alpha for Android
    const heading = (e as any).webkitCompassHeading ?? (e.alpha != null ? (360 - e.alpha) % 360 : null);
    if (heading != null) {
      setCompassHeading(heading);
      setPermissionState("granted");
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setLoading(true);
    try {
      // iOS 13+ requires explicit permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
          setPermissionState("granted");
        } else {
          setPermissionState("denied");
        }
      } else {
        // Android / desktop — just listen
        window.addEventListener("deviceorientation", handleOrientation, true);
        // Give it a moment to see if we get data
        setTimeout(() => {
          setLoading(false);
        }, 1500);
        return;
      }
    } catch {
      setPermissionState("unsupported");
    }
    setLoading(false);
  }, [handleOrientation]);

  // Auto-listen on non-iOS devices
  useEffect(() => {
    if (typeof (DeviceOrientationEvent as any).requestPermission !== "function") {
      window.addEventListener("deviceorientation", handleOrientation, true);
      // Check after a delay if we got any data
      const timeout = setTimeout(() => {
        setCompassHeading((prev) => {
          if (prev === null) setPermissionState("unsupported");
          return prev;
        });
      }, 2000);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener("deviceorientation", handleOrientation, true);
      };
    }
  }, [handleOrientation]);

  // Memoize tick marks (static, never changes)
  const tickMarks = useMemo(() => Array.from({ length: 72 }).map((_, i) => (
    <div
      key={i}
      className="absolute top-0 left-1/2 origin-bottom"
      style={{ transform: `translateX(-50%) rotate(${i * 5}deg)`, height: "50%" }}
    >
      <div className={`w-px ${i % 6 === 0 ? "h-2 bg-muted-foreground/50" : "h-1 bg-border/50"}`} />
    </div>
  )), []);

  // Needle rotation: point from current heading toward qibla
  const needleRotation = compassHeading != null ? qiblaAngle - compassHeading : 0;

  return (
    <div className="glass-card !block overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Qibla Direction</h3>
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* Compass Visual */}
          <div className="relative w-48 h-48">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-border/30" />
            
            {/* Cardinal directions — rotate with compass */}
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${compassHeading != null ? -compassHeading : 0}deg)` }}
            >
              {/* N */}
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-primary">N</span>
              {/* E */}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">E</span>
              {/* S */}
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">S</span>
              {/* W */}
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">W</span>
              
              {/* Tick marks */}
              {tickMarks}
            </div>

            {/* Qibla needle — always points toward Kaaba */}
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${needleRotation}deg)` }}
            >
              {/* Needle */}
              <div className="absolute left-1/2 top-4 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[16px] border-l-transparent border-r-transparent border-b-primary drop-shadow-lg" />
              {/* Needle line */}
              <div className="absolute left-1/2 top-[20px] -translate-x-1/2 w-0.5 bg-primary/60" style={{ height: "calc(50% - 20px)" }} />
            </div>

            {/* Center Kaaba icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-base">🕋</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold tabular-nums">{qiblaAngle.toFixed(1)}°</p>
            <p className="text-xs text-muted-foreground">
              {Math.round(distance).toLocaleString()} km to Makkah
            </p>
          </div>

          {/* Status / Permission */}
          {compassHeading != null ? (
            <p className="text-xs text-foreground flex items-center gap-1">
              <Navigation className="h-3 w-3" /> Compass active
            </p>
          ) : permissionState === "prompt" && typeof (DeviceOrientationEvent as any).requestPermission === "function" ? (
            <button
              onClick={requestPermission}
              disabled={loading}
              className="glass-btn px-4 py-2 text-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Compass className="h-3.5 w-3.5" />}
              Enable Compass
            </button>
          ) : permissionState === "unsupported" || permissionState === "denied" ? (
            <div className="text-center">
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                <AlertCircle className="h-3 w-3" />
                {permissionState === "denied" ? "Compass permission denied" : "Compass not available on this device"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The arrow above shows {qiblaAngle.toFixed(1)}° from North
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Detecting compass...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
