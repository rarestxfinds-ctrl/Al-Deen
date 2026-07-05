import { useState, useEffect, useCallback } from "react";

const KEY = "arabic-vocab-bookmarks";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useArabicBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setBookmarks(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = (next: string[]) => {
    setBookmarks(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const isBookmarked = useCallback((key: string) => bookmarks.includes(key), [bookmarks]);

  const toggle = useCallback(
    (key: string) => {
      const next = bookmarks.includes(key)
        ? bookmarks.filter((k) => k !== key)
        : [...bookmarks, key];
      persist(next);
    },
    [bookmarks]
  );

  return { bookmarks, isBookmarked, toggle };
}
