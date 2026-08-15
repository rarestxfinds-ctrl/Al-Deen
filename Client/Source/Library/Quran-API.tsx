// Source/Library/Quran-API.ts
import type {
  As_Surah,
  Al_Ayah,
  Al_Kalimah,
  At_Tarjamah,
  At_Tarjamah_Kalimah,
  An_Naqharah,
  An_Naqharah_Kalimah,
  Bayanat_As_Surah,
  Aqsam_As_Safahat,
  As_Safhah,
  Mudkhal_Qaimat_At_Tarjamah,
  Mudkhal_Qaimat_An_Naqharah,
} from "./Quran-Types";

import {
  Jalb_As_Surah_Al_Mahfudhah,
  Hifdh_As_Surah_Al_Mahfudhah,
  Jalb_Al_Ayat_Al_Mahfudhah,
  Hifdh_Al_Ayat_Al_Mahfudhah,
  Jalb_Al_Kalimaat_Al_Mahfudhah,
  Hifdh_Al_Kalimaat_Al_Mahfudhah,
  Build_Miftah_As_Surah,
} from "./IndexedDB-Store";

import {
  Hal_Mawjud_Dun_Ittisal,
  Istilam_Qaidat_Al_Bayanat_Dun_Ittisal,
  Bina_Masar_Tarjamah,
  Bina_Masar_Naqharah,
} from "./Offline-DB";

const MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH = "Al-Quran/Core.db";

// --- Offline SQL fragments -------------------------------------------------
// NOTE: The on-disk databases use underscored identifiers (Al_Surah, Al_Ayah,
// Al_Kalimah, Text, ...) as built by Corpus-Loader.ts and the translation /
// transliteration builders. These queries select the real columns and alias
// them to the hyphenated keys ("As-Surah", "Al-Ayah", "An-Nass", ...) that the
// rest of this module (Istikhraj_An_Nass, TansiIq_Mudkhal_As_Surah, etc.)
// expects. Do not swap these back to `SELECT * FROM "As-Surah"` style
// hyphenated-quoted-identifier queries — those identifiers do not exist in
// the actual schema and will silently fail (caught by the surrounding
// try/catch), causing the offline fallback to return empty results.

const SQL_JAMII_AS_SUWAR = `
  SELECT 
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
  FROM Al_Surah ORDER BY Al_Surah ASC
`;

const SQL_AS_SURAH_BI_RAGHM = `
  SELECT 
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
  FROM Al_Surah WHERE Al_Surah = ?
`;

const SQL_AL_AYAT_BI_RAGHM_AS_SURAH = `
  SELECT 
    Al_Surah AS "As-Surah",
    Al_Ayah AS "Al-Ayah",
    Arabic AS "Al-Arabiyyah",
    Arabic_V1 AS "Al-Arabiyyah-A",
    Arabic_V2 AS "Al-Arabiyyah-B"
  FROM Al_Ayah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC
`;

const SQL_AL_KALIMAT_BI_RAGHM_AS_SURAH = `
  SELECT 
    Al_Surah AS "As-Surah",
    Al_Ayah AS "Al-Ayah",
    Al_Kalimah AS "Al-Kalimah",
    Arabic AS "Al-Arabiyyah",
    Arabic_V1 AS "Al-Arabiyyah-A",
    Arabic_V2 AS "Al-Arabiyyah-B"
  FROM Al_Kalimah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC, Al_Kalimah ASC
`;

const SQL_JAMII_AS_SAFAHAT = `
  SELECT 
    Al_Safhah AS "As-Safhah",
    Start_Al_Surah AS "Bidayat-As-Surah",
    Start_Al_Ayah AS "Bidayat-Al-Ayah",
    Start_Al_Kalimah AS "Bidayat-Al-Kalimah",
    End_Al_Surah AS "Nihayat-As-Surah",
    End_Al_Ayah AS "Nihayat-Al-Ayah",
    End_Al_Kalimah AS "Nihayat-Al-Kalimah"
  FROM Al_Safhah ORDER BY Al_Safhah ASC
`;

const SQL_ADAD_AL_AYAT_LI_KULLI_SURAH = `
  SELECT Al_Surah AS "As-Surah", Al_Ayah_Count AS "Adad-Al-Ayat" FROM Al_Surah
`;

// Translation / transliteration edition DBs (Al_Ayah / Al_Kalimah with a
// plain "Text" column — same shape for both Tarjamah and Naqharah editions).
const SQL_EDITION_AL_AYAH_BI_RAGHM_AS_SURAH = `
  SELECT 
    Al_Surah AS "As-Surah",
    Al_Ayah AS "Al-Ayah",
    Text AS "An-Nass"
  FROM Al_Ayah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC
`;

const SQL_EDITION_AL_KALIMAH_BI_RAGHM_AS_SURAH = `
  SELECT 
    Al_Surah AS "As-Surah",
    Al_Ayah AS "Al-Ayah",
    Al_Kalimah AS "Al-Kalimah",
    Text AS "An-Nass"
  FROM Al_Kalimah WHERE Al_Surah = ? ORDER BY Al_Ayah ASC, Al_Kalimah ASC
`;
// ---------------------------------------------------------------------------

let Damaan_Qaimat_As_Suwar: Promise<As_Surah[]> | null = null;
let Damaan_Qaimat_As_Safahat: Promise<As_Safhah[]> | null = null;
const Makhzan_Bayanat_As_Surah = new Map<string, Promise<Bayanat_As_Surah>>();
let Damaan_Aqsam_As_Safahat: Promise<Aqsam_As_Safahat> | null = null;

let Damaan_Qaimat_At_Tarjamaat: Promise<Mudkhal_Qaimat_At_Tarjamah[]> | null = null;
let Damaan_Qaimat_At_Tarjamaat_Kalimah: Promise<Mudkhal_Qaimat_At_Tarjamah[]> | null = null;
let Damaan_Qaimat_An_Naqharat: Promise<Mudkhal_Qaimat_An_Naqharah[]> | null = null;
let Damaan_Qaimat_An_Naqharat_Kalimah: Promise<Mudkhal_Qaimat_An_Naqharah[]> | null = null;

export interface TarjamahResourceResult {
  "Al-Ayah"?: At_Tarjamah[];
  "Al-Kalimah"?: At_Tarjamah_Kalimah[];
}

export interface NaqharahResourceResult {
  "Al-Ayah"?: An_Naqharah[];
  "Al-Kalimah"?: An_Naqharah_Kalimah[];
}

const Istikhraj_An_Nass = (item: any, keyPreference?: string): string => {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    if (keyPreference && item[keyPreference] !== undefined) {
      return item[keyPreference];
    }
    return (
      item["Al-Arabiyyah"] ||
      item["Al-Arabiyyah-A"] ||
      item["Al-Arabiyyah-B"] ||
      item["An-Nass"] ||
      item["nass"] ||
      item["text"] ||
      ""
    );
  }
  return String(item);
};

const Extract_Pure_Ayat_Array = (rawAyat: any[], key: string): string[] => {
  return rawAyat.map((item) => Istikhraj_An_Nass(item, key));
};

const Extract_Pure_Kalimaat_Arrays = (rawKalimaat: any[], key: string): string[][] => {
  const grouped: Record<number, string[]> = {};

  for (const item of rawKalimaat) {
    const verseNum = typeof item === "object" && item !== null ? item["Al-Ayah"] || 1 : 1;
    if (!grouped[verseNum]) grouped[verseNum] = [];
    grouped[verseNum].push(Istikhraj_An_Nass(item, key));
  }

  return Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => grouped[Number(k)]);
};

const Group_Kalimaat_By_Verse = (flatKalimaat: any[]): string[][] => {
  const grouped: Record<number, string[]> = {};
  for (const item of flatKalimaat) {
    const verseNum = typeof item === "object" && item !== null ? item["Al-Ayah"] || 1 : 1;
    if (!grouped[verseNum]) grouped[verseNum] = [];
    grouped[verseNum].push(Istikhraj_An_Nass(item));
  }
  return Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => grouped[Number(k)]);
};

const Flatten_Kalimaat_With_Verse = (
  nested: string[][],
  Raqm_As_Surah: number,
  metaKey: "Al-Mutarjim" | "Al-Muraqqim",
  metaVal: string
): any[] => {
  const flat: any[] = [];
  let globalWordCounter = 1;

  nested.forEach((verseWords, vIdx) => {
    const verseNum = vIdx + 1;
    verseWords.forEach((wordText) => {
      flat.push({
        "As-Surah": Raqm_As_Surah,
        "Al-Ayah": verseNum,
        "Al-Kalimah": globalWordCounter++,
        "An-Nass": wordText,
        [metaKey]: metaVal,
      });
    });
  });

  return flat;
};

const TansiIq_Mudkhal_As_Surah = (Mudkhal: any): As_Surah | null => {
  if (!Mudkhal) return null;

  return {
    "As-Surah": Mudkhal["As-Surah"],
    "Al-Arabiyyah": Mudkhal["Al-Arabiyyah"],
    "At-Tarjamah": Mudkhal["At-Tarjamah"],
    "At-Tansiq": Mudkhal["At-Tansiq"],
    "Makan-Al-Wahy": Mudkhal["Makan-Al-Wahy"],
    "Tartib-Al-Wahy": Mudkhal["Tartib-Al-Wahy"],
    "Adad-Al-Ayat": Mudkhal["Adad-Al-Ayat"],
    "Bidayat-As-Safhah": Mudkhal["Bidayat-As-Safhah"],
    "Nihayat-As-Safhah": Mudkhal["Nihayat-As-Safhah"],
    "Alamah-Indo-Pak": Array.isArray(Mudkhal["Alamah-Indo-Pak"])
      ? Mudkhal["Alamah-Indo-Pak"]
      : typeof Mudkhal["Alamah-Indo-Pak"] === "string"
      ? JSON.parse(Mudkhal["Alamah-Indo-Pak"])
      : [],
    "Tansiq-Al-Mushaf":
      typeof Mudkhal["Tansiq-Al-Mushaf"] === "string"
        ? JSON.parse(Mudkhal["Tansiq-Al-Mushaf"])
        : Mudkhal["Tansiq-Al-Mushaf"] || null,
  };
};

export const Jalb_Qaimat_As_Suwar = (): Promise<As_Surah[]> => {
  if (Damaan_Qaimat_As_Suwar) return Damaan_Qaimat_As_Suwar;

  Damaan_Qaimat_As_Suwar = (async () => {
    try {
      const Istijabah = await fetch("/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran");
      if (!Istijabah.ok) throw new Error(`HTTP ${Istijabah.status}`);
      const Al_Sufuf = await Istijabah.json();
      const Al_Maftuhah = Al_Sufuf.map(TansiIq_Mudkhal_As_Surah).filter(
        Boolean
      ) as As_Surah[];

      for (const Surah of Al_Maftuhah) {
        await Hifdh_As_Surah_Al_Mahfudhah(Surah["As-Surah"], Surah);
      }
      return Al_Maftuhah;
    } catch {
      if (await Hal_Mawjud_Dun_Ittisal(MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH)) {
        const Al_Sufuf = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
          SQL_JAMII_AS_SUWAR
        );
        const Al_Maftuhah = Al_Sufuf.map(TansiIq_Mudkhal_As_Surah).filter(
          Boolean
        ) as As_Surah[];

        for (const Surah of Al_Maftuhah) {
          await Hifdh_As_Surah_Al_Mahfudhah(Surah["As-Surah"], Surah);
        }
        return Al_Maftuhah;
      }

      throw new Error("La yujad ittisal shabakah wa la nuskhah dun ittisal.");
    }
  })();

  Damaan_Qaimat_As_Suwar.catch(() => {
    Damaan_Qaimat_As_Suwar = null;
  });

  return Damaan_Qaimat_As_Suwar;
};

export const Jalb_Qaimat_As_Safahat = (): Promise<As_Safhah[]> => {
  if (Damaan_Qaimat_As_Safahat) return Damaan_Qaimat_As_Safahat;

  Damaan_Qaimat_As_Safahat = (async () => {
    try {
      const Istijabah = await fetch(
        "/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?as-safhah=true"
      );
      if (!Istijabah.ok) throw new Error(`HTTP ${Istijabah.status}`);
      const Al_Sufuf = await Istijabah.json();
      return (Al_Sufuf["As-Safhah"] || Al_Sufuf) as As_Safhah[];
    } catch {
      if (await Hal_Mawjud_Dun_Ittisal(MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH)) {
        const Al_Sufuf = (await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
          SQL_JAMII_AS_SAFAHAT
        )) as As_Safhah[];

        return Al_Sufuf;
      }

      throw new Error(
        "La yujad ittisal shabakah wa la nuskhah dun ittisal li-as-safhah."
      );
    }
  })();

  Damaan_Qaimat_As_Safahat.catch(() => {
    Damaan_Qaimat_As_Safahat = null;
  });

  return Damaan_Qaimat_As_Safahat;
};

const Jalb_At_Tarjamah_Wahidah = async (
  Raqm_As_Surah: number,
  Isdar: string,
  needAyah: boolean,
  needKalimah: boolean
): Promise<TarjamahResourceResult> => {
  const Miftah = Build_Miftah_As_Surah(Raqm_As_Surah, Isdar);

  let CachedAyat = needAyah ? await Jalb_Al_Ayat_Al_Mahfudhah<string[]>(Miftah) : null;
  let CachedKalimaat = needKalimah ? await Jalb_Al_Kalimaat_Al_Mahfudhah<string[][]>(Miftah) : null;

  const satisfiesAyah = !needAyah || (CachedAyat !== null && CachedAyat.length > 0);
  const satisfiesKalimah = !needKalimah || (CachedKalimaat !== null && CachedKalimaat.length > 0);

  if (satisfiesAyah && satisfiesKalimah) {
    return {
      "Al-Ayah": needAyah && CachedAyat ? CachedAyat.map((text, idx) => ({
        "As-Surah": Raqm_As_Surah,
        "Al-Ayah": idx + 1,
        "An-Nass": text,
        "Al-Mutarjim": Isdar,
      })) : undefined,
      "Al-Kalimah": needKalimah && CachedKalimaat
        ? Flatten_Kalimaat_With_Verse(CachedKalimaat, Raqm_As_Surah, "Al-Mutarjim", Isdar)
        : undefined,
    };
  }

  const fetchAyah = needAyah && !satisfiesAyah;
  const fetchKalimah = needKalimah && !satisfiesKalimah;

  let freshAyat: string[] = CachedAyat || [];
  let freshKalimahNested: string[][] = CachedKalimaat || [];

  try {
    const params = new URLSearchParams();
    params.append("as-surah", String(Raqm_As_Surah));
    params.append("at-tarjamah", Isdar);
    if (fetchKalimah) params.append("kalimah-bi-kalimah", "true");

    const Istijabah = await fetch(`/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?${params.toString()}`);
    if (Istijabah.ok) {
      const Bayanat = await Istijabah.json();

      if (fetchAyah && Array.isArray(Bayanat["At-Tarjamaat"])) {
        freshAyat = Extract_Pure_Ayat_Array(Bayanat["At-Tarjamaat"], "An-Nass");
        await Hifdh_Al_Ayat_Al_Mahfudhah(Miftah, freshAyat);
      }
      if (fetchKalimah && Array.isArray(Bayanat["At-Tarjamaat-Kalimah"])) {
        freshKalimahNested = Group_Kalimaat_By_Verse(Bayanat["At-Tarjamaat-Kalimah"]);
        await Hifdh_Al_Kalimaat_Al_Mahfudhah(Miftah, freshKalimahNested);
      }

      return {
        "Al-Ayah": needAyah ? freshAyat.map((text, idx) => ({
          "As-Surah": Raqm_As_Surah,
          "Al-Ayah": idx + 1,
          "An-Nass": text,
          "Al-Mutarjim": Isdar,
        })) : undefined,
        "Al-Kalimah": needKalimah
          ? Flatten_Kalimaat_With_Verse(freshKalimahNested, Raqm_As_Surah, "Al-Mutarjim", Isdar)
          : undefined,
      };
    }
  } catch {}

  const dbPath = Bina_Masar_Tarjamah(Isdar);
  if (await Hal_Mawjud_Dun_Ittisal(dbPath)) {
    try {
      if (fetchAyah) {
        const rows = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          dbPath,
          SQL_EDITION_AL_AYAH_BI_RAGHM_AS_SURAH,
          [Raqm_As_Surah]
        );
        freshAyat = Extract_Pure_Ayat_Array(rows, "An-Nass");
        await Hifdh_Al_Ayat_Al_Mahfudhah(Miftah, freshAyat);
      }

      if (fetchKalimah) {
        const kalimahRows = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          dbPath,
          SQL_EDITION_AL_KALIMAH_BI_RAGHM_AS_SURAH,
          [Raqm_As_Surah]
        );
        freshKalimahNested = Group_Kalimaat_By_Verse(kalimahRows);
        await Hifdh_Al_Kalimaat_Al_Mahfudhah(Miftah, freshKalimahNested);
      }

      return {
        "Al-Ayah": needAyah ? freshAyat.map((text, idx) => ({
          "As-Surah": Raqm_As_Surah,
          "Al-Ayah": idx + 1,
          "An-Nass": text,
          "Al-Mutarjim": Isdar,
        })) : undefined,
        "Al-Kalimah": needKalimah
          ? Flatten_Kalimaat_With_Verse(freshKalimahNested, Raqm_As_Surah, "Al-Mutarjim", Isdar)
          : undefined,
      };
    } catch {}
  }

  return {};
};

const Jalb_An_Naqharah_Wahidah = async (
  Raqm_As_Surah: number,
  Isdar: string,
  needAyah: boolean,
  needKalimah: boolean
): Promise<NaqharahResourceResult> => {
  const Miftah = Build_Miftah_As_Surah(Raqm_As_Surah, Isdar);

  let CachedAyat = needAyah ? await Jalb_Al_Ayat_Al_Mahfudhah<string[]>(Miftah) : null;
  let CachedKalimaat = needKalimah ? await Jalb_Al_Kalimaat_Al_Mahfudhah<string[][]>(Miftah) : null;

  const satisfiesAyah = !needAyah || (CachedAyat !== null && CachedAyat.length > 0);
  const satisfiesKalimah = !needKalimah || (CachedKalimaat !== null && CachedKalimaat.length > 0);

  if (satisfiesAyah && satisfiesKalimah) {
    return {
      "Al-Ayah": needAyah && CachedAyat ? CachedAyat.map((text, idx) => ({
        "As-Surah": Raqm_As_Surah,
        "Al-Ayah": idx + 1,
        "An-Nass": text,
        "Al-Muraqqim": Isdar,
      })) : undefined,
      "Al-Kalimah": needKalimah && CachedKalimaat
        ? Flatten_Kalimaat_With_Verse(CachedKalimaat, Raqm_As_Surah, "Al-Muraqqim", Isdar)
        : undefined,
    };
  }

  const fetchAyah = needAyah && !satisfiesAyah;
  const fetchKalimah = needKalimah && !satisfiesKalimah;

  let freshAyat: string[] = CachedAyat || [];
  let freshKalimahNested: string[][] = CachedKalimaat || [];

  try {
    const params = new URLSearchParams();
    params.append("as-surah", String(Raqm_As_Surah));
    params.append("an-naqharah", Isdar);
    if (fetchKalimah) params.append("kalimah-bi-kalimah", "true");

    const Istijabah = await fetch(`/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?${params.toString()}`);
    if (Istijabah.ok) {
      const Bayanat = await Istijabah.json();

      if (fetchAyah && Array.isArray(Bayanat["An-Naqharat"])) {
        freshAyat = Extract_Pure_Ayat_Array(Bayanat["An-Naqharat"], "An-Nass");
        await Hifdh_Al_Ayat_Al_Mahfudhah(Miftah, freshAyat);
      }
      if (fetchKalimah && Array.isArray(Bayanat["An-Naqharat-Kalimah"])) {
        freshKalimahNested = Group_Kalimaat_By_Verse(Bayanat["An-Naqharat-Kalimah"]);
        await Hifdh_Al_Kalimaat_Al_Mahfudhah(Miftah, freshKalimahNested);
      }

      return {
        "Al-Ayah": needAyah ? freshAyat.map((text, idx) => ({
          "As-Surah": Raqm_As_Surah,
          "Al-Ayah": idx + 1,
          "An-Nass": text,
          "Al-Muraqqim": Isdar,
        })) : undefined,
        "Al-Kalimah": needKalimah
          ? Flatten_Kalimaat_With_Verse(freshKalimahNested, Raqm_As_Surah, "Al-Muraqqim", Isdar)
          : undefined,
      };
    }
  } catch {}

  const dbPath = Bina_Masar_Naqharah(Isdar);
  if (await Hal_Mawjud_Dun_Ittisal(dbPath)) {
    try {
      if (fetchAyah) {
        const rows = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          dbPath,
          SQL_EDITION_AL_AYAH_BI_RAGHM_AS_SURAH,
          [Raqm_As_Surah]
        );
        freshAyat = Extract_Pure_Ayat_Array(rows, "An-Nass");
        await Hifdh_Al_Ayat_Al_Mahfudhah(Miftah, freshAyat);
      }

      if (fetchKalimah) {
        const kalimahRows = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          dbPath,
          SQL_EDITION_AL_KALIMAH_BI_RAGHM_AS_SURAH,
          [Raqm_As_Surah]
        );
        freshKalimahNested = Group_Kalimaat_By_Verse(kalimahRows);
        await Hifdh_Al_Kalimaat_Al_Mahfudhah(Miftah, freshKalimahNested);
      }

      return {
        "Al-Ayah": needAyah ? freshAyat.map((text, idx) => ({
          "As-Surah": Raqm_As_Surah,
          "Al-Ayah": idx + 1,
          "An-Nass": text,
          "Al-Muraqqim": Isdar,
        })) : undefined,
        "Al-Kalimah": needKalimah
          ? Flatten_Kalimaat_With_Verse(freshKalimahNested, Raqm_As_Surah, "Al-Muraqqim", Isdar)
          : undefined,
      };
    } catch {}
  }

  return {};
};

const Jalb_As_Surah_Al_Asasiyyah = async (
  Raqm_As_Surah: number
): Promise<Bayanat_As_Surah> => {
  const MiftahBase = `${Raqm_As_Surah}`;

  const CachedSurah = await Jalb_As_Surah_Al_Mahfudhah(Raqm_As_Surah);
  const CachedAyatArrays = await Jalb_Al_Ayat_Al_Mahfudhah<[string[], string[], string[]]>(MiftahBase);
  const CachedKalimaatArrays = await Jalb_Al_Kalimaat_Al_Mahfudhah<[string[][], string[][], string[][]]>(MiftahBase);

  if (CachedSurah && CachedAyatArrays && CachedKalimaatArrays) {
    const [arrMain, arrA, arrB] = CachedAyatArrays;
    const [kalimatMain, kalimatA, kalimatB] = CachedKalimaatArrays;

    const formattedAyat: Al_Ayah[] = arrMain.map((text, idx) => ({
      "As-Surah": Raqm_As_Surah,
      "Al-Ayah": idx + 1,
      "An-Nass": text,
      "Al-Arabiyyah": text,
      "Al-Arabiyyah-A": arrA[idx] || "",
      "Al-Arabiyyah-B": arrB[idx] || "",
    }));

    const flatKalimat: Al_Kalimah[] = [];
    let wordCounter = 1;

    kalimatMain.forEach((verseWords, vIdx) => {
      verseWords.forEach((wordText, wIdx) => {
        flatKalimat.push({
          "As-Surah": Raqm_As_Surah,
          "Al-Ayah": vIdx + 1,
          "Al-Kalimah": wordCounter++,
          "An-Nass": wordText,
          "Al-Arabiyyah": wordText,
          "Al-Arabiyyah-A": kalimatA[vIdx]?.[wIdx] || "",
          "Al-Arabiyyah-B": kalimatB[vIdx]?.[wIdx] || "",
        });
      });
    });

    return {
      "As-Surah": CachedSurah,
      "Al-Ayat": formattedAyat,
      "Al-Kalimat": flatKalimat,
      "At-Tarjamaat": [],
      "At-Tarjamaat-Kalimah": [],
      "An-Naqharat": [],
      "An-Naqharat-Kalimah": [],
    };
  }

  let rawAyat: any[] = [];
  let rawKalimaat: any[] = [];
  let As_Surah_Mufassar: As_Surah | null = null;

  try {
    const Istijabah = await fetch(
      `/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?as-surah=${Raqm_As_Surah}`
    );
    if (Istijabah.ok) {
      const Bayanat_Al_Kham = await Istijabah.json();
      As_Surah_Mufassar = TansiIq_Mudkhal_As_Surah(
        Bayanat_Al_Kham["As-Surah"] || Bayanat_Al_Kham
      );
      rawAyat = Bayanat_Al_Kham["Al-Ayat"] || [];
      rawKalimaat = Bayanat_Al_Kham["Al-Kalimat"] || Bayanat_Al_Kham["Al-Kalimaat"] || [];
    }
  } catch {}

  if (!As_Surah_Mufassar && (await Hal_Mawjud_Dun_Ittisal(MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH))) {
    const Sufuf_As_Surah = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
      MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
      SQL_AS_SURAH_BI_RAGHM,
      [Raqm_As_Surah]
    );

    As_Surah_Mufassar = TansiIq_Mudkhal_As_Surah(Sufuf_As_Surah[0]);
    if (As_Surah_Mufassar) {
      rawAyat = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
        MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
        SQL_AL_AYAT_BI_RAGHM_AS_SURAH,
        [Raqm_As_Surah]
      );

      rawKalimaat = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
        MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
        SQL_AL_KALIMAT_BI_RAGHM_AS_SURAH,
        [Raqm_As_Surah]
      );
    }
  }

  if (As_Surah_Mufassar) {
    const pureAyat: [string[], string[], string[]] = [
      Extract_Pure_Ayat_Array(rawAyat, "Al-Arabiyyah"),
      Extract_Pure_Ayat_Array(rawAyat, "Al-Arabiyyah-A"),
      Extract_Pure_Ayat_Array(rawAyat, "Al-Arabiyyah-B"),
    ];

    const pureKalimaat: [string[][], string[][], string[][]] = [
      Extract_Pure_Kalimaat_Arrays(rawKalimaat, "Al-Arabiyyah"),
      Extract_Pure_Kalimaat_Arrays(rawKalimaat, "Al-Arabiyyah-A"),
      Extract_Pure_Kalimaat_Arrays(rawKalimaat, "Al-Arabiyyah-B"),
    ];

    await Hifdh_As_Surah_Al_Mahfudhah(Raqm_As_Surah, As_Surah_Mufassar);
    await Hifdh_Al_Ayat_Al_Mahfudhah(MiftahBase, pureAyat);
    await Hifdh_Al_Kalimaat_Al_Mahfudhah(MiftahBase, pureKalimaat);

    return Jalb_As_Surah_Al_Asasiyyah(Raqm_As_Surah);
  }

  throw new Error(`Lam yatim al-futhur 'ala as-surah ${Raqm_As_Surah}.`);
};
export const Jalb_Bayanat_As_Surah = (
  Raqm_As_Surah: number,
  Isdar_At_Tarjamah: string | string[] = "",
  Isdar_An_Naqharah: string | string[] = "",
  Wbw_At_Tarjamah: string | string[] = "",
  Wbw_An_Naqharah: string | string[] = ""
): Promise<Bayanat_As_Surah> => {
  const verseTarajimSet = new Set(
    Array.isArray(Isdar_At_Tarjamah)
      ? Isdar_At_Tarjamah.filter(Boolean)
      : Isdar_At_Tarjamah ? [Isdar_At_Tarjamah] : []
  );

  const wbwTarajimSet = new Set(
    Array.isArray(Wbw_At_Tarjamah)
      ? Wbw_At_Tarjamah.filter(Boolean)
      : Wbw_At_Tarjamah ? [Wbw_At_Tarjamah] : []
  );

  const verseNaqharatSet = new Set(
    Array.isArray(Isdar_An_Naqharah)
      ? Isdar_An_Naqharah.filter(Boolean)
      : Isdar_An_Naqharah ? [Isdar_An_Naqharah] : []
  );

  const wbwNaqharatSet = new Set(
    Array.isArray(Wbw_An_Naqharah)
      ? Wbw_An_Naqharah.filter(Boolean)
      : Wbw_An_Naqharah ? [Wbw_An_Naqharah] : []
  );

  const verseTarajimArray = Array.from(verseTarajimSet).sort();
  const wbwTarajimArray = Array.from(wbwTarajimSet).sort();
  const verseNaqharatArray = Array.from(verseNaqharatSet).sort();
  const wbwNaqharatArray = Array.from(wbwNaqharatSet).sort();

  const allTarjamahIds = Array.from(new Set([...verseTarajimArray, ...wbwTarajimArray])).sort();
  const allNaqharahIds = Array.from(new Set([...verseNaqharatArray, ...wbwNaqharatArray])).sort();

  const RequestKey = `${Raqm_As_Surah}:T_Verse[${verseTarajimArray.join(",")}]` +
    `:T_WBW[${wbwTarajimArray.join(",")}]` +
    `:N_Verse[${verseNaqharatArray.join(",")}]` +
    `:N_WBW[${wbwNaqharatArray.join(",")}]`;

  if (Makhzan_Bayanat_As_Surah.has(RequestKey)) {
    return Makhzan_Bayanat_As_Surah.get(RequestKey)!;
  }

  const Damaan = (async () => {
    const BaseSurah = await Jalb_As_Surah_Al_Asasiyyah(Raqm_As_Surah);

    const TarjamaatPromises = allTarjamahIds.map(async (id) => {
      const needAyah = verseTarajimSet.has(id);
      const needKalimah = wbwTarajimSet.has(id);
      const res = await Jalb_At_Tarjamah_Wahidah(Raqm_As_Surah, id, needAyah, needKalimah);
      return { id, res, needAyah, needKalimah };
    });

    const NaqharatPromises = allNaqharahIds.map(async (id) => {
      const needAyah = verseNaqharatSet.has(id);
      const needKalimah = wbwNaqharatSet.has(id);
      const res = await Jalb_An_Naqharah_Wahidah(Raqm_As_Surah, id, needAyah, needKalimah);
      return { id, res, needAyah, needKalimah };
    });

    const [TarjamaatResults, NaqharatResults] = await Promise.all([
      Promise.all(TarjamaatPromises),
      Promise.all(NaqharatPromises),
    ]);

    const At_Tarjamaat: At_Tarjamah[] = [];
    const At_Tarjamaat_Kalimah: At_Tarjamah_Kalimah[] = [];

    for (const { res, needAyah, needKalimah } of TarjamaatResults) {
      if (needAyah && res["Al-Ayah"]) {
        At_Tarjamaat.push(...res["Al-Ayah"]);
      }
      if (needKalimah && res["Al-Kalimah"]) {
        At_Tarjamaat_Kalimah.push(...res["Al-Kalimah"]);
      }
    }

    const An_Naqharat: An_Naqharah[] = [];
    const An_Naqharat_Kalimah: An_Naqharah_Kalimah[] = [];

    for (const { res, needAyah, needKalimah } of NaqharatResults) {
      if (needAyah && res["Al-Ayah"]) {
        An_Naqharat.push(...res["Al-Ayah"]);
      }
      if (needKalimah && res["Al-Kalimah"]) {
        An_Naqharat_Kalimah.push(...res["Al-Kalimah"]);
      }
    }

    return {
      "As-Surah": BaseSurah["As-Surah"],
      "Al-Ayat": BaseSurah["Al-Ayat"],
      "Al-Kalimat": BaseSurah["Al-Kalimat"],
      "At-Tarjamaat": At_Tarjamaat,
      "At-Tarjamaat-Kalimah": At_Tarjamaat_Kalimah,
      "An-Naqharat": An_Naqharat,
      "An-Naqharat-Kalimah": An_Naqharat_Kalimah,
    };
  })();

  Makhzan_Bayanat_As_Surah.set(RequestKey, Damaan);
  Damaan.catch(() => Makhzan_Bayanat_As_Surah.delete(RequestKey));

  return Damaan;
};

// Expands flat Al_Safhah range rows into a per-surah Aqsam_As_Safahat map,
// mirroring the transformation done server-side by Jalb_Aqsam_As_Safahat
// (Corpus-Loader.ts) so the offline fallback returns the same shape.
const Bina_Aqsam_As_Safahat_Min_Safahat = (
  As_Safahat: any[],
  Adad_Al_Ayat_Li_Kull_Surah: Map<number, number>
): Aqsam_As_Safahat => {
  const Natijah: Aqsam_As_Safahat = {};

  for (const Safhah of As_Safahat) {
    const Al_Aqsam: { "As-Surah": number; "Bidayat-Al-Ayah": number; "Nihayat-Al-Ayah": number }[] = [];
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

    Natijah[Safhah["As-Safhah"]] = Al_Aqsam as any;
  }

  return Natijah;
};

export const Jalb_Aqsam_As_Safahat_Corpus = (): Promise<Aqsam_As_Safahat> => {
  if (Damaan_Aqsam_As_Safahat) return Damaan_Aqsam_As_Safahat;

  Damaan_Aqsam_As_Safahat = (async () => {
    try {
      const Istijabah = await fetch(
        "/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?aqsam-as-safahat=true"
      );
      if (!Istijabah.ok) throw new Error(`HTTP ${Istijabah.status}`);
      const Al_Bayanat = await Istijabah.json();
      return (Al_Bayanat["Aqsam-As-Safahat"] || Al_Bayanat) as Aqsam_As_Safahat;
    } catch {
      if (await Hal_Mawjud_Dun_Ittisal(MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH)) {
        const As_Safahat = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
          SQL_JAMII_AS_SAFAHAT
        );

        const Sufuf_Adad_Al_Ayat = await Istilam_Qaidat_Al_Bayanat_Dun_Ittisal(
          MASAR_QAIDAT_AL_BAYANAT_AL_ASASIYYAH,
          SQL_ADAD_AL_AYAT_LI_KULLI_SURAH
        );

        const Adad_Al_Ayat_Li_Kull_Surah = new Map<number, number>();
        for (const S of Sufuf_Adad_Al_Ayat as any[]) {
          Adad_Al_Ayat_Li_Kull_Surah.set(S["As-Surah"], S["Adad-Al-Ayat"]);
        }

        if (As_Safahat && (As_Safahat as any[]).length > 0) {
          return Bina_Aqsam_As_Safahat_Min_Safahat(As_Safahat as any[], Adad_Al_Ayat_Li_Kull_Surah);
        }
      }

      throw new Error("La yujad ittisal shabakah wa la nuskhah dun ittisal li-aqsam as-safahat.");
    }
  })();

  Damaan_Aqsam_As_Safahat.catch(() => {
    Damaan_Aqsam_As_Safahat = null;
  });

  return Damaan_Aqsam_As_Safahat;
};

export const Jalb_Qaimat_At_Tarjamaat = (): Promise<Mudkhal_Qaimat_At_Tarjamah[]> => {
  if (Damaan_Qaimat_At_Tarjamaat) return Damaan_Qaimat_At_Tarjamaat;

  Damaan_Qaimat_At_Tarjamaat = (async () => {
    try {
      const Istijabah = await fetch(
        "/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?qaimat-at-tarjamaat=true"
      );
      if (!Istijabah.ok) throw new Error(`HTTP ${Istijabah.status}`);
      const Al_Bayanat = await Istijabah.json();

      return (Al_Bayanat["Qaimat-At-Tarjamaat"] || []) as Mudkhal_Qaimat_At_Tarjamah[];
    } catch (Khata) {
      console.error("Error fetching Qaimat At-Tarjamaat:", Khata);
      Damaan_Qaimat_At_Tarjamaat = null;
      return [];
    }
  })();

  return Damaan_Qaimat_At_Tarjamaat;
};

export const Jalb_Qaimat_At_Tarjamaat_Kalimah = (): Promise<Mudkhal_Qaimat_At_Tarjamah[]> => {
  if (Damaan_Qaimat_At_Tarjamaat_Kalimah) return Damaan_Qaimat_At_Tarjamaat_Kalimah;

  Damaan_Qaimat_At_Tarjamaat_Kalimah = (async () => {
    try {
      const Istijabah = await fetch(
        "/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?qaimat-at-tarjamaat-kalimah=true"
      );
      if (!Istijabah.ok) throw new Error(`HTTP ${Istijabah.status}`);
      const Al_Bayanat = await Istijabah.json();

      return (Al_Bayanat["Qaimat-At-Tarjamaat-Kalimah"] || []) as Mudkhal_Qaimat_At_Tarjamah[];
    } catch (Khata) {
      console.error("Error fetching Qaimat At-Tarjamaat-Kalimah:", Khata);
      Damaan_Qaimat_At_Tarjamaat_Kalimah = null;
      return [];
    }
  })();

  return Damaan_Qaimat_At_Tarjamaat_Kalimah;
};

export const Jalb_Qaimat_An_Naqharat = (): Promise<Mudkhal_Qaimat_An_Naqharah[]> => {
  if (Damaan_Qaimat_An_Naqharat) return Damaan_Qaimat_An_Naqharat;

  Damaan_Qaimat_An_Naqharat = (async () => {
    try {
      const Istijabah = await fetch(
        "/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?qaimat-an-naqharat=true"
      );
      if (!Istijabah.ok) throw new Error(`HTTP ${Istijabah.status}`);
      const Al_Bayanat = await Istijabah.json();

      return (
        Al_Bayanat["Qaimat-An-Naqharat"] ||
        Al_Bayanat["Qaimat-An-Naqharah"] ||
        []
      ) as Mudkhal_Qaimat_An_Naqharah[];
    } catch (Khata) {
      console.error("Error fetching Qaimat An-Naqharat:", Khata);
      Damaan_Qaimat_An_Naqharat = null;
      return [];
    }
  })();

  return Damaan_Qaimat_An_Naqharat;
};

export const Jalb_Qaimat_An_Naqharat_Kalimah = (): Promise<Mudkhal_Qaimat_An_Naqharah[]> => {
  if (Damaan_Qaimat_An_Naqharat_Kalimah) return Damaan_Qaimat_An_Naqharat_Kalimah;

  Damaan_Qaimat_An_Naqharat_Kalimah = (async () => {
    try {
      const Istijabah = await fetch(
        "/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran?qaimat-an-naqharat-kalimah=true"
      );
      if (!Istijabah.ok) throw new Error(`HTTP ${Istijabah.status}`);
      const Al_Bayanat = await Istijabah.json();

      return (Al_Bayanat["Qaimat-An-Naqharat-Kalimah"] || []) as Mudkhal_Qaimat_An_Naqharah[];
    } catch (Khata) {
      console.error("Error fetching Qaimat An-Naqharat-Kalimah:", Khata);
      Damaan_Qaimat_An_Naqharat_Kalimah = null;
      return [];
    }
  })();

  return Damaan_Qaimat_An_Naqharat_Kalimah;
};