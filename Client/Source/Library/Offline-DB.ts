// Client/Source/Library/Offline-DB.ts
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import {
  Jalb_Milaff_Qaidat_Al_Bayanat,
  Hifdh_Milaff_Qaidat_Al_Bayanat,
} from "./IndexedDB-Store";

let Damaan_SqlJs: Promise<SqlJsStatic> | null = null;
const Al_Makhazin_Al_Maftuhah = new Map<string, Promise<Database>>();

const Jalb_SqlJs = (): Promise<SqlJsStatic> => {
  if (!Damaan_SqlJs) {
    Damaan_SqlJs = initSqlJs({ locateFile: () => sqlWasmUrl });
  }
  return Damaan_SqlJs;
};

/**
 * Builds the canonical storage path for a translation edition.
 * Translation files are grouped by language subfolder:
 * Tarjamah/<language>/<edition>.db — so ids here are expected to be
 * "language/edition" shaped.
 */
export const Bina_Masar_Tarjamah = (Isdar: string): string => {
  const target = Isdar.endsWith(".db") ? Isdar.slice(0, -3) : Isdar;

  if (!target.includes("/")) {
    console.warn(
      `[Offline-DB] Translation id "${Isdar}" has no language prefix ("Language/Edition"). ` +
        `This usually means an invalid or placeholder translation id was passed. ` +
        `Falling back to Quran/Tarjamah/${target}.db, which likely does not exist.`
    );
    return `Quran/Tarjamah/${target}.db`;
  }

  return `Quran/Tarjamah/${target}.db`;
};

/**
 * Builds the canonical storage path for a transliteration edition.
 * Unlike translations, transliteration files are stored flat
 * (Naqharah/<edition>.db) with no language subfolder, so ids here
 * are bare filenames (e.g. "ASCII-Literal") rather than "language/edition".
 * This is the expected, correct shape — not an error case.
 */
export const Bina_Masar_Naqharah = (Isdar: string): string => {
  const target = Isdar.endsWith(".db") ? Isdar.slice(0, -3) : Isdar;
  return `Quran/An-Naqharah/${target}.db`;
};

/** Downloads and stores a compressed SQLite database for offline usage. */
export const Tanzil_Li_Al_Istikhdam_Dun_Ittisal = async (
  Masar_Al_Milaff: string,
  Ala_At_Taqaddum?: (Al_Mahmul: number, Al_Kulli: number) => void
): Promise<void> => {
  const Istijabah = await fetch(`/Wajihat-Barmajatt-At-Tatbiqat/At-Tanzil/${Masar_Al_Milaff}`);
  if (!Istijabah.ok) {
    throw new Error(`Fashil tanzil ${Masar_Al_Milaff}: ${Istijabah.status}`);
  }

  const Al_Hajm_Al_Kulli = Number(Istijabah.headers.get("content-length")) || 0;
  if (!Istijabah.body) throw new Error("Jism al-istijabah farigh.");

  const Dhaffag_Al_Inghat = Istijabah.body.pipeThrough(new DecompressionStream("gzip"));
  const Qari = Dhaffag_Al_Inghat.getReader();
  const Al_Ajza: Uint8Array[] = [];
  let Al_Mahmul = 0;

  while (true) {
    const { done, value } = await Qari.read();
    if (done) break;
    if (value) {
      Al_Ajza.push(value);
      Al_Mahmul += value.length;
      Ala_At_Taqaddum?.(Al_Mahmul, Al_Hajm_Al_Kulli);
    }
  }

  const Al_Mukhazzan = new Uint8Array(Al_Mahmul);
  let Offset = 0;
  for (const Juz of Al_Ajza) {
    Al_Mukhazzan.set(Juz, Offset);
    Offset += Juz.length;
  }

  const Al_Unwan = new TextDecoder().decode(Al_Mukhazzan.slice(0, 16));
  if (!Al_Unwan.startsWith("SQLite format 3")) {
    throw new Error(`Al-milaff ghayr sahih li-qaidat bayanat SQLite: ${Masar_Al_Milaff}`);
  }

  await Hifdh_Milaff_Qaidat_Al_Bayanat(Masar_Al_Milaff, Al_Mukhazzan.buffer);
};

export const Hal_Mawjud_Dun_Ittisal = async (Masar_Al_Milaff: string): Promise<boolean> => {
  const Al_Bayanat = await Jalb_Milaff_Qaidat_Al_Bayanat(Masar_Al_Milaff);
  return !!Al_Bayanat;
};

const Jalb_Qaidat_Al_Bayanat_Dun_Ittisal = (Masar_Al_Milaff: string): Promise<Database> => {
  if (!Al_Makhazin_Al_Maftuhah.has(Masar_Al_Milaff)) {
    const Damaan = (async () => {
      const [SQL, Buffer] = await Promise.all([
        Jalb_SqlJs(),
        Jalb_Milaff_Qaidat_Al_Bayanat(Masar_Al_Milaff),
      ]);
      if (!Buffer) throw new Error(`${Masar_Al_Milaff} ghayr mahfudhan li-al-istikhdam dun ittisal`);
      return new SQL.Database(new Uint8Array(Buffer));
    })();

    Damaan.catch(() => Al_Makhazin_Al_Maftuhah.delete(Masar_Al_Milaff));
    Al_Makhazin_Al_Maftuhah.set(Masar_Al_Milaff, Damaan);
  }
  return Al_Makhazin_Al_Maftuhah.get(Masar_Al_Milaff)!;
};

export const Istilam_Qaidat_Al_Bayanat_Dun_Ittisal = async (
  Masar_Al_Milaff: string,
  Sql: string,
  Al_Malamah: unknown[] = []
): Promise<Record<string, unknown>[]> => {
  const Qaidat = await Jalb_Qaidat_Al_Bayanat_Dun_Ittisal(Masar_Al_Milaff);
  const Bayan = Qaidat.prepare(Sql);
  Bayan.bind(Al_Malamah);
  const Al_Sufuf: Record<string, unknown>[] = [];
  while (Bayan.step()) Al_Sufuf.push(Bayan.getAsObject());
  Bayan.free();
  return Al_Sufuf;
};

/**
 * Specifically fetches At-Tarjamaat from local translation .db files for a Surah.
 */
export const Jalb_At_Tarjamaat_Dun_Ittisal = async (
  Raqm_As_Surah: number,
  Isdar_At_Tarjamah: string | string[]
): Promise<Record<string, unknown>[]> => {
  const Targets = Array.isArray(Isdar_At_Tarjamah)
    ? Isdar_At_Tarjamah.filter(Boolean)
    : Isdar_At_Tarjamah
    ? Isdar_At_Tarjamah.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const At_Tarjamaat_Kull: Record<string, unknown>[] = [];

  for (const Target of Targets) {
    const Masar_Milaff = Bina_Masar_Tarjamah(Target);

    const Mawjud = await Hal_Mawjud_Dun_Ittisal(Masar_Milaff);
    if (!Mawjud) {
      console.warn(
        `[Offline-DB] Translation file not found in offline storage: "${Masar_Milaff}" ` +
          `(requested id: "${Target}"). Skipping.`
      );
      continue;
    }

    try {
      const Sufuf = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
        Masar_Milaff,
        `SELECT * FROM "Al-Ayah" WHERE "As-Surah" = ? ORDER BY "Al-Ayah" ASC`,
        [Raqm_As_Surah]
      );

      const TaggedSufuf = Sufuf.map((Row) => ({
        ...Row,
        "Al-Mutarjim": Target,
      }));

      At_Tarjamaat_Kull.push(...TaggedSufuf);
    } catch (Err) {
      console.error(`Error reading translation DB (${Masar_Milaff}):`, Err);
    }
  }

  return At_Tarjamaat_Kull;
};

/**
 * Fetches the raw As-Safhah mapping (all 7 columns) from the main DB offline.
 * If a page number is passed, it returns just that page's boundary data.
 * Otherwise, it returns the entire table.
 */
export const Jalb_As_Safahat_Dun_Ittisal = async (
  Masar_Al_Milaff: string,
  Raqm_As_Safhah?: number
): Promise<Record<string, unknown>[]> => {
  if (Raqm_As_Safhah) {
    return await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
      Masar_Al_Milaff,
      'SELECT * FROM "As-Safhah" WHERE "As-Safhah" = ?',
      [Raqm_As_Safhah]
    );
  }

  return await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
    Masar_Al_Milaff,
    'SELECT * FROM "As-Safhah" ORDER BY "As-Safhah" ASC'
  );
};

export const Ighlaq_Qaidat_Al_Bayanat_Dun_Ittisal = async (Masar_Al_Milaff: string): Promise<void> => {
  if (Al_Makhazin_Al_Maftuhah.has(Masar_Al_Milaff)) {
    const Qaidat = await Al_Makhazin_Al_Maftuhah.get(Masar_Al_Milaff)!;
    Qaidat.close();
    Al_Makhazin_Al_Maftuhah.delete(Masar_Al_Milaff);
  }
};