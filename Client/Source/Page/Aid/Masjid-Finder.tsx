import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";
import { MapPin, Navigation, AlertCircle, ExternalLink } from "lucide-react";

interface Masjid {
  id: number;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address?: string;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function MasjidFinder() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);

  const fetchMasjids = useCallback(async (lat: number, lon: number, radius: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = radius * 1000;
      const query = `[out:json][timeout:25];(
        node["amenity"="place_of_worship"]["religion"="muslim"](around:${r},${lat},${lon});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:${r},${lat},${lon});
        relation["amenity"="place_of_worship"]["religion"="muslim"](around:${r},${lat},${lon});
      );out center tags;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data = await res.json();
      const elements: any[] = data.elements || [];
      const items: Masjid[] = elements
        .map((el) => {
          const elat = el.lat ?? el.center?.lat;
          const elon = el.lon ?? el.center?.lon;
          if (typeof elat !== "number" || typeof elon !== "number") return null;
          const tags = el.tags || {};
          const addr = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
            .filter(Boolean)
            .join(" ");
          return {
            id: el.id,
            name: tags.name || tags["name:en"] || "Unnamed Masjid",
            lat: elat,
            lon: elon,
            distanceKm: haversine(lat, lon, elat, elon),
            address: addr || undefined,
          } as Masjid;
        })
        .filter(Boolean) as Masjid[];
      items.sort((a, b) => a.distanceKm - b.distanceKm);
      setMasjids(items.slice(0, 50));
    } catch (e) {
      console.error(e);
      setError("Failed to load nearby masjids. Try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lon: p.coords.longitude };
        setCoords(c);
        fetchMasjids(c.lat, c.lon, radiusKm);
      },
      () => {
        setError("Could not determine your location.");
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }, [fetchMasjids, radiusKm]);

  useEffect(() => { locate(); }, []); // eslint-disable-line

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto py-6 space-y-4">
        <Container className="!py-3 !px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold truncate">Masjid Finder</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              className="bg-background border rounded-full text-xs px-3 py-1.5"
              value={radiusKm}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRadiusKm(v);
                if (coords) fetchMasjids(coords.lat, coords.lon, v);
              }}
            >
              {[2, 5, 10, 25, 50].map((r) => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>
            <Button size="sm" onClick={locate} className="rounded-full">Refresh</Button>
          </div>
        </Container>

        {loading ? null : error ? (
          <Container className="p-8 text-center flex flex-col items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={locate} variant="outline">Try Again</Button>
          </Container>
        ) : masjids.length === 0 ? (
          <Container className="p-8 text-center text-muted-foreground">
            No masjids found within {radiusKm} km. Try increasing the radius.
          </Container>
        ) : (
          <div className="space-y-2">
            {masjids.map((m) => (
              <Container key={m.id} className="!p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{m.name}</p>
                  {m.address && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {m.address}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.distanceKm.toFixed(2)} km away
                  </p>
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=18/${m.lat}/${m.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs underline"
                >
                  Map <ExternalLink className="h-3 w-3" />
                </a>
              </Container>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}