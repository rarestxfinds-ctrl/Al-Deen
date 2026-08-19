// Source/Library/Service-Worker-Cache-Store.ts

const QURAN_CACHE_NAME = "Quran-Data-Cache-V2";
const HADITH_CACHE_NAME = "Hadith-Data-Cache-V1";

const Build_Cache_URL = (Namespace: string, Key: string | number): string =>
  `https://App-Cache.Local/${Namespace}/${encodeURIComponent(String(Key))}`;

// Generic Cache Handler accepting a specific cache name
const Read_Cached_JSON = async <T>(
  Cache_Name: string,
  Namespace: string,
  Key: string | number
): Promise<T | null> => {
  try {
    const Cache_Instance = await caches.open(Cache_Name);
    const Matched_Response = await Cache_Instance.match(Build_Cache_URL(Namespace, Key));
    if (!Matched_Response) return null;
    return (await Matched_Response.json()) as T;
  } catch {
    return null;
  }
};

const Write_Cached_JSON = async (
  Cache_Name: string,
  Namespace: string,
  Key: string | number,
  Data: unknown
): Promise<void> => {
  try {
    const Cache_Instance = await caches.open(Cache_Name);
    const Response_To_Store = new Response(JSON.stringify(Data), {
      headers: { "Content-Type": "application/json" },
    });
    await Cache_Instance.put(Build_Cache_URL(Namespace, Key), Response_To_Store);
  } catch {
    // Best-effort
  }
};

const Delete_Cached_Entry = async (
  Cache_Name: string,
  Namespace: string,
  Key: string | number
): Promise<void> => {
  try {
    const Cache_Instance = await caches.open(Cache_Name);
    await Cache_Instance.delete(Build_Cache_URL(Namespace, Key));
  } catch {
    // Best-effort
  }
};

// ==========================================
// --- QURAN CACHE HELPERS ---
// ==========================================

export const Get_Saved_Suwar_Metadata = <T>(Key: string | number): Promise<T | null> =>
  Read_Cached_JSON<T>(QURAN_CACHE_NAME, "Suwar-Metadata", Key);

export const Save_Suwar_Metadata_Locally = (Key: string | number, Data: unknown): Promise<void> =>
  Write_Cached_JSON(QURAN_CACHE_NAME, "Suwar-Metadata", Key, Data);

export const Get_Saved_Surah = <T>(Key: string | number): Promise<T | null> =>
  Read_Cached_JSON<T>(QURAN_CACHE_NAME, "Surah", Key);

export const Save_Surah_Locally = (Key: string | number, Data: unknown): Promise<void> =>
  Write_Cached_JSON(QURAN_CACHE_NAME, "Surah", Key, Data);

export const Get_Saved_Ayaat = <T>(Key: string): Promise<T | null> =>
  Read_Cached_JSON<T>(QURAN_CACHE_NAME, "Ayaat", Key);

export const Save_Ayaat_Locally = (Key: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON(QURAN_CACHE_NAME, "Ayaat", Key, Data);

export const Get_Saved_Kalimaat = <T>(Key: string): Promise<T | null> =>
  Read_Cached_JSON<T>(QURAN_CACHE_NAME, "Kalimaat", Key);

export const Save_Kalimaat_Locally = (Key: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON(QURAN_CACHE_NAME, "Kalimaat", Key, Data);

export const Delete_Saved_Kalimaat = (Key: string): Promise<void> =>
  Delete_Cached_Entry(QURAN_CACHE_NAME, "Kalimaat", Key);

export const Clear_Quran_Cache = (): Promise<boolean> => caches.delete(QURAN_CACHE_NAME);

export const Build_Surah_Key = (Surah_Number: number, Resource_ID?: string): string =>
  Resource_ID ? `${Surah_Number}::${Resource_ID}` : `${Surah_Number}`;

// ==========================================
// --- HADITH CACHE HELPERS ---
// ==========================================

export const Get_Saved_Hadith_Collections = <T>(Key: string = "All"): Promise<T | null> =>
  Read_Cached_JSON<T>(HADITH_CACHE_NAME, "Hadith-Collections", Key);

export const Save_Hadith_Collections_Locally = (Data: unknown, Key: string = "All"): Promise<void> =>
  Write_Cached_JSON(HADITH_CACHE_NAME, "Hadith-Collections", Key, Data);

export const Get_Saved_Hadith_Chapters = <T>(Collection_ID: string): Promise<T | null> =>
  Read_Cached_JSON<T>(HADITH_CACHE_NAME, "Hadith-Chapters", Collection_ID);

export const Save_Hadith_Chapters_Locally = (Collection_ID: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON(HADITH_CACHE_NAME, "Hadith-Chapters", Collection_ID, Data);

export const Get_Saved_Hadith_Chapter = <T>(Key: string): Promise<T | null> =>
  Read_Cached_JSON<T>(HADITH_CACHE_NAME, "Hadith-Chapter", Key);

export const Save_Hadith_Chapter_Locally = (Key: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON(HADITH_CACHE_NAME, "Hadith-Chapter", Key, Data);

export const Get_Saved_Hadith_Translation = <T>(Key: string): Promise<T | null> =>
  Read_Cached_JSON<T>(HADITH_CACHE_NAME, "Hadith-Translation", Key);

export const Save_Hadith_Translation_Locally = (Key: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON(HADITH_CACHE_NAME, "Hadith-Translation", Key, Data);

export const Get_Saved_Hadith_Transliteration = <T>(Key: string): Promise<T | null> =>
  Read_Cached_JSON<T>(HADITH_CACHE_NAME, "Hadith-Transliteration", Key);

export const Save_Hadith_Transliteration_Locally = (Key: string, Data: unknown): Promise<void> =>
  Write_Cached_JSON(HADITH_CACHE_NAME, "Hadith-Transliteration", Key, Data);

export const Clear_Hadith_Cache = (): Promise<boolean> => caches.delete(HADITH_CACHE_NAME);

export const Build_Hadith_Chapter_Key = (Collection_ID: string, Chapter_ID: number): string =>
  `${Collection_ID}::Chapter::${Chapter_ID}`;

export const Build_Hadith_Resource_Key = (
  Hadith_IDs: number[],
  Resource_Editions: string[],
  Include_WBW: boolean
): string => {
  const Sorted_IDs = [...Hadith_IDs].sort((a, b) => a - b).join(",");
  const Sorted_Editions = [...Resource_Editions].sort().join(",");
  return `${Sorted_IDs}::${Sorted_Editions}::wbw=${Include_WBW}`;
};