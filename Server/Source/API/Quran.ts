import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

export interface As_Surah {
  "As-Surah": number;
  "Al-Arabiyyah": string;
  "At-Tarjamah": string;
  "At-Tansiq": string;
  "Makan-Al-Wahy": string | null;
  "Tartib-Al-Wahy": number | null;
  "Adad-Al-Ayat": number;
  "Bidayat-As-Safhah": number;
  "Nihayat-As-Safhah": number;
  "Alamah-Indo-Pak": string[];
  "Tansiq-Al-Mushaf": Record<string, any> | null;
}

export interface Al_Ayah {
  "As-Surah": number;
  "Al-Ayah": number;
  "Al-Arabiyyah": string;
  "Al-Arabiyyah-A"?: string | null;
  "Al-Arabiyyah-B"?: string | null;
}

export interface Al_Kalimah {
  "As-Surah": number;
  "Al-Ayah": number;
  "Al-Kalimah": number;
  "Al-Arabiyyah": string;
  "Al-Arabiyyah-A"?: string | null;
  "Al-Arabiyyah-B"?: string | null;
  translation?: string;
  transliteration?: string;
  [Key: string]: any;
}

export interface At_Tarjamah {
  "As-Surah": number;
  "Al-Ayah": number;
  "At-Tarjamah": string;
  [Key: string]: any;
}

export interface At_Tarjamah_Kalimah {
  "As-Surah": number;
  "Al-Ayah": number;
  "Al-Kalimah": number;
  "An-Nass": string;
  "Al-Mutarjim": string;
}

export interface An_Naqharah {
  "As-Surah": number;
  "Al-Ayah": number;
  "An-Nass": string;
  "Al-Muraqqim": string;
}

export interface An_Naqharah_Kalimah {
  "As-Surah": number;
  "Al-Ayah": number;
  "Al-Kalimah": number;
  "An-Nass": string;
  "Al-Muraqqim": string;
}

export interface Bayanat_As_Surah {
  "As-Surah": As_Surah;
  "Al-Ayat": Al_Ayah[];
  "Al-Kalimat": Al_Kalimah[];
  "At-Tarjamaat": At_Tarjamah[];
  "At-Tarjamaat-Kalimah": At_Tarjamah_Kalimah[];
  "An-Naqharat": An_Naqharah[];
  "An-Naqharat-Kalimah": An_Naqharah_Kalimah[];
}

export interface QitAt_As_Safhah {
  "As-Surah": number;
  "Bidayat-Al-Ayah": number;
  "Nihayat-Al-Ayah": number;
}

export interface As_Safhah_Khaam {
  "As-Safhah": number;
  "Bidayat-As-Surah": number;
  "Bidayat-Al-Ayah": number;
  "Bidayat-Al-Kalimah": number;
  "Nihayat-As-Surah": number;
  "Nihayat-Al-Ayah": number;
  "Nihayat-Al-Kalimah": number;
}

export interface Mudkhal_Qaimat_At_Tarjamah {
  id: string;
  name: string;
  language: string;
  edition: string;
}

export interface Mudkhal_Qaimat_An_Naqharah {
  id: string;
  name: string;
  language: string;
  edition: string;
}

export type Aqsam_As_Safahat = Record<number, QitAt_As_Safhah[]>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASAR_USUL_AL_MUTUN = path.resolve(
  __dirname,
  "..",
  "..",
  "Asset",
  "Corpus"
);

const MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH = path.join(
  MASAR_USUL_AL_MUTUN,
  "Quran",
  "Core.db"
);

if (!fs.existsSync(MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH)) {
  console.error(
    `[QURAN API ERROR] Missing database at: ${MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH}`
  );
}

const QAIDAT_AL_BAYANAT_AL_ASASIYYAH = new Database(
  MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
  { readonly: true }
);
QAIDAT_AL_BAYANAT_AL_ASASIYYAH.pragma("journal_mode = WAL");

const ISTILAM_JAMII_AS_SUWAR = QAIDAT_AL_BAYANAT_AL_ASASIYYAH.prepare(
  `SELECT 
    Al_Surah AS "As-Surah",
    Arabic AS "Al-Arabiyyah",
    Translation AS "At-Tarjamah",
    Transliteration AS "At-Tansiq",
    Revelation_Place AS "Makan-Al-Wahy",
    Revelation_Order AS "Tartib-Al-Wahy",
    Al_Ayah_Count AS "Adad-Al-Ayat",
    Start_Al_Safhah AS "Bidayat-As-Safhah",
    End_Al_Safhah AS "Nihayat-As-Safhah",
    IndoPak_Marker AS "Alamah-Indo-Pak",
    Layout AS "Tansiq-Al-Mushaf"
  FROM Al_Surah ORDER BY Al_Surah ASC`
);

const ISTILAM_AS_SURAH_BI_RAGHM = QAIDAT_AL_BAYANAT_AL_ASASIYYAH.prepare(
  `SELECT 
    Al_Surah AS "As-Surah",
    Arabic AS "Al-Arabiyyah",
    Translation AS "At-Tarjamah",
    Transliteration AS "At-Tansiq",
    Revelation_Place AS "Makan-Al-Wahy",
    Revelation_Order AS "Tartib-Al-Wahy",
    Al_Ayah_Count AS "Adad-Al-Ayat",
    Start_Al_Safhah AS "Bidayat-As-Safhah",
    End_Al_Safhah AS "Nihayat-As-Safhah",
    IndoPak_Marker AS "Alamah-Indo-Pak",
    Layout AS "Tansiq-Al-Mushaf"
  FROM Al_Surah WHERE Al_Surah = ?`
);

const ISTILAM_AL_AYAT_BI_RAGHM_AS_SURAH = QAIDAT_AL_BAYANAT_AL_ASASIYYAH.prepare(
  `SELECT 
    Al_Surah AS "As-Surah",
    Al_Ayah AS "Al-Ayah",
    Arabic AS "Al-Arabiyyah",
    Arabic_V1 AS "Al-Arabiyyah-A",
    Arabic_V2 AS "Al-Arabiyyah-B"
  FROM Al_Ayah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC`
);

const ISTILAM_AL_KALIMAT_BI_RAGHM_AS_SURAH = QAIDAT_AL_BAYANAT_AL_ASASIYYAH.prepare(
  `SELECT 
    Al_Surah AS "As-Surah",
    Al_Ayah AS "Al-Ayah",
    Al_Kalimah AS "Al-Kalimah",
    Arabic AS "Al-Arabiyyah",
    Arabic_V1 AS "Al-Arabiyyah-A",
    Arabic_V2 AS "Al-Arabiyyah-B"
  FROM Al_Kalimah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC, Al_Kalimah ASC`
);

const ISTILAM_JAMII_AS_SAFAHAT = QAIDAT_AL_BAYANAT_AL_ASASIYYAH.prepare(
  `SELECT 
    Al_Safhah AS "As-Safhah",
    Start_Al_Surah AS "Bidayat-As-Surah",
    Start_Al_Ayah AS "Bidayat-Al-Ayah",
    Start_Al_Kalimah AS "Bidayat-Al-Kalimah",
    End_Al_Surah AS "Nihayat-As-Surah",
    End_Al_Ayah AS "Nihayat-Al-Ayah",
    End_Al_Kalimah AS "Nihayat-Al-Kalimah"
  FROM Al_Safhah ORDER BY Al_Safhah ASC`
);

const ISTILAM_JAMII_AS_SAFAHAT_KHAAM = QAIDAT_AL_BAYANAT_AL_ASASIYYAH.prepare(
  `SELECT 
    Al_Safhah AS "As-Safhah",
    Start_Al_Surah AS "Bidayat-As-Surah",
    Start_Al_Ayah AS "Bidayat-Al-Ayah",
    Start_Al_Kalimah AS "Bidayat-Al-Kalimah",
    End_Al_Surah AS "Nihayat-As-Surah",
    End_Al_Ayah AS "Nihayat-Al-Ayah",
    End_Al_Kalimah AS "Nihayat-Al-Kalimah"
  FROM Al_Safhah ORDER BY Al_Safhah ASC`
);

const ISTILAM_ADAD_AL_AYAT_LI_KULLI_SURAH = QAIDAT_AL_BAYANAT_AL_ASASIYYAH.prepare(
  `SELECT Al_Surah AS "As-Surah", Al_Ayah_Count AS "Adad-Al-Ayat" FROM Al_Surah`
);

const TansiIq_Mudkhal_As_Surah = (Mudkhal: any): As_Surah => {
  return {
    ...Mudkhal,
    "Alamah-Indo-Pak": Mudkhal["Alamah-Indo-Pak"]
      ? JSON.parse(Mudkhal["Alamah-Indo-Pak"])
      : [],
    "Tansiq-Al-Mushaf": Mudkhal["Tansiq-Al-Mushaf"]
      ? JSON.parse(Mudkhal["Tansiq-Al-Mushaf"])
      : null,
  };
};

export function Jalb_Matn_Al_Quran(): As_Surah[] {
  const Al_Mudkhalat = ISTILAM_JAMII_AS_SUWAR.all();
  return Al_Mudkhalat.map(TansiIq_Mudkhal_As_Surah);
}

/**
 * Fetches Surah details along with verses, words, translations, and transliterations.
 * Automatically attaches word-level translation and transliteration directly onto each item in `Al-Kalimat`.
 */
export function Jalb_Bayanat_As_Surah(
  Raqm_As_Surah: number,
  Naw_Al_Khatt: string = "Standard",
  Isdar_At_Tarjamah: string | string[] = [],
  Isdar_An_Naqharah: string | string[] = []
): Bayanat_As_Surah | null {
  const Mudkhal_As_Surah = ISTILAM_AS_SURAH_BI_RAGHM.get(Raqm_As_Surah) as
    | any
    | undefined;

  if (!Mudkhal_As_Surah) return null;

  let Al_Ayat = ISTILAM_AL_AYAT_BI_RAGHM_AS_SURAH.all(Raqm_As_Surah) as Al_Ayah[];
  let Al_Kalimat = ISTILAM_AL_KALIMAT_BI_RAGHM_AS_SURAH.all(
    Raqm_As_Surah
  ) as Al_Kalimah[];

  if (Naw_Al_Khatt === "V1" || Naw_Al_Khatt === "V2") {
    const Al_Haql = Naw_Al_Khatt === "V1" ? "Al-Arabiyyah-A" : "Al-Arabiyyah-B";
    Al_Ayat = Al_Ayat.map((A) => ({
      ...A,
      "Al-Arabiyyah": A[Al_Haql] || A["Al-Arabiyyah"],
    }));
    Al_Kalimat = Al_Kalimat.map((K) => ({
      ...K,
      "Al-Arabiyyah": K[Al_Haql] || K["Al-Arabiyyah"],
    }));
  }

  // --- FETCH TRANSLATIONS (VERSE & WORD-BY-WORD) ---
  const tarajimTargets = Array.isArray(Isdar_At_Tarjamah)
    ? Isdar_At_Tarjamah.filter(Boolean)
    : Isdar_At_Tarjamah
    ? [Isdar_At_Tarjamah]
    : [];

  const At_Tarjamaat: At_Tarjamah[] = [];
  const At_Tarjamaat_Kalimah: At_Tarjamah_Kalimah[] = [];

  for (const target of tarajimTargets) {
    const relativeDbPath = target.endsWith(".db") ? target : `${target}.db`;
    const fullDbPath = path.join(MASAR_USUL_AL_MUTUN, "Quran", "Translation", relativeDbPath);

    if (!fs.existsSync(fullDbPath)) continue;

    try {
      const db = new Database(fullDbPath, { readonly: true });
      const editionId = target.replace(/\.db$/, "");

      const hasAyahTable = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Ayah'`)
        .get();

      if (hasAyahTable) {
        const stmtAyah = db.prepare(
          `SELECT Al_Surah AS "As-Surah", Al_Ayah AS "Al-Ayah", Text AS "At-Tarjamah" FROM Al_Ayah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC`
        );
        const rowsAyah = stmtAyah.all(Raqm_As_Surah) as At_Tarjamah[];
        At_Tarjamaat.push(...rowsAyah.map((r) => ({ ...r, "Al-Mutarjim": editionId })));
      }

      const hasKalimahTable = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Kalimah'`)
        .get();

      if (hasKalimahTable) {
        const stmtKalimah = db.prepare(
          `SELECT Al_Surah AS "As-Surah", Al_Ayah AS "Al-Ayah", Al_Kalimah AS "Al-Kalimah", Text AS "An-Nass" FROM Al_Kalimah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC, Al_Kalimah ASC`
        );
        const rowsKalimah = stmtKalimah.all(Raqm_As_Surah) as any[];
        At_Tarjamaat_Kalimah.push(
          ...rowsKalimah.map((r) => ({ ...r, "Al-Mutarjim": editionId }))
        );
      }

      db.close();
    } catch (err) {
      console.error(`[QURAN API ERROR] Failed to query translation DB at ${fullDbPath}:`, err);
    }
  }

  // --- FETCH TRANSLITERATIONS (VERSE & WORD-BY-WORD) ---
  const naqharatTargets = Array.isArray(Isdar_An_Naqharah)
    ? Isdar_An_Naqharah.filter(Boolean)
    : Isdar_An_Naqharah
    ? [Isdar_An_Naqharah]
    : [];

  const An_Naqharat: An_Naqharah[] = [];
  const An_Naqharat_Kalimah: An_Naqharah_Kalimah[] = [];

  for (const target of naqharatTargets) {
    const relativeDbPath = target.endsWith(".db") ? target : `${target}.db`;
    const fullDbPath = path.join(MASAR_USUL_AL_MUTUN, "Quran", "Transliteration", relativeDbPath);

    if (!fs.existsSync(fullDbPath)) continue;

    try {
      const db = new Database(fullDbPath, { readonly: true });
      const editionId = target.replace(/\.db$/, "");

      const hasAyahTable = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Ayah'`)
        .get();

      if (hasAyahTable) {
        const stmtAyah = db.prepare(
          `SELECT Al_Surah AS "As-Surah", Al_Ayah AS "Al-Ayah", Text AS "An-Nass" FROM Al_Ayah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC`
        );
        const rowsAyah = stmtAyah.all(Raqm_As_Surah) as any[];
        An_Naqharat.push(...rowsAyah.map((r) => ({ ...r, "Al-Muraqqim": editionId })));
      }

      const hasKalimahTable = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Kalimah'`)
        .get();

      if (hasKalimahTable) {
        const stmtKalimah = db.prepare(
          `SELECT Al_Surah AS "As-Surah", Al_Ayah AS "Al-Ayah", Al_Kalimah AS "Al-Kalimah", Text AS "An-Nass" FROM Al_Kalimah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC, Al_Kalimah ASC`
        );
        const rowsKalimah = stmtKalimah.all(Raqm_As_Surah) as any[];
        An_Naqharat_Kalimah.push(
          ...rowsKalimah.map((r) => ({ ...r, "Al-Muraqqim": editionId }))
        );
      }

      db.close();
    } catch (err) {
      console.error(`[QURAN API ERROR] Failed to query transliteration DB at ${fullDbPath}:`, err);
    }
  }

  // Build maps for efficient merging into base words
  const Kharitah_Tarjamah_Kalimah = new Map<string, string>();
  for (const tk of At_Tarjamaat_Kalimah) {
    const miftah = `${tk["Al-Ayah"]}:${tk["Al-Kalimah"]}`;
    if (!Kharitah_Tarjamah_Kalimah.has(miftah)) {
      Kharitah_Tarjamah_Kalimah.set(miftah, tk["An-Nass"]);
    }
  }

  const Kharitah_Naqharah_Kalimah = new Map<string, string>();
  for (const nk of An_Naqharat_Kalimah) {
    const miftah = `${nk["Al-Ayah"]}:${nk["Al-Kalimah"]}`;
    if (!Kharitah_Naqharah_Kalimah.has(miftah)) {
      Kharitah_Naqharah_Kalimah.set(miftah, nk["An-Nass"]);
    }
  }

  // Merge word translation and transliteration directly onto Al-Kalimat
  Al_Kalimat = Al_Kalimat.map((kalimah) => {
    const miftah = `${kalimah["Al-Ayah"]}:${kalimah["Al-Kalimah"]}`;
    const translation = Kharitah_Tarjamah_Kalimah.get(miftah);
    const transliteration = Kharitah_Naqharah_Kalimah.get(miftah);

    return {
      ...kalimah,
      ...(translation ? { translation, "An-Nass": translation } : {}),
      ...(transliteration ? { transliteration, "An-Naqharah": transliteration } : {}),
    };
  });

  return {
    "As-Surah": TansiIq_Mudkhal_As_Surah(Mudkhal_As_Surah),
    "Al-Ayat": Al_Ayat,
    "Al-Kalimat": Al_Kalimat,
    "At-Tarjamaat": At_Tarjamaat,
    "At-Tarjamaat-Kalimah": At_Tarjamaat_Kalimah,
    "An-Naqharat": An_Naqharat,
    "An-Naqharat-Kalimah": An_Naqharat_Kalimah,
  };
}

export function Jalb_Aqsam_As_Safahat(): Aqsam_As_Safahat {
  const As_Safahat = ISTILAM_JAMII_AS_SAFAHAT.all() as any[];
  const Adad_Al_Ayat_Li_Kull_Surah = new Map<number, number>();

  (ISTILAM_ADAD_AL_AYAT_LI_KULLI_SURAH.all() as any[]).forEach((S) =>
    Adad_Al_Ayat_Li_Kull_Surah.set(S["As-Surah"], S["Adad-Al-Ayat"])
  );

  const Aqsam_As_Safahat: Aqsam_As_Safahat = {};

  for (const Safhah of As_Safahat) {
    const Al_Aqsam: QitAt_As_Safhah[] = [];
    const Bidayat_As_Surah = Safhah["Bidayat-As-Surah"];
    const Bidayat_Al_Ayah = Safhah["Bidayat-Al-Ayah"];
    const Nihayat_As_Surah = Safhah["Nihayat-As-Surah"];
    const Nihayat_Al_Ayah = Safhah["Nihayat-Al-Ayah"];

    if (Bidayat_As_Surah === Nihayat_As_Surah) {
      Al_Aqsam.push({
        "As-Surah": Bidayat_As_Surah,
        "Bidayat-Al-Ayah": Bidayat_Al_Ayah,
        "Nihayat-Al-Ayah": Nihayat_Al_Ayah,
      });
    } else {
      Al_Aqsam.push({
        "As-Surah": Bidayat_As_Surah,
        "Bidayat-Al-Ayah": Bidayat_Al_Ayah,
        "Nihayat-Al-Ayah":
          Adad_Al_Ayat_Li_Kull_Surah.get(Bidayat_As_Surah) ?? Bidayat_Al_Ayah,
      });
      for (let S = Bidayat_As_Surah + 1; S < Nihayat_As_Surah; S++) {
        Al_Aqsam.push({
          "As-Surah": S,
          "Bidayat-Al-Ayah": 1,
          "Nihayat-Al-Ayah": Adad_Al_Ayat_Li_Kull_Surah.get(S) ?? 1,
        });
      }
      Al_Aqsam.push({
        "As-Surah": Nihayat_As_Surah,
        "Bidayat-Al-Ayah": 1,
        "Nihayat-Al-Ayah": Nihayat_Al_Ayah,
      });
    }

    Aqsam_As_Safahat[Safhah["As-Safhah"]] = Al_Aqsam;
  }

  return Aqsam_As_Safahat;
}

export function Jalb_Safahat_Khaam(): As_Safhah_Khaam[] {
  return ISTILAM_JAMII_AS_SAFAHAT_KHAAM.all() as As_Safhah_Khaam[];
}

/**
 * Returns all available regular translations recursively.
 */
export function Jalb_Qaimat_At_Tarjamaat_Al_Mutaahah(
  masarBase: string = MASAR_USUL_AL_MUTUN
): Mudkhal_Qaimat_At_Tarjamah[] {
  const masarTarjamah = path.join(masarBase, "Quran", "Translation");
  const result: Mudkhal_Qaimat_At_Tarjamah[] = [];

  if (!fs.existsSync(masarTarjamah)) return result;

  function traverse(dir: string, relativeDir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        traverse(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".db")) {
        const dbPath = fullPath;
        try {
          const db = new Database(dbPath, { readonly: true });
          const hasAyahTable = db
            .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Ayah'`)
            .get();
          db.close();

          if (hasAyahTable) {
            const editionId = relPath.replace(/\.db$/, "");
            const parts = editionId.split("/");
            const language = parts.length > 1 ? parts[0] : "Translation";
            const edition = parts[parts.length - 1];

            result.push({
              id: editionId,
              name: edition.replace(/[-_]/g, " "),
              language,
              edition,
            });
          }
        } catch (err) {
          console.error(`[QURAN API ERROR] Could not check DB schema at ${dbPath}:`, err);
        }
      }
    }
  }

  traverse(masarTarjamah, "");
  return result;
}

/**
 * Dynamically checks databases recursively and returns ONLY those translations
 * that feature an "Al_Kalimah" table.
 */
export function Jalb_Qaimat_At_Tarjamaat_Al_Kalimah_Al_Mutaahah(
  masarBase: string = MASAR_USUL_AL_MUTUN
): Mudkhal_Qaimat_At_Tarjamah[] {
  const masarTarjamah = path.join(masarBase, "Quran", "Translation");
  const result: Mudkhal_Qaimat_At_Tarjamah[] = [];

  if (!fs.existsSync(masarTarjamah)) return result;

  function traverse(dir: string, relativeDir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        traverse(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".db")) {
        const dbPath = fullPath;
        try {
          const db = new Database(dbPath, { readonly: true });
          const hasKalimahTable = db
            .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Kalimah'`)
            .get();
          db.close();

          if (hasKalimahTable) {
            const editionId = relPath.replace(/\.db$/, "");
            const parts = editionId.split("/");
            const language = parts.length > 1 ? parts[0] : "Translation";
            const edition = parts[parts.length - 1];

            result.push({
              id: editionId,
              name: edition.replace(/[-_]/g, " "),
              language,
              edition,
            });
          }
        } catch (err) {
          console.error(`[QURAN API ERROR] Could not check DB schema at ${dbPath}:`, err);
        }
      }
    }
  }

  traverse(masarTarjamah, "");
  return result;
}

/**
 * Returns all available transliterations dynamically (verse-level, unfiltered).
 */
export function Jalb_Qaimat_An_Naqharah_Al_Mutaahah(
  masarBase: string = MASAR_USUL_AL_MUTUN
): Mudkhal_Qaimat_An_Naqharah[] {
  const masarNaqharah = path.join(masarBase, "Quran", "Transliteration");
  const result: Mudkhal_Qaimat_An_Naqharah[] = [];

  if (!fs.existsSync(masarNaqharah)) return result;

  function traverse(dir: string, relativeDir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        traverse(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".db")) {
        const dbPath = fullPath;
        try {
          const db = new Database(dbPath, { readonly: true });
          const hasAyahTable = db
            .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Ayah'`)
            .get();
          db.close();

          if (hasAyahTable) {
            const editionId = relPath.replace(/\.db$/, "");
            result.push({
              id: editionId,
              name: editionId.replace(/[-_]/g, " "),
              language: "Transliteration",
              edition: editionId,
            });
          }
        } catch (err) {
          console.error(`[QURAN API ERROR] Could not check DB schema at ${dbPath}:`, err);
        }
      }
    }
  }

  traverse(masarNaqharah, "");
  return result;
}

/**
 * Dynamically checks transliteration databases recursively and returns ONLY those
 * that feature an "Al_Kalimah" table (word-by-word transliteration).
 */
export function Jalb_Qaimat_An_Naqharah_Al_Kalimah_Al_Mutaahah(
  masarBase: string = MASAR_USUL_AL_MUTUN
): Mudkhal_Qaimat_An_Naqharah[] {
  const masarNaqharah = path.join(masarBase, "Quran", "Transliteration");
  const result: Mudkhal_Qaimat_An_Naqharah[] = [];

  if (!fs.existsSync(masarNaqharah)) return result;

  function traverse(dir: string, relativeDir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        traverse(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".db")) {
        const dbPath = fullPath;
        try {
          const db = new Database(dbPath, { readonly: true });
          const hasKalimahTable = db
            .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Al_Kalimah'`)
            .get();
          db.close();

          if (hasKalimahTable) {
            const editionId = relPath.replace(/\.db$/, "");
            result.push({
              id: editionId,
              name: editionId.replace(/[-_]/g, " "),
              language: "Transliteration",
              edition: editionId,
            });
          }
        } catch (err) {
          console.error(`[QURAN API ERROR] Could not check DB schema at ${dbPath}:`, err);
        }
      }
    }
  }

  traverse(masarNaqharah, "");
  return result;
}

process.on("SIGINT", () => {
  QAIDAT_AL_BAYANAT_AL_ASASIYYAH.close();
  process.exit(0);
});