// Source/Library/Service-Worker-Cache-Store.ts
//
// Replaces the old IndexedDB-Store module. All persistence now goes through
// the Cache Storage API (the same cache a Service Worker would read from),
// so data survives reloads without needing an IndexedDB connection.

const CACHE_NAME = "Quran-Data-Cache-V2";

// The Cache API only stores Request/Response pairs, so every logical
// "table + key" pair is mapped onto a synthetic same-origin-looking URL.
const Build_Cache_URL = (Namespace: string, Key: string | number): string =>
  `https://Quran-Cache.Local/${Namespace}/${encodeURIComponent(String(Key))}`;

const Open_Cache = (): Promise<Cache> => caches.open(CACHE_NAME);

const Read_Cached_JSON = async <T>(
  Namespace: string,
  Key: string | number
): Promise<T | null> => {
  try {
    const Cache_Instance = await Open_Cache();
    const Matched_Response = await Cache_Instance.match(Build_Cache_URL(Namespace, Key));
    if (!Matched_Response) return null;
    return (await Matched_Response.json()) as T;
  } catch {
    // Cache Storage is unavailable (e.g. private browsing) — treat as a miss.
    return null;
  }
};

const Write_Cached_JSON = async (
  Namespace: string,
  Key: string | number,
  Data: unknown
): Promise<void> => {
  try {
    const Cache_Instance = await Open_Cache();
    const Response_To_Store = new Response(JSON.stringify(Data), {
      headers: { "Content-Type": "application/json" },
    });
    await Cache_Instance.put(Build_Cache_URL(Namespace, Key), Response_To_Store);
  } catch {
    // Caching is best-effort; a failed write should never break the caller.
  }
};

const Delete_Cached_Entry = async (Namespace: string, Key: string | number): Promise<void> => {
  try {
    const Cache_Instance = await Open_Cache();
    await Cache_Instance.delete(Build_Cache_URL(Namespace, Key));
  } catch {
    // Best-effort.
  }
};

// --- Suwar Metadata ---

export const Get_Saved_Suwar_Metadata = <T>(Key: string | number): Promise<T | null> =>
  Read_Cached_JSON<T>("Suwar-Metadata", Key);

export const Save_Suwar_Metadata_Locally = (Key: string | number, Data: unknown): Promise<void> =>
  Write_Cached_JSON("Suwar-Metadata", Key, Data);

// --- Surah ---

export const Get_Saved_Surah = <T>(Key: string | number): Promise<T | null> =>
  Read_Cached_JSON<T>("Surah", Key);

export const Save_Surah_Locally = (Key: string | number, Data: unknown): Promise<void> =>
  Write_Cached_JSON("Surah", Key, Data);

// --- Ayaat ---

export const Get_Saved_Ayaat = <T>(Key: string): Promise<T | null> =>
  Read_Cached_JSON<T>("Ayaat", Key);

export const Save_Ayaat_Locally = (Key: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON("Ayaat", Key, Data);

// --- Kalimaat ---

export const Get_Saved_Kalimaat = <T>(Key: string): Promise<T | null> =>
  Read_Cached_JSON<T>("Kalimaat", Key);

export const Save_Kalimaat_Locally = (Key: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON("Kalimaat", Key, Data);

export const Delete_Saved_Kalimaat = (Key: string): Promise<void> =>
  Delete_Cached_Entry("Kalimaat", Key);

// --- Shared Key Builder ---

export const Build_Surah_Key = (Surah_Number: number, Resource_ID?: string): string =>
  Resource_ID ? `${Surah_Number}::${Resource_ID}` : `${Surah_Number}`;