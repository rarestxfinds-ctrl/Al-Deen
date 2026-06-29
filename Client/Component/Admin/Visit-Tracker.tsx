import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const KEY = "lovable-visit-log";
const MAX_ENTRIES = 500;

export function VisitTracker() {
  const location = useLocation();
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const log: { route: string; ts: number }[] = raw ? JSON.parse(raw) : [];
      log.push({ route: location.pathname, ts: Date.now() });
      if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
      localStorage.setItem(KEY, JSON.stringify(log));
    } catch { /* ignore */ }
  }, [location.pathname]);
  return null;
}