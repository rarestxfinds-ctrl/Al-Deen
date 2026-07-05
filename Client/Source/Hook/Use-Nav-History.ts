// Layer/Middle/Hook/Use-Nav-History.ts
// Singleton in-memory navigation history for de-duplicated "back" behavior.
//
// We track every distinct path the user lands on (consecutive duplicates are
// collapsed). When the user clicks Back, we pop entries off the stack until
// we find one that differs from the current path, then return it.
// If nothing remains, the caller can fall back to URL-segment climbing.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const stack: string[] = [];
let lastBackTarget: string | null = null;

/** Climb one URL segment. Returns "/" when at the root. */
function climbOneSegment(path: string): string {
  const segments = path.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  segments.pop();
  return "/" + segments.join("/");
}

export const navHistory = {
  push(path: string) {
    if (stack[stack.length - 1] === path) return;
    if (stack.length >= 2 && stack[stack.length - 2] === path) {
      stack.pop();
      return;
    }
    stack.push(path);
    if (stack.length > 100) stack.splice(0, stack.length - 100);
  },
  /**
   * Pop entries equal to currentPath, then return the next distinct path
   * (also popping it). If the result would ping-pong with the previous back
   * target, climb one URL segment instead. Returns null if nothing useful.
   */
  popDistinct(currentPath: string): string | null {
    while (stack.length && stack[stack.length - 1] === currentPath) stack.pop();
    while (stack.length >= 2 && stack[stack.length - 1] === stack[stack.length - 2]) stack.pop();
    const next = stack.pop();
    const candidate = next && next !== currentPath ? next : null;

    // Ping-pong detection: if going back would re-target the same path we
    // just back-navigated to, climb one slug instead.
    if (candidate && candidate === lastBackTarget) {
      const climbed = climbOneSegment(currentPath);
      lastBackTarget = climbed;
      return climbed;
    }
    if (candidate) {
      lastBackTarget = candidate;
      return candidate;
    }
    // No history → climb one slug as the safe default.
    const climbed = climbOneSegment(currentPath);
    if (climbed === currentPath) return null;
    lastBackTarget = climbed;
    return climbed;
  },
  resetPingPong() {
    lastBackTarget = null;
  },
  size() {
    return stack.length;
  },
};

/** Mount once near the router root to record visits. */
export function useNavHistoryTracker() {
  const location = useLocation();
  useEffect(() => {
    navHistory.push(location.pathname);
  }, [location.pathname]);
}
