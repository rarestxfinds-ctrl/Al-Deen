import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

// --- LOCAL TYPE DEFINITIONS (SERVER-SIDE) ---

export interface Chapter {
  ID: number;
  Hadith_Count: number;
  Name: string;
}

export interface Narration {
  Chapter_ID: number;
  ID: number;
  In_Chapter_ID: number;
  Text: string;
}

export interface Translation {
  ID: number;
  Text: string;
  Edition: string;
}

export interface WBW_Translation {
  ID: number;
  Token_Index: number;
  Text: string;
  Edition: string;
}

export interface Transliteration {
  ID: number;
  Text: string;
  Edition: string;
}

export interface WBW_Transliteration {
  ID: number;
  Token_Index: number;
  Text: string;
  Edition: string;
}

export interface Chapter_Output {
  Chapter: Chapter;
  Narrations: Narration[];
}

export interface Translation_Output {
  Translations: Translation[];
  WBW_Translations?: WBW_Translation[];
}

export interface Transliteration_Output {
  Transliterations: Transliteration[];
  WBW_Transliterations?: WBW_Transliteration[];
}

export interface Edition {
  ID: string;
  Name: string;
  Language: string;
}

export interface Collection_Info {
  ID: string;
  Name: string;
  Category: string;
}

// --- SERVER SETUP & PATH RESOLUTION ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSET_CORPUS_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "Asset",
  "Corpus"
);

function Resolve_DB_Path(Sub_Folder: "Arabic" | "Translation" | "Transliteration", Target: string): string {
  const Clean_Target = Target.replace(/\.db$/, "");
  const Normalized_Subpath = Clean_Target.replace(/[\/\.]/g, path.sep);

  let Full_Path = path.join(
    ASSET_CORPUS_PATH,
    "Hadith",
    Sub_Folder,
    `${Normalized_Subpath}.db`
  );

  if (!fs.existsSync(Full_Path)) {
    Full_Path = path.join(
      ASSET_CORPUS_PATH,
      "Hadith",
      Sub_Folder,
      `${Clean_Target}.db`
    );
  }

  return Full_Path;
}

// --- CORE ARABIC & METADATA FETCH FUNCTIONS ---

/**
 * Returns all chapters for a specific Hadith collection (e.g., "Sahih/Muslim").
 */
export function Fetch_Chapters(Collection_Path: string): Chapter[] {
  const DB_Path = Resolve_DB_Path("Arabic", Collection_Path);
  if (!fs.existsSync(DB_Path)) {
    console.warn(`[HADITH API WARNING] Collection DB not found at: ${DB_Path}`);
    return [];
  }

  try {
    const DB = new Database(DB_Path, { readonly: true });
    const Chapters = DB.prepare(
      `SELECT ID, Hadith_Count, Name FROM Chapter ORDER BY ID ASC`
    ).all() as Chapter[];
    DB.close();
    return Chapters;
  } catch (Err) {
    console.error(`[HADITH API ERROR] Failed to fetch chapters from ${DB_Path}:`, Err);
    return [];
  }
}

/**
 * Returns a specific chapter and all of its narrations.
 */
export function Fetch_Chapter(
  Collection_Path: string,
  Chapter_ID: number
): Chapter_Output | null {
  const DB_Path = Resolve_DB_Path("Arabic", Collection_Path);
  if (!fs.existsSync(DB_Path)) {
    console.warn(`[HADITH API WARNING] Collection DB not found at: ${DB_Path}`);
    return null;
  }

  try {
    const DB = new Database(DB_Path, { readonly: true });

    const Chapter_Entry = DB.prepare(
      `SELECT ID, Hadith_Count, Name FROM Chapter WHERE ID = ?`
    ).get(Chapter_ID) as Chapter | undefined;

    if (!Chapter_Entry) {
      DB.close();
      return null;
    }

    const Narrations = DB.prepare(
      `SELECT Chapter_ID, ID, In_Chapter_ID, Text FROM Narration WHERE Chapter_ID = ? ORDER BY In_Chapter_ID ASC`
    ).all(Chapter_ID) as Narration[];

    DB.close();

    return {
      Chapter: Chapter_Entry,
      Narrations,
    };
  } catch (Err) {
    console.error(`[HADITH API ERROR] Failed to fetch chapter ${Chapter_ID} from ${DB_Path}:`, Err);
    return null;
  }
}

/**
 * Returns a single narration by its global ID within a collection.
 */
export function Fetch_Narration(
  Collection_Path: string,
  Hadith_ID: number
): Narration | null {
  const DB_Path = Resolve_DB_Path("Arabic", Collection_Path);
  if (!fs.existsSync(DB_Path)) {
    console.warn(`[HADITH API WARNING] Collection DB not found at: ${DB_Path}`);
    return null;
  }

  try {
    const DB = new Database(DB_Path, { readonly: true });
    const Narration_Entry = DB.prepare(
      `SELECT Chapter_ID, ID, In_Chapter_ID, Text FROM Narration WHERE ID = ?`
    ).get(Hadith_ID) as Narration | undefined;
    DB.close();

    return Narration_Entry || null;
  } catch (Err) {
    console.error(`[HADITH API ERROR] Failed to fetch narration ${Hadith_ID} from ${DB_Path}:`, Err);
    return null;
  }
}

// --- TRANSLATION & TRANSLITERATION FETCH FUNCTIONS ---

/**
 * Returns Translations and optionally WBW_Translations for given Hadith ID(s).
 */
export function Fetch_Hadith_Translation(
  Hadith_IDs: number | number[],
  Translation_Editions: string | string[] = [],
  Include_WBW: boolean = false
): Translation_Output {
  const IDs = Array.isArray(Hadith_IDs) ? Hadith_IDs : [Hadith_IDs];
  const Targets = Array.isArray(Translation_Editions)
    ? Translation_Editions.filter(Boolean)
    : Translation_Editions
    ? [Translation_Editions]
    : [];

  const Translations_Local: Translation[] = [];
  const WBW_Translations_Local: WBW_Translation[] = [];

  if (IDs.length === 0 || Targets.length === 0) {
    return { Translations: [] };
  }

  const Placeholders = IDs.map(() => "?").join(",");

  for (const Target of Targets) {
    const Full_DB_Path = Resolve_DB_Path("Translation", Target);
    if (!fs.existsSync(Full_DB_Path)) {
      console.warn(`[HADITH API WARNING] Translation DB not found at ${Full_DB_Path}`);
      continue;
    }

    try {
      const DB = new Database(Full_DB_Path, { readonly: true });
      const Edition_ID = Target.replace(/\.db$/, "");

      const Has_Hadith_Table = DB
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Hadith'`)
        .get();

      if (Has_Hadith_Table) {
        const Stmt_Hadith = DB.prepare(
          `SELECT ID, Text FROM Hadith WHERE ID IN (${Placeholders}) ORDER BY ID ASC`
        );
        const Rows_Hadith = Stmt_Hadith.all(...IDs) as any[];
        Translations_Local.push(
          ...Rows_Hadith.map((R) => ({
            ID: R.ID,
            Text: R.Text,
            Edition: Edition_ID,
          }))
        );
      }

      if (Include_WBW) {
        const Has_WBW_Table = DB
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='WBW'`)
          .get();

        if (Has_WBW_Table) {
          const Stmt_WBW = DB.prepare(
            `SELECT ID, Token_Index, Text FROM WBW WHERE ID IN (${Placeholders}) ORDER BY ID ASC, Token_Index ASC`
          );
          const Rows_WBW = Stmt_WBW.all(...IDs) as any[];
          WBW_Translations_Local.push(
            ...Rows_WBW.map((R) => ({
              ID: R.ID,
              Token_Index: R.Token_Index,
              Text: R.Text,
              Edition: Edition_ID,
            }))
          );
        }
      }

      DB.close();
    } catch (Err) {
      console.error(`[HADITH API ERROR] Failed to query translation DB at ${Full_DB_Path}:`, Err);
    }
  }

  return {
    Translations: Translations_Local,
    ...(Include_WBW ? { WBW_Translations: WBW_Translations_Local } : {}),
  };
}

/**
 * Returns Transliterations and optionally WBW_Transliterations for given Hadith ID(s).
 */
export function Fetch_Hadith_Transliteration(
  Hadith_IDs: number | number[],
  Transliteration_Editions: string | string[] = [],
  Include_WBW: boolean = false
): Transliteration_Output {
  const IDs = Array.isArray(Hadith_IDs) ? Hadith_IDs : [Hadith_IDs];
  const Targets = Array.isArray(Transliteration_Editions)
    ? Transliteration_Editions.filter(Boolean)
    : Transliteration_Editions
    ? [Transliteration_Editions]
    : [];

  const Transliterations_Local: Transliteration[] = [];
  const WBW_Transliterations_Local: WBW_Transliteration[] = [];

  if (IDs.length === 0 || Targets.length === 0) {
    return { Transliterations: [] };
  }

  const Placeholders = IDs.map(() => "?").join(",");

  for (const Target of Targets) {
    const Full_DB_Path = Resolve_DB_Path("Transliteration", Target);
    if (!fs.existsSync(Full_DB_Path)) {
      console.warn(`[HADITH API WARNING] Transliteration DB not found at ${Full_DB_Path}`);
      continue;
    }

    try {
      const DB = new Database(Full_DB_Path, { readonly: true });
      const Edition_ID = Target.replace(/\.db$/, "");

      const Has_Hadith_Table = DB
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Hadith'`)
        .get();

      if (Has_Hadith_Table) {
        const Stmt_Hadith = DB.prepare(
          `SELECT ID, Text FROM Hadith WHERE ID IN (${Placeholders}) ORDER BY ID ASC`
        );
        const Rows_Hadith = Stmt_Hadith.all(...IDs) as any[];
        Transliterations_Local.push(
          ...Rows_Hadith.map((R) => ({
            ID: R.ID,
            Text: R.Text,
            Edition: Edition_ID,
          }))
        );
      }

      if (Include_WBW) {
        const Has_WBW_Table = DB
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='WBW'`)
          .get();

        if (Has_WBW_Table) {
          const Stmt_WBW = DB.prepare(
            `SELECT ID, Token_Index, Text FROM WBW WHERE ID IN (${Placeholders}) ORDER BY ID ASC, Token_Index ASC`
          );
          const Rows_WBW = Stmt_WBW.all(...IDs) as any[];
          WBW_Transliterations_Local.push(
            ...Rows_WBW.map((R) => ({
              ID: R.ID,
              Token_Index: R.Token_Index,
              Text: R.Text,
              Edition: Edition_ID,
            }))
          );
        }
      }

      DB.close();
    } catch (Err) {
      console.error(`[HADITH API ERROR] Failed to query transliteration DB at ${Full_DB_Path}:`, Err);
    }
  }

  return {
    Transliterations: Transliterations_Local,
    ...(Include_WBW ? { WBW_Transliterations: WBW_Transliterations_Local } : {}),
  };
}

// --- LISTING & METADATA SCANNING FUNCTIONS ---

const Prettify_Name = (Raw: string): string =>
  Raw.replace(/[-_]+/g, " ").trim();

function Format_Editions(Rel_Path: string): Edition {
  const ID = Rel_Path.replace(/\.db$/, "");
  const Segments = ID.split("/");
  const Language = Segments.length > 1 ? Segments[0] : ID;
  const File_Name = Segments[Segments.length - 1];

  return {
    ID,
    Name: Prettify_Name(File_Name),
    Language,
  };
}

function Scan_Editions(
  Root_Path: string,
  Required_Table: "Hadith" | "WBW"
): Edition[] {
  const Result_Local: Edition[] = [];
  if (!fs.existsSync(Root_Path)) return Result_Local;

  const Entries = fs.readdirSync(Root_Path, { withFileTypes: true });

  for (const Entry of Entries) {
    // 1. Only process directories 1 level deep
    // 2. Explicitly skip the "WBW" folder
    if (Entry.isDirectory() && Entry.name !== "WBW") {
      Result_Local.push(Format_Editions(Entry.name));
    }
  }

  return Result_Local;
}

export function Get_Available_Collections(
  Base_Path: string = ASSET_CORPUS_PATH
): Collection_Info[] {
  const Arabic_Path = path.join(Base_Path, "Hadith", "Arabic");
  const Collections: Collection_Info[] = [];

  if (!fs.existsSync(Arabic_Path)) return Collections;

  function Traverse(Dir: string, Relative_Dir: string) {
    const Entries = fs.readdirSync(Dir, { withFileTypes: true });

    for (const Entry of Entries) {
      const Full_Path = path.join(Dir, Entry.name);
      const Rel_Path = Relative_Dir ? `${Relative_Dir}/${Entry.name}` : Entry.name;

      if (Entry.isDirectory()) {
        Traverse(Full_Path, Rel_Path);
      } else if (Entry.isFile() && Entry.name.endsWith(".db")) {
        const ID = Rel_Path.replace(/\.db$/, "");
        const Segments = ID.split("/");
        const Category = Segments.length > 1 ? Segments[0] : "General";
        const Name = Prettify_Name(Segments[Segments.length - 1]);

        Collections.push({ ID, Name, Category });
      }
    }
  }

  Traverse(Arabic_Path, "");
  return Collections;
}

export function Get_Available_Translations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Hadith", "Translation"), "Hadith");
}

export function Get_Available_WBW_Translations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Hadith", "Translation"), "WBW");
}

export function Get_Available_Transliterations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Hadith", "Transliteration"), "Hadith");
}

export function Get_Available_WBW_Transliterations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Hadith", "Transliteration"), "WBW");
}