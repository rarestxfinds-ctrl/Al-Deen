import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

// --- LOCAL TYPE DEFINITIONS (SERVER-SIDE) ---

export interface Surah {
  Surah: number;
  Arabic: string;
  Translation: string;
  Transliteration: string;
  Revelation_Place: string | null;
  Revelation_Order: number | null;
  Ayah_Count: number;
  Start_Page: number;
  End_Page: number;
  Indo_Pak_Ayah_Ending: string[];
  Layout: Record<string, any> | null;
}

export interface Ayah {
  Surah: number;
  Ayah: number;
  Arabic: string;
  Presentation_Form_A_Ligature_Based?: string | null;
  Presentation_Form_A_Glyph_Based?: string | null;
}

export interface Kalimah {
  Surah: number;
  Ayah: number;
  Kalimah: number;
  Arabic: string;
  Presentation_Form_A_Ligature_Based?: string | null;
  Presentation_Form_A_Glyph_Based?: string | null;
}

export interface Page {
  Page: number;
  Start_Surah: number;
  Start_Ayah: number;
  Start_Kalimah: number;
  End_Surah: number;
  End_Ayah: number;
  End_Kalimah: number;
}

export interface Translation {
  Surah: number;
  Ayah: number;
  Text: string;
  Edition: string;
}

export interface WBW_Translation {
  Surah: number;
  Ayah: number;
  Kalimah: number;
  Text: string;
  Edition: string;
}

export interface Footnote {
  Surah: number;
  Footnote: number;
  Text: string;
  Edition: string;
}

export interface Transliteration {
  Surah: number;
  Ayah: number;
  Text: string;
  Edition: string;
}

export interface WBW_Transliteration {
  Surah: number;
  Ayah: number;
  Kalimah: number;
  Text: string;
  Edition: string;
}

export interface Surah_Output {
  Surah: Surah;
  Ayaat: Ayah[];
  Kalimaat: Kalimah[];
  Pages: Page[];
}

export interface Translation_Output {
  Translations: Translation[];
  WBW_Translations?: WBW_Translation[];
  Footnotes: Footnote[];
}

export interface Transliteration_Output {
  Transliterations: Transliteration[];
  WBW_Transliterations?: WBW_Transliteration[];
}

export interface Page_Range {
  Surah: number;
  Start_Ayah: number;
  End_Ayah: number;
  Start_Kalimah: number;
  End_Kalimah: number;
}

export type Page_Range_Map = Record<number, Page_Range[]>;

export interface Edition {
  ID: string;
  Name: string;
  Language: string;
}

// --- SERVER SETUP & DATABASE INITIALIZATION ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSET_CORPUS_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "Asset",
  "Corpus"
);

const CORE_DB_PATH = path.join(ASSET_CORPUS_PATH, "Quran", "Core.db");

if (!fs.existsSync(CORE_DB_PATH)) {
  console.error(`[QURAN API ERROR] Missing database at: ${CORE_DB_PATH}`);
}

const CoreDB = new Database(CORE_DB_PATH, { readonly: true });
CoreDB.pragma("journal_mode = WAL");

const SELECT_ALL_SUWAR = CoreDB.prepare(
  `SELECT 
    Surah, Arabic, Translation, Transliteration,
    Revelation_Place, Revelation_Order, Ayah_Count,
    Start_Page, End_Page, Indo_Pak_Ayah_Ending, Layout
  FROM Surah ORDER BY Surah ASC`
);

const SELECT_SURAH_BY_NUMBER = CoreDB.prepare(
  `SELECT 
    Surah, Arabic, Translation, Transliteration,
    Revelation_Place, Revelation_Order, Ayah_Count,
    Start_Page, End_Page, Indo_Pak_Ayah_Ending, Layout
  FROM Surah WHERE Surah = ?`
);

const SELECT_AYAAT_BY_SURAH = CoreDB.prepare(
  `SELECT 
    Surah, Ayah, Arabic,
    Presentation_Form_A_Ligature_Based,
    Presentation_Form_A_Glyph_Based
  FROM Ayah WHERE Surah = ? ORDER BY Ayah ASC`
);

const SELECT_KALIMAAT_BY_SURAH = CoreDB.prepare(
  `SELECT 
    Surah, Ayah, Kalimah, Arabic,
    Presentation_Form_A_Ligature_Based,
    Presentation_Form_A_Glyph_Based
  FROM Kalimah WHERE Surah = ? ORDER BY Ayah ASC, Kalimah ASC`
);

const SELECT_ALL_PAGES = CoreDB.prepare(
  `SELECT 
    Page, Start_Surah, Start_Ayah, Start_Kalimah,
    End_Surah, End_Ayah, End_Kalimah
  FROM Page ORDER BY Page ASC`
);

const SELECT_PAGES_BY_SURAH = CoreDB.prepare(
  `SELECT 
    Page, Start_Surah, Start_Ayah, Start_Kalimah,
    End_Surah, End_Ayah, End_Kalimah
  FROM Page 
  WHERE Start_Surah <= ? AND End_Surah >= ?
  ORDER BY Page ASC`
);

const SELECT_AYAH_COUNTS_PER_SURAH = CoreDB.prepare(
  `SELECT Surah, Ayah_Count FROM Surah`
);

const Format_Surah = (entry: Record<string, any>): Surah => {
  return {
    ...entry,
    Indo_Pak_Ayah_Ending: entry.Indo_Pak_Ayah_Ending
      ? JSON.parse(entry.Indo_Pak_Ayah_Ending)
      : [],
    Layout: entry.Layout ? JSON.parse(entry.Layout) : null,
  };
};

// --- CORE EXPORT FUNCTIONS ---

/**
 * Returns structural static data: Surah metadata, Ayaat, Kalimaat, and Pages.
 */
export function Fetch_Surah(
  Surah_Number: number,
  Font_Type: string = "Standard"
): Surah_Output | null {
  const Surah_Entry = SELECT_SURAH_BY_NUMBER.get(Surah_Number) as Record<string, any> | undefined;
  if (!Surah_Entry) return null;

  let Ayaat_Local = SELECT_AYAAT_BY_SURAH.all(Surah_Number) as Ayah[];
  let Kalimaat_Local = SELECT_KALIMAAT_BY_SURAH.all(Surah_Number) as Kalimah[];
  const Pages_Local = SELECT_PAGES_BY_SURAH.all(Surah_Number, Surah_Number) as Page[];

  if (Font_Type === "V1" || Font_Type === "V2") {
    const Field =
      Font_Type === "V1"
        ? "Presentation_Form_A_Ligature_Based"
        : "Presentation_Form_A_Glyph_Based";

    Ayaat_Local = Ayaat_Local.map((A) => ({ ...A, Arabic: A[Field] || A.Arabic }));
    Kalimaat_Local = Kalimaat_Local.map((K) => ({ ...K, Arabic: K[Field] || K.Arabic }));
  }

  return {
    Surah: Format_Surah(Surah_Entry),
    Ayaat: Ayaat_Local,
    Kalimaat: Kalimaat_Local,
    Pages: Pages_Local,
  };
}

/**
 * Returns Translations, Footnotes, and optionally WBW_Translations.
 */
export function Fetch_Surah_Translation(
  Surah_Number: number,
  Translation_Editions: string | string[] = [],
  Include_WBW: boolean = false
): Translation_Output {
  const Targets = Array.isArray(Translation_Editions)
    ? Translation_Editions.filter(Boolean)
    : Translation_Editions
    ? [Translation_Editions]
    : [];

  const Translations_Local: Translation[] = [];
  const WBW_Translations_Local: WBW_Translation[] = [];
  const Footnotes_Local: Footnote[] = [];

  for (const Target of Targets) {
    const Clean_Target = Target.replace(/\.db$/, "");
    const Normalized_Subpath = Clean_Target.replace(/[\/\.]/g, path.sep);

    let Full_DB_Path = path.join(
      ASSET_CORPUS_PATH,
      "Quran",
      "Translation",
      `${Normalized_Subpath}.db`
    );

    if (!fs.existsSync(Full_DB_Path)) {
      Full_DB_Path = path.join(
        ASSET_CORPUS_PATH,
        "Quran",
        "Translation",
        `${Clean_Target}.db`
      );
    }

    if (!fs.existsSync(Full_DB_Path)) {
      console.warn(`[QURAN API WARNING] Translation DB not found at ${Full_DB_Path}`);
      continue;
    }

    try {
      const DB = new Database(Full_DB_Path, { readonly: true });
      const Edition_ID = Clean_Target;

      const Has_Ayah_Table = DB
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Ayah'`)
        .get();

      if (Has_Ayah_Table) {
        const Stmt_Ayah = DB.prepare(
          `SELECT Surah, Ayah, Text FROM Ayah WHERE Surah = ? ORDER BY Ayah ASC`
        );
        const Rows_Ayah = Stmt_Ayah.all(Surah_Number) as any[];
        Translations_Local.push(
          ...Rows_Ayah.map((R) => ({
            Surah: R.Surah,
            Ayah: R.Ayah,
            Text: R.Text,
            Edition: Edition_ID,
          }))
        );
      }

      if (Include_WBW) {
        const Has_Kalimah_Table = DB
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Kalimah'`)
          .get();

        if (Has_Kalimah_Table) {
          const Stmt_Kalimah = DB.prepare(
            `SELECT Surah, Ayah, Kalimah, Text FROM Kalimah WHERE Surah = ? ORDER BY Ayah ASC, Kalimah ASC`
          );
          const Rows_Kalimah = Stmt_Kalimah.all(Surah_Number) as any[];

          WBW_Translations_Local.push(
            ...Rows_Kalimah.map((R) => ({
              Surah: R.Surah,
              Ayah: R.Ayah,
              Kalimah: R.Kalimah,
              Text: R.Text,
              Edition: Edition_ID,
            }))
          );
        }
      }

      const Has_Footnote_Table = DB
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Footnote'`)
        .get();

      if (Has_Footnote_Table) {
        const Stmt_Footnote = DB.prepare(
          `SELECT Surah, Footnote, Text FROM Footnote WHERE Surah = ? ORDER BY Footnote ASC`
        );
        const Rows_Footnote = Stmt_Footnote.all(Surah_Number) as any[];
        Footnotes_Local.push(
          ...Rows_Footnote.map((R) => ({
            Surah: R.Surah,
            Footnote: R.Footnote,
            Text: R.Text,
            Edition: Edition_ID,
          }))
        );
      }

      DB.close();
    } catch (Err) {
      console.error(
        `[QURAN API ERROR] Failed to query translation DB at ${Full_DB_Path}:`,
        Err
      );
    }
  }

  return {
    Translations: Translations_Local,
    ...(Include_WBW ? { WBW_Translations: WBW_Translations_Local } : {}),
    Footnotes: Footnotes_Local,
  };
}

/**
 * Returns Transliterations, and optionally WBW_Transliterations.
 */
export function Fetch_Surah_Transliteration(
  Surah_Number: number,
  Transliteration_Editions: string | string[] = [],
  Include_WBW: boolean = false
): Transliteration_Output {
  const Targets = Array.isArray(Transliteration_Editions)
    ? Transliteration_Editions.filter(Boolean)
    : Transliteration_Editions
    ? [Transliteration_Editions]
    : [];

  const Transliterations_Local: Transliteration[] = [];
  const WBW_Transliterations_Local: WBW_Transliteration[] = [];

  for (const Target of Targets) {
    const Relative_DB_Path = Target.endsWith(".db") ? Target : `${Target}.db`;
    const Full_DB_Path = path.join(
      ASSET_CORPUS_PATH,
      "Quran",
      "Transliteration",
      Relative_DB_Path
    );

    if (!fs.existsSync(Full_DB_Path)) continue;

    try {
      const DB = new Database(Full_DB_Path, { readonly: true });
      const Edition_ID = Target.replace(/\.db$/, "");

      const Has_Ayah_Table = DB
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Ayah'`)
        .get();

      if (Has_Ayah_Table) {
        const Stmt_Ayah = DB.prepare(
          `SELECT Surah, Ayah, Text FROM Ayah WHERE Surah = ? ORDER BY Ayah ASC`
        );
        const Rows_Ayah = Stmt_Ayah.all(Surah_Number) as any[];
        Transliterations_Local.push(
          ...Rows_Ayah.map((R) => ({
            Surah: R.Surah,
            Ayah: R.Ayah,
            Text: R.Text,
            Edition: Edition_ID,
          }))
        );
      }

      if (Include_WBW) {
        const Has_Kalimah_Table = DB
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Kalimah'`)
          .get();

        if (Has_Kalimah_Table) {
          const Stmt_Kalimah = DB.prepare(
            `SELECT Surah, Ayah, Kalimah, Text FROM Kalimah WHERE Surah = ? ORDER BY Ayah ASC, Kalimah ASC`
          );
          const Rows_Kalimah = Stmt_Kalimah.all(Surah_Number) as any[];
          WBW_Transliterations_Local.push(
            ...Rows_Kalimah.map((R) => ({
              Surah: R.Surah,
              Ayah: R.Ayah,
              Kalimah: R.Kalimah,
              Text: R.Text,
              Edition: Edition_ID,
            }))
          );
        }
      }

      DB.close();
    } catch (Err) {
      console.error(
        `[QURAN API ERROR] Failed to query transliteration DB at ${Full_DB_Path}:`,
        Err
      );
    }
  }

  return {
    Transliterations: Transliterations_Local,
    ...(Include_WBW ? { WBW_Transliterations: WBW_Transliterations_Local } : {}),
  };
}

// --- UTILITY & PAGE METADATA FUNCTIONS ---

export function Fetch_Quran_Suwar(): Surah[] {
  const Entries = SELECT_ALL_SUWAR.all() as Record<string, any>[];
  return Entries.map(Format_Surah);
}

export function Fetch_Pages(): Page[] {
  return SELECT_ALL_PAGES.all() as Page[];
}

export function Fetch_Page_Ranges(): Page_Range_Map {
  const Pages_Local = SELECT_ALL_PAGES.all() as Page[];
  const Surah_Ayah_Counts = new Map<number, number>();

  (SELECT_AYAH_COUNTS_PER_SURAH.all() as any[]).forEach((S) =>
    Surah_Ayah_Counts.set(S.Surah, S.Ayah_Count)
  );

  const Page_Range_Map_Local: Page_Range_Map = {};

  for (const Page_Entry of Pages_Local) {
    const Ranges_Local: Page_Range[] = [];
    const {
      Start_Surah,
      Start_Ayah,
      Start_Kalimah,
      End_Surah,
      End_Ayah,
      End_Kalimah,
    } = Page_Entry;

    if (Start_Surah === End_Surah) {
      Ranges_Local.push({
        Surah: Start_Surah,
        Start_Ayah,
        End_Ayah,
        Start_Kalimah,
        End_Kalimah,
      });
    } else {
      Ranges_Local.push({
        Surah: Start_Surah,
        Start_Ayah,
        End_Ayah: Surah_Ayah_Counts.get(Start_Surah) ?? Start_Ayah,
        Start_Kalimah,
        End_Kalimah: 0,
      });

      for (let S = Start_Surah + 1; S < End_Surah; S++) {
        Ranges_Local.push({
          Surah: S,
          Start_Ayah: 1,
          End_Ayah: Surah_Ayah_Counts.get(S) ?? 1,
          Start_Kalimah: 1,
          End_Kalimah: 0,
        });
      }

      Ranges_Local.push({
        Surah: End_Surah,
        Start_Ayah: 1,
        End_Ayah,
        Start_Kalimah: 1,
        End_Kalimah,
      });
    }

    Page_Range_Map_Local[Page_Entry.Page] = Ranges_Local;
  }

  return Page_Range_Map_Local;
}

// --- LISTING FUNCTIONS ---

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
  Required_Table: "Ayah" | "Kalimah"
): Edition[] {
  const Result_Local: Edition[] = [];
  if (!fs.existsSync(Root_Path)) return Result_Local;

  function Traverse(Dir: string, Relative_Dir: string) {
    const Entries = fs.readdirSync(Dir, { withFileTypes: true });

    for (const Entry of Entries) {
      const Full_Path = path.join(Dir, Entry.name);
      const Rel_Path = Relative_Dir ? `${Relative_Dir}/${Entry.name}` : Entry.name;

      if (Entry.isDirectory()) {
        Traverse(Full_Path, Rel_Path);
      } else if (Entry.isFile() && Entry.name.endsWith(".db")) {
        try {
          const DB = new Database(Full_Path, { readonly: true });
          const Has_Table = DB
            .prepare(
              `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
            )
            .get(Required_Table);
          DB.close();

          if (Has_Table) {
            Result_Local.push(Format_Editions(Rel_Path));
          }
        } catch (Err) {
          console.error(`[QURAN API ERROR] Could not check DB schema at ${Full_Path}:`, Err);
        }
      }
    }
  }

  Traverse(Root_Path, "");
  return Result_Local;
}

export function Get_Available_Translations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Quran", "Translation"), "Ayah");
}

export function Get_Available_WBW_Translations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Quran", "Translation"), "Kalimah");
}

export function Get_Available_Transliterations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Quran", "Transliteration"), "Ayah");
}

export function Get_Available_WBW_Transliterations(
  Base_Path: string = ASSET_CORPUS_PATH
): Edition[] {
  return Scan_Editions(path.join(Base_Path, "Quran", "Transliteration"), "Kalimah");
}

process.on("SIGINT", () => {
  CoreDB.close();
  process.exit(0);
});