// Source/Library/Hadith-API.ts
import type {
  Collection_Info,
  Chapter,
  Narration,
  Translation,
  WBW_Translation,
  Transliteration,
  WBW_Transliteration,
  Edition,
  Chapter_Data,
  Translation_Data,
  Transliteration_Data,
  Hadith_Composite,
} from "./Hadith-Types";

import {
  Get_Saved_Hadith_Collections,
  Save_Hadith_Collections_Locally,
  Get_Saved_Hadith_Chapters,
  Save_Hadith_Chapters_Locally,
  Get_Saved_Hadith_Chapter,
  Save_Hadith_Chapter_Locally,
  Get_Saved_Hadith_Translation,
  Save_Hadith_Translation_Locally,
  Get_Saved_Hadith_Transliteration,
  Save_Hadith_Transliteration_Locally,
  Build_Hadith_Chapter_Key,
  Build_Hadith_Resource_Key,
} from "./Service-Worker-Cache-Store";

const API_BASE_PATH = "/API/Hadith";
const DEBUG_HADITH_API = true;

const Debug_Log = (...Args: unknown[]) => {
  if (DEBUG_HADITH_API) {
    console.log(...Args);
  }
};

const Debug_Warn = (...Args: unknown[]) => {
  if (DEBUG_HADITH_API) {
    console.warn(...Args);
  }
};

// --- Type Extensions ---

export type Translations = Translation[];
export type Transliterations = Transliteration[];
export type Editions = Edition[];

export interface Translation_List_Entry {
  ID: string;
  Name: string;
  Language: string;
}

export interface Transliteration_List_Entry {
  ID: string;
  Name: string;
  Language: string;
}

// --- Generic Memoization Helper ---
// (identical to Quran-API.ts's Memoize — kept local so this file has no
// runtime dependency on Quran-API.ts)

function Memoize<T>(Producer: () => Promise<T>): () => Promise<T> {
  let Promise_Instance: Promise<T> | null = null;
  return () => {
    if (!Promise_Instance) {
      Promise_Instance = Producer();
      Promise_Instance.catch(() => {
        Promise_Instance = null;
      });
    }
    return Promise_Instance;
  };
}

// --- Resource Result Types ---

export interface Translation_Resource_Result {
  Hadith?: Translation[];
  Word?: WBW_Translation[];
}

export interface Transliteration_Resource_Result {
  Hadith?: Transliteration[];
  Word?: WBW_Transliteration[];
}

// --- Entry Formatting Utilities ---

const Format_Collection_Entry = (Entry: any): Collection_Info | null => {
  if (!Entry) return null;

  return {
    ID: Entry["ID"],
    Name: Entry["Name"],
    Category: Entry["Category"],
  };
};

// --- Available Hadith Collections ---
// Network-first, falling back to the Service Worker Cache when offline —
// mirrors Fetch_Suwar in Quran-API.ts, since this is the top-level
// "list everything" fetch that should stay fresh whenever a connection is
// available.
//
// NOTE: Save_Hadith_Collections_Locally takes (Data, Key) — the opposite
// argument order from the Quran side's Save_Suwar_Metadata_Locally(Key,
// Data). Getting this backwards silently writes the collections list under
// the wrong cache key and breaks the offline fallback below.
export const Fetch_Collections: () => Promise<Collection_Info[]> = Memoize(async () => {
  const COLLECTIONS_KEY = "All";

  try {
    const Response = await fetch(`${API_BASE_PATH}?Available-Collections=true`);
    if (!Response.ok) throw new Error(`HTTP ${Response.status}`);
    const Data = await Response.json();
    const Rows = Data["Available-Collections"] || Data;
    const Formatted_List = (Rows as any[]).map(Format_Collection_Entry).filter(Boolean) as Collection_Info[];

    await Save_Hadith_Collections_Locally(Formatted_List, COLLECTIONS_KEY);

    return Formatted_List;
  } catch (Err) {
    Debug_Warn("[Hadith-API] Network request failed for Collections, checking Service Worker Cache...", Err);

    const Cached = await Get_Saved_Hadith_Collections<Collection_Info[]>(COLLECTIONS_KEY);
    if (Cached) return Cached;

    throw new Error("No network connection available and no cached Collections found.");
  }
});

// --- Chapters (per Collection) ---
// Cache-first, falling through to the network — mirrors Get_Surah, since
// this is a scoped lookup keyed by a single Collection_ID rather than a
// "fetch everything" call.
export const Get_Chapters = async (Collection_ID: string): Promise<Chapter[] | null> => {
  const Cached = await Get_Saved_Hadith_Chapters<Chapter[]>(Collection_ID);
  if (Cached) return Cached;

  try {
    const Response = await fetch(`${API_BASE_PATH}?Collection=${encodeURIComponent(Collection_ID)}`);
    if (!Response.ok) return null;
    const Data = await Response.json();
    const Chapters = (Data["Chapters"] || Data) as Chapter[];

    await Save_Hadith_Chapters_Locally(Collection_ID, Chapters);
    return Chapters;
  } catch (Err) {
    Debug_Warn(`[Hadith-API] Failed to fetch Chapters for Collection ${Collection_ID}:`, Err);
    return null;
  }
};

// --- Single Chapter (with its Narrations) ---
export const Get_Chapter = async (
  Collection_ID: string,
  Chapter_ID: number
): Promise<Chapter_Data | null> => {
  const Key = Build_Hadith_Chapter_Key(Collection_ID, Chapter_ID);
  const Cached = await Get_Saved_Hadith_Chapter<Chapter_Data>(Key);
  if (Cached) return Cached;

  try {
    const Response = await fetch(
      `${API_BASE_PATH}?Collection=${encodeURIComponent(Collection_ID)}&Chapter=${Chapter_ID}`
    );
    if (!Response.ok) return null;
    const Data: Chapter_Data = await Response.json();

    await Save_Hadith_Chapter_Locally(Key, Data);
    return Data;
  } catch (Err) {
    Debug_Warn(`[Hadith-API] Failed to fetch Chapter ${Chapter_ID} in ${Collection_ID}:`, Err);
    return null;
  }
};

// --- Single Narration (Arabic text only) ---
// No dedicated Service Worker Cache store exists for a single, un-chaptered
// narration lookup — only full Chapters and full per-Collection Chapter
// lists are cached — so this always goes straight to the network.
// Requires Collection_ID because the Arabic text lives in a per-collection
// database on the server (see Fetch_Narration in Hadith.ts); the ID alone
// is not enough to locate it.
export const Get_Narration = async (
  Collection_ID: string,
  Hadith_ID: number
): Promise<Narration | null> => {
  try {
    const Response = await fetch(
      `${API_BASE_PATH}?Collection=${encodeURIComponent(Collection_ID)}&ID=${Hadith_ID}`
    );
    if (!Response.ok) return null;
    const Data: Narration = await Response.json();
    return Data;
  } catch (Err) {
    Debug_Warn(`[Hadith-API] Failed to fetch Narration ${Hadith_ID} in ${Collection_ID}:`, Err);
    return null;
  }
};

// --- Translation / Transliteration Resource Definitions ---
// Unlike the Quran side, a Hadith Translation/Transliteration row only
// carries a single "Edition" field (no separate Translator/Provider meta
// key), so the resource definition here is simpler — just the query param
// name and the two response JSON keys, plus the matching pair of cache
// helpers to read/write through.

interface Hadith_Resource_Definition {
  Verse_Param: "Translation" | "Transliteration";
  Verse_JSON_Key: "Translations" | "Transliterations";
  Word_JSON_Key: "WBW_Translations" | "WBW_Transliterations";
  Cache_Get: <T>(Key: string) => Promise<T | null>;
  Cache_Save: (Key: string, Data: unknown) => Promise<void>;
}

const TRANSLATION_RESOURCE: Hadith_Resource_Definition = {
  Verse_Param: "Translation",
  Verse_JSON_Key: "Translations",
  Word_JSON_Key: "WBW_Translations",
  Cache_Get: Get_Saved_Hadith_Translation,
  Cache_Save: Save_Hadith_Translation_Locally,
};

const TRANSLITERATION_RESOURCE: Hadith_Resource_Definition = {
  Verse_Param: "Transliteration",
  Verse_JSON_Key: "Transliterations",
  Word_JSON_Key: "WBW_Transliterations",
  Cache_Get: Get_Saved_Hadith_Transliteration,
  Cache_Save: Save_Hadith_Transliteration_Locally,
};

// --- Unified Per-Edition Resource Fetcher ---
// Handles verse-level (Hadith) text and, optionally, word-by-word (WBW)
// text for a single Translation or Transliteration edition, across one or
// more Hadith IDs. Reads/writes through the Service Worker Cache and
// re-fetches from the network when the cache is empty or incomplete.
//
// Translation/Transliteration lookups are keyed purely by global Hadith
// ID(s) — no Collection scoping is required or sent, matching the server's
// /API/Hadith route (the translation/transliteration branch only checks
// for `ID` + `Translation`/`Transliteration`, never `Collection`) and
// Fetch_Hadith_Translation/Fetch_Hadith_Transliteration in Hadith.ts, which
// query the per-edition DB by ID alone.
const Fetch_Single_Hadith_Resource = async (
  Resource: Hadith_Resource_Definition,
  Hadith_IDs: number[],
  Edition: string,
  Need_Verse: boolean,
  Need_Word: boolean
): Promise<{ Hadith?: any[]; Word?: any[] }> => {
  Debug_Log(`[${Resource.Verse_Param}] Fetch_Single_Hadith_Resource IN →`, {
    Hadith_IDs,
    Edition,
    Need_Verse,
    Need_Word,
  });

  // One cache entry holds both the verse-level and (if requested) the WBW
  // rows for this exact (IDs, Edition, WBW) combination — Build_Hadith_
  // Resource_Key folds all three into a single deterministic key.
  const Cache_Key = Build_Hadith_Resource_Key(Hadith_IDs, [Edition], Need_Word);

  const Cached = await Resource.Cache_Get<{ Hadith?: any[]; Word?: any[] }>(Cache_Key);
  const Satisfies_Verse = !Need_Verse || Boolean(Cached?.Hadith?.length);
  const Satisfies_Word = !Need_Word || Boolean(Cached?.Word?.length);

  if (Cached && Satisfies_Verse && Satisfies_Word) {
    Debug_Log(`[${Resource.Verse_Param}] Fetch_Single_Hadith_Resource OUT (cache hit) →`, {
      Hadith_IDs,
      Edition,
      Hadith_Count: Cached.Hadith?.length ?? 0,
      Word_Count: Cached.Word?.length ?? 0,
    });
    return Cached;
  }

  const Params = new URLSearchParams();
  for (const ID of Hadith_IDs) Params.append("ID", String(ID));
  Params.append(Resource.Verse_Param, Edition);
  if (Need_Word) Params.append("WBW", "true");

  const URL_To_Fetch = `${API_BASE_PATH}?${Params.toString()}`;
  Debug_Log(`[${Resource.Verse_Param}] network request →`, URL_To_Fetch);

  try {
    const Response = await fetch(URL_To_Fetch);
    if (!Response.ok) throw new Error(`HTTP ${Response.status}`);
    const Data = await Response.json();

    const Result: { Hadith?: any[]; Word?: any[] } = {
      Hadith: Need_Verse ? Data[Resource.Verse_JSON_Key] || [] : undefined,
      Word: Need_Word ? Data[Resource.Word_JSON_Key] || [] : undefined,
    };

    await Resource.Cache_Save(Cache_Key, Result);

    Debug_Log(`[${Resource.Verse_Param}] Fetch_Single_Hadith_Resource OUT →`, {
      Hadith_IDs,
      Edition,
      Hadith_Count: Result.Hadith?.length ?? 0,
      Word_Count: Result.Word?.length ?? 0,
    });

    return Result;
  } catch (Err) {
    Debug_Warn(`[${Resource.Verse_Param}] network fetch failed →`, { Hadith_IDs, Edition, Error: Err });

    // Fall back to whatever partial cache entry exists rather than
    // silently reporting an empty result.
    if (Cached) return Cached;
    return { Hadith: Need_Verse ? [] : undefined, Word: Need_Word ? [] : undefined };
  }
};

export const Fetch_Hadith_Translation = (
  Hadith_IDs: number[],
  Translation_Edition: string,
  Need_Verse: boolean = true,
  Need_Word: boolean = false
): Promise<Translation_Resource_Result> =>
  Fetch_Single_Hadith_Resource(TRANSLATION_RESOURCE, Hadith_IDs, Translation_Edition, Need_Verse, Need_Word);

export const Fetch_Hadith_Transliteration = (
  Hadith_IDs: number[],
  Transliteration_Edition: string,
  Need_Verse: boolean = true,
  Need_Word: boolean = false
): Promise<Transliteration_Resource_Result> =>
  Fetch_Single_Hadith_Resource(
    TRANSLITERATION_RESOURCE,
    Hadith_IDs,
    Transliteration_Edition,
    Need_Verse,
    Need_Word
  );

// --- Aggregate Hadith Composite (Narration + every requested translation/transliteration) ---
// Mirrors Fetch_Surah_Details, but scoped to a single Hadith rather than a
// whole Surah: the Quran side aggregates across an entire Surah's ayaat in
// one shot, whereas Hadith translation/transliteration editions are looked
// up per Hadith ID, and the Arabic Narration itself needs a Collection_ID
// to be located at all. In-flight/resolved requests are deduplicated by a
// key built from every argument, exactly like Fetch_Surah_Details's
// Request_Key.
const Hadith_Data_Store = new Map<string, Promise<Hadith_Composite>>();

export const Fetch_Hadith_Composite = (
  Collection_ID: string,
  Hadith_ID: number,
  Translation_Editions: string | string[] = "",
  Transliteration_Editions: string | string[] = "",
  Word_Translation_Editions: string | string[] = "",
  Word_Transliteration_Editions: string | string[] = ""
): Promise<Hadith_Composite> => {
  Debug_Log("[Fetch_Hadith_Composite] raw args IN →", {
    Collection_ID,
    Hadith_ID,
    Translation_Editions,
    Transliteration_Editions,
    Word_Translation_Editions,
    Word_Transliteration_Editions,
  });

  const As_Set = (V: string | string[]) =>
    new Set(Array.isArray(V) ? V.filter(Boolean) : V ? [V] : []);

  const Verse_Translations_Set = As_Set(Translation_Editions);
  const Word_Translations_Set = As_Set(Word_Translation_Editions);
  const Verse_Transliterations_Set = As_Set(Transliteration_Editions);
  const Word_Transliterations_Set = As_Set(Word_Transliteration_Editions);

  const All_Translation_IDs = Array.from(
    new Set([...Verse_Translations_Set, ...Word_Translations_Set])
  ).sort();
  const All_Transliteration_IDs = Array.from(
    new Set([...Verse_Transliterations_Set, ...Word_Transliterations_Set])
  ).sort();

  const Request_Key =
    `${Collection_ID}:${Hadith_ID}` +
    `:T_Verse[${Array.from(Verse_Translations_Set).sort().join(",")}]` +
    `:T_WBW[${Array.from(Word_Translations_Set).sort().join(",")}]` +
    `:N_Verse[${Array.from(Verse_Transliterations_Set).sort().join(",")}]` +
    `:N_WBW[${Array.from(Word_Transliterations_Set).sort().join(",")}]`;

  if (!Hadith_Data_Store.has(Request_Key)) {
    Debug_Log("[Fetch_Hadith_Composite] cache miss, starting fetch →", { Request_Key });

    const Promise_Instance = (async () => {
      const Base_Narration = await Get_Narration(Collection_ID, Hadith_ID);
      if (!Base_Narration) {
        throw new Error(`Narration ${Hadith_ID} in ${Collection_ID} could not be found.`);
      }

      const [Translation_Results, Transliteration_Results] = await Promise.all([
        Promise.allSettled(
          All_Translation_IDs.map(async (ID) => {
            const Need_Verse = Verse_Translations_Set.has(ID);
            const Need_Word = Word_Translations_Set.has(ID);
            const Res = await Fetch_Single_Hadith_Resource(
              TRANSLATION_RESOURCE,
              [Hadith_ID],
              ID,
              Need_Verse,
              Need_Word
            );
            return { Res, Need_Verse, Need_Word };
          })
        ),
        Promise.allSettled(
          All_Transliteration_IDs.map(async (ID) => {
            const Need_Verse = Verse_Transliterations_Set.has(ID);
            const Need_Word = Word_Transliterations_Set.has(ID);
            const Res = await Fetch_Single_Hadith_Resource(
              TRANSLITERATION_RESOURCE,
              [Hadith_ID],
              ID,
              Need_Verse,
              Need_Word
            );
            return { Res, Need_Verse, Need_Word };
          })
        ),
      ]);

      const Translation: Translation[] = [];
      const WBW_Translation: WBW_Translation[] = [];
      for (const Result of Translation_Results) {
        if (Result.status === "fulfilled") {
          const { Res, Need_Verse, Need_Word } = Result.value;
          if (Need_Verse && Res.Hadith) Translation.push(...Res.Hadith);
          if (Need_Word && Res.Word) WBW_Translation.push(...Res.Word);
        } else {
          Debug_Warn("[Translation] a per-edition fetch was rejected →", Result.reason);
        }
      }

      const Transliteration: Transliteration[] = [];
      const WBW_Transliteration: WBW_Transliteration[] = [];
      for (const Result of Transliteration_Results) {
        if (Result.status === "fulfilled") {
          const { Res, Need_Verse, Need_Word } = Result.value;
          if (Need_Verse && Res.Hadith) Transliteration.push(...Res.Hadith);
          if (Need_Word && Res.Word) WBW_Transliteration.push(...Res.Word);
        } else {
          Debug_Warn("[Transliteration] a per-edition fetch was rejected →", Result.reason);
        }
      }

      Debug_Log("[Fetch_Hadith_Composite] aggregate OUT →", {
        Collection_ID,
        Hadith_ID,
        Translation_Count: Translation.length,
        WBW_Translation_Count: WBW_Translation.length,
        Transliteration_Count: Transliteration.length,
        WBW_Transliteration_Count: WBW_Transliteration.length,
      });

      const Result: Hadith_Composite = {
        Narration: Base_Narration,
      };
      if (Translation.length) Result.Translation = Translation;
      if (WBW_Translation.length) Result.WBW_Translation = WBW_Translation;
      if (Transliteration.length) Result.Transliteration = Transliteration;
      if (WBW_Transliteration.length) Result.WBW_Transliteration = WBW_Transliteration;

      return Result;
    })();

    Hadith_Data_Store.set(Request_Key, Promise_Instance);
    Promise_Instance.catch((Err) => {
      Debug_Warn("[Fetch_Hadith_Composite] request failed, evicting cache entry →", {
        Request_Key,
        Error: Err,
      });
      Hadith_Data_Store.delete(Request_Key);
    });
  } else {
    Debug_Log("[Fetch_Hadith_Composite] cache hit, reusing in-flight/resolved promise →", { Request_Key });
  }

  return Hadith_Data_Store.get(Request_Key)!;
};

// --- Available Translation / Transliteration Lists ---

function Build_List_Fetcher<T>(Param_Name: string, Result_Key: string): () => Promise<T[]> {
  return async () => {
    try {
      const Response = await fetch(`${API_BASE_PATH}?${Param_Name}=true`);
      if (!Response.ok) throw new Error(`HTTP ${Response.status}`);
      const Data = await Response.json();
      return (Data[Result_Key] ?? []) as T[];
    } catch (Error_Obj) {
      console.error(`Error fetching ${Result_Key}:`, Error_Obj);
      return [];
    }
  };
}

export const Fetch_Translation_List = Build_List_Fetcher<Translation_List_Entry>(
  "Available-Translations",
  "Available-Translations"
);

export const Fetch_Word_Translation_List = Build_List_Fetcher<Translation_List_Entry>(
  "Available-WBW-Translations",
  "Available-WBW-Translations"
);

export const Fetch_Transliteration_List = Build_List_Fetcher<Transliteration_List_Entry>(
  "Available-Transliterations",
  "Available-Transliterations"
);

export const Fetch_Word_Transliteration_List = Build_List_Fetcher<Transliteration_List_Entry>(
  "Available-WBW-Transliterations",
  "Available-WBW-Transliterations"
);