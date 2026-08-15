// Client/Web/Component/Quran/Takheet/Safhah/Qaimah.tsx
import React, { useMemo, useState } from "react";
import { useApp } from "@Web/Context/App";
import { Bitaqah } from "./Bitaqah";
import type { PageViewProps, Al_Kalimah_Al_Muhallalah } from "./Anwaa";
import { getArabicField, pickArabicText } from "../Adawat";
import { useQuery } from "@tanstack/react-query";
import { Jalb_Bayanat_As_Surah, Jalb_Aqsam_As_Safahat_Corpus, Jalb_Qaimat_As_Safahat } from "@/Library/Quran-API";
import type {
  As_Surah, Al_Ayah, Al_Kalimah, Bayanat_As_Surah,
  Aqsam_As_Safahat, As_Safhah,
} from "@/Library/Quran-Types";

function Tahleel_Ajza_As_Safhah(Kharitat_As_Safhah?: any): any[] | null {
  if (!Kharitat_As_Safhah) return null;

  if (typeof Kharitat_As_Safhah === "object") {
    if (Array.isArray(Kharitat_As_Safhah)) {
      return Kharitat_As_Safhah.map((Qism: any) => ({
        surah: Qism.surah ?? Qism["As-Surah"] ?? Qism["Bidayat-As-Surah"],
        startVerse: Qism.startVerse ?? Qism["Bidayat-Al-Ayah"],
        endVerse: Qism.endVerse ?? Qism["Nihayat-Al-Ayah"],
      }));
    }
    if (Kharitat_As_Safhah["As-Surah"] || Kharitat_As_Safhah["Bidayat-As-Surah"]) {
      return [{
        surah: Kharitat_As_Safhah["As-Surah"] ?? Kharitat_As_Safhah["Bidayat-As-Surah"],
        startVerse: Kharitat_As_Safhah["Bidayat-Al-Ayah"],
        endVerse: Kharitat_As_Safhah["Nihayat-Al-Ayah"],
      }];
    }
  }

  if (typeof Kharitat_As_Safhah === "string") {
    const Al_Ajza = Kharitat_As_Safhah.split("|");
    const Al_Natijah: any[] = [];

    for (const Al_Juz of Al_Ajza) {
      const [Bidayah, Nihayah] = Al_Juz.split("-");
      if (!Bidayah || !Nihayah) continue;

      const [Bidayat_Ayat_As_Surah] = Bidayah.split(".");
      const [Bidayat_As_Surah, Bidayat_Al_Ayah] = Bidayat_Ayat_As_Surah.split(":");

      const [Nihayat_Ayat_As_Surah] = Nihayah.split(".");
      const [Nihayat_As_Surah, Nihayat_Al_Ayah] = Nihayat_Ayat_As_Surah.split(":");

      if (!Bidayat_As_Surah || !Bidayat_Al_Ayah || !Nihayat_As_Surah || !Nihayat_Al_Ayah) continue;

      Al_Natijah.push({
        surah: parseInt(Bidayat_As_Surah, 10),
        startVerse: parseInt(Bidayat_Al_Ayah, 10),
        endVerse: parseInt(Nihayat_Al_Ayah, 10),
      });
    }

    return Al_Natijah.length > 0 ? Al_Natijah : null;
  }

  return null;
}

function Jalb_Kalimaat_Al_Ayah(Al_Ayah: Al_Ayah, Haql: ReturnType<typeof getArabicField>): string[] {
  if (!Al_Ayah) return [];
  const Nass = pickArabicText(Al_Ayah, Haql);

  if (!Nass) return [];

  if (Nass.includes(" ")) {
    return Nass.split(" ");
  }
  return Array.from(Nass);
}

function Marji_Isdar_At_Tarjamah_Kalimah(Saf: any): string | undefined {
  return Saf?.["Al-Mutarjim"] ?? Saf?.["Al-Muraqqim"] ?? Saf?.["Isdar"] ?? Saf?.["id"];
}

function Nass_At_Tarjamah_Kalimah(Saf: any): string | undefined {
  return Saf?.["An-Nass"] ?? Saf?.["At-Tarjamah"] ?? Saf?.["translation"] ?? Saf?.["Nass"];
}

function Marji_Isdar_An_Naqharah_Kalimah(Saf: any): string | undefined {
  return Saf?.["Al-Muraqqim"] ?? Saf?.["Al-Mutarjim"] ?? Saf?.["Isdar"] ?? Saf?.["id"];
}

function Nass_An_Naqharah_Kalimah(Saf: any): string | undefined {
  return Saf?.["An-Nass"] ?? Saf?.["An-Naqharah"] ?? Saf?.["transliteration"] ?? Saf?.["Nass"];
}

function Binae_Kharitat_Nusus_Al_Kalimat(
  Sufuf: any[] | undefined,
  Jalb_Al_Isdar: (Saf: any) => string | undefined,
  Jalb_An_Nass: (Saf: any) => string | undefined
): Map<string, string> {
  const Kharitah = new Map<string, string>();
  for (const Saf of Sufuf || []) {
    const Isdar = Jalb_Al_Isdar(Saf);
    const Ayah = Saf?.["Al-Ayah"];
    const Kalimah = Saf?.["Al-Kalimah"];
    const Nass = Jalb_An_Nass(Saf);
    if (!Isdar || Ayah === undefined || Kalimah === undefined || Nass === undefined) continue;
    Kharitah.set(`${Isdar}:${Ayah}:${Kalimah}`, Nass);
  }
  return Kharitah;
}

function Naqi_Al_Isdar(Isdar: string | boolean | undefined | null): string | null {
  return typeof Isdar === "string" && Isdar !== "None" && Isdar !== "" ? Isdar : null;
}

type Marja_Kalimah = { ayah: number; word: number };

function Tahleel_Tansiq_Al_Mushaf(Tansiq: any): Marja_Kalimah[][] | null {
  if (!Tansiq) return null;

  if (typeof Tansiq === "string") {
    try {
      return Tahleel_Tansiq_Al_Mushaf(JSON.parse(Tansiq));
    } catch {
      return null;
    }
  }

  if (!Array.isArray(Tansiq)) return null;

  const Sutur: Marja_Kalimah[][] = [];
  for (const Satr of Tansiq) {
    if (!Array.isArray(Satr)) return null;

    const Marajii: Marja_Kalimah[] = [];
    for (const Marja of Satr) {
      if (typeof Marja !== "string") continue;
      const [AyahStr, KalimahStr] = Marja.split(":");
      const Ayah = parseInt(AyahStr, 10);
      const Kalimah = parseInt(KalimahStr, 10);
      if (Number.isNaN(Ayah) || Number.isNaN(Kalimah)) continue;
      Marajii.push({ ayah: Ayah, word: Kalimah });
    }

    if (Marajii.length > 0) Sutur.push(Marajii);
  }

  return Sutur.length > 0 ? Sutur : null;
}

function Taqti_As_Sutur_Hasab_As_Safhah(
  Sutur_Kamilah: Marja_Kalimah[][],
  Safhah_Khaam: As_Safhah | null | undefined
): Marja_Kalimah[][] | null {
  if (!Safhah_Khaam) return null;

  const Bidayat_Al_Ayah = (Safhah_Khaam as any)["Bidayat-Al-Ayah"];
  const Bidayat_Al_Kalimah = (Safhah_Khaam as any)["Bidayat-Al-Kalimah"];
  const Nihayat_Al_Ayah = (Safhah_Khaam as any)["Nihayat-Al-Ayah"];
  const Nihayat_Al_Kalimah = (Safhah_Khaam as any)["Nihayat-Al-Kalimah"];

  if (
    Bidayat_Al_Ayah === undefined ||
    Bidayat_Al_Kalimah === undefined ||
    Nihayat_Al_Ayah === undefined ||
    Nihayat_Al_Kalimah === undefined
  ) {
    return null;
  }

  const Qabl_Al_Bidayah = (M: Marja_Kalimah) =>
    M.ayah < Bidayat_Al_Ayah || (M.ayah === Bidayat_Al_Ayah && M.word < Bidayat_Al_Kalimah);
  const Bad_An_Nihayah = (M: Marja_Kalimah) =>
    M.ayah > Nihayat_Al_Ayah || (M.ayah === Nihayat_Al_Ayah && M.word > Nihayat_Al_Kalimah);

  const Natijah: Marja_Kalimah[][] = [];
  for (const Satr of Sutur_Kamilah) {
    const Awwal_Kalimah_Fi_As_Satr = Satr[0];
    if (!Awwal_Kalimah_Fi_As_Satr) continue;
    if (Qabl_Al_Bidayah(Awwal_Kalimah_Fi_As_Satr) || Bad_An_Nihayah(Awwal_Kalimah_Fi_As_Satr)) continue;
    Natijah.push(Satr);
  }

  return Natijah.length > 0 ? Natijah : null;
}

// NOTE: `Kharitat_Al_Kalimat` is keyed `ayah:per-verse-word-index` (matching
// Tansiq_Al_Mushaf's own "ayah:word" markers, which reset to 1 at each new
// ayah). `Al-Kalimah` on the raw word rows is a GLOBAL per-surah counter
// (e.g. surah 1 ayah 2's words are 6-10, not 1-5), so callers must resolve
// through this map rather than assuming Marja.word === Al-Kalimah.
function Binae_Kalimah_Min_Marja(
  Marja: Marja_Kalimah,
  Kharitat_Al_Kalimat: Map<string, Al_Kalimah>,
  Kharitat_Al_Ayaat: Map<number, Al_Ayah>,
  Akhar_Kalimah_Fi_Kul_Ayah: Map<number, number>,
  Haql_Al_Arabi: ReturnType<typeof getArabicField>
): Al_Kalimah_Al_Muhallalah | null {
  const Kalimah = Kharitat_Al_Kalimat.get(`${Marja.ayah}:${Marja.word}`);
  if (!Kalimah) return null;

  // Fahras_Al_Kalimah / Nihayat_Al_Ayah must be derived from the resolved
  // word's actual GLOBAL Al-Kalimah value, not Marja.word (per-verse), to
  // stay consistent with Bina_Musallaf_An_Nass and the non-Tansiq
  // (As-Satr) rendering path below, both of which index by global count.
  const Raqm_Al_Kalimah_Al_Aalami = Kalimah["Al-Kalimah"];

  const Ayah = Kharitat_Al_Ayaat.get(Marja.ayah) ?? null;
  const Hal_Nihayat_Al_Ayah = Akhar_Kalimah_Fi_Kul_Ayah.get(Marja.ayah) === Raqm_Al_Kalimah_Al_Aalami;

  return {
    Ar_Rasm: pickArabicText(Kalimah, Haql_Al_Arabi),
    Al_Ayah: Ayah,
    Fahras_Al_Kalimah: Raqm_Al_Kalimah_Al_Aalami - 1,
    Nihayat_Al_Ayah: Hal_Nihayat_Al_Ayah,
    Raqm_Al_Ayah_Hal: false,
    Alamat_Al_Ayah_Hal: false,
    Raqm_Al_Ayah: Marja.ayah,
  };
}

export function Qaimat_As_Safahat({
  surah: Surah,
  showArabicText: Izhaar_An_Nass_Al_Arabi,
  hoverTranslation: Tarjamah_Ind_Al_Tamreer,
  inlineTranslation: At_Tarjamah_Al_Mudmajah,
  inlineTransliteration: Al_Kitabah_As_Sawtiyyah_Al_Mudmajah,
  fontClass: Fiat_Al_Khatt,
  arabicFontSize: Hajm_Khatt_Al_Arabi,
  translationFontSize: Hajm_Khatt_At_Tarjamah,
  transliterationFontSize: Hajm_Khatt_Al_Kitabah_As_Sawtiyyah,
  showTransliteration: Izhaar_Al_Kitabah_As_Sawtiyyah,
  verseRefs: Maraji_Al_Ayaat,
  wordSpacing: Tabaud_Al_Kalimaat = "1.8px",
  hideVerses: Ikhfa_Al_Ayaat = false,
  hideVerseMarkers: Ikhfa_Alamaat_Al_Ayaat = false,
  pageFooter: Thayl_As_Safhah,
}: Omit<PageViewProps, "assembledSurah">) {
  const { quranFont, settings } = useApp();
  const [Al_Ayah_Al_Mawroorah, Dabt_Al_Ayah_Al_Mawroorah] = useState<number | null>(null);

  // Fall back to props if settings from context are undefined
  const activeHoverTranslation = settings?.hoverTranslation ?? Tarjamah_Ind_Al_Tamreer;
  const activeInlineTranslation = settings?.inlineTranslation ?? At_Tarjamah_Al_Mudmajah;
  const activeInlineTransliteration = settings?.inlineTransliteration ?? Al_Kitabah_As_Sawtiyyah_Al_Mudmajah;

  // Derive target editions for translation and transliteration
  const Isdar_Tarjamah = Naqi_Al_Isdar(activeInlineTranslation) || Naqi_Al_Isdar(activeHoverTranslation);
  const Isdar_Naqharah = Naqi_Al_Isdar(activeInlineTransliteration);

  const Asdarat_At_Tarjamah_Al_Matlubah = useMemo(
    () => Array.from(new Set([Isdar_Tarjamah].filter((x): x is string => !!x))),
    [Isdar_Tarjamah]
  );

  const Asdarat_An_Naqharah_Al_Matlubah = useMemo(
    () => Array.from(new Set([Isdar_Naqharah].filter((x): x is string => !!x))),
    [Isdar_Naqharah]
  );

  const Raqm_As_Surah = Surah["As-Surah"] ?? (Surah as any).id;

  // This view only ever consumes word-by-word text (At-Tarjamaat-Kalimah /
  // An-Naqharat-Kalimah), so the requested editions must go into the Wbw_*
  // (word-by-word) argument slots, not the verse-level slots. Passing them
  // as verse-level args fetches At-Tarjamaat / An-Naqharat instead, which
  // nothing here reads, and leaves the word-level maps empty.
  const { data: Bayanat_As_Surah, isLoading: Hal_Yatamm_Tahmeel_As_Surah, error: Khata_Bayanat_As_Surah } = useQuery<Bayanat_As_Surah>({
    queryKey: [
      "bayanatAsSurah",
      Raqm_As_Surah,
      Asdarat_At_Tarjamah_Al_Matlubah.join(","),
      Asdarat_An_Naqharah_Al_Matlubah.join(","),
    ],
    queryFn: () =>
      Jalb_Bayanat_As_Surah(
        Raqm_As_Surah,
        [],
        [],
        Asdarat_At_Tarjamah_Al_Matlubah,
        Asdarat_An_Naqharah_Al_Matlubah
      ),
    staleTime: 1000 * 60 * 30,
  });

  const { data: Aqsam_As_Safahat, isLoading: Hal_Yatamm_Tahmeel_Aqsam } = useQuery<Aqsam_As_Safahat>({
    queryKey: ["aqsamAsSafahat"],
    queryFn: Jalb_Aqsam_As_Safahat_Corpus,
    staleTime: 1000 * 60 * 60,
  });

  const { data: As_Safahat_Kham, isLoading: Hal_Yatamm_Tahmeel_Safahat_Kham } = useQuery<As_Safhah[]>({
    queryKey: ["safahatKham"],
    queryFn: Jalb_Qaimat_As_Safahat,
    staleTime: 1000 * 60 * 60,
  });

  const Kharitat_As_Safahat_Kham = useMemo(() => {
    const Kharitah = new Map<number, As_Safhah>();
    (As_Safahat_Kham || []).forEach((Safhah) => {
      const Raqm = (Safhah as any)["As-Safhah"];
      if (Raqm !== undefined && Raqm !== null) Kharitah.set(Raqm, Safhah);
    });
    return Kharitah;
  }, [As_Safahat_Kham]);

  const Hal_Khatt_IndoPak = quranFont === "indopak";
  const Hal_Khatt_Uthmani_V4 = quranFont === "uthmani_v4";

  const Haql_Al_Arabi = useMemo(() => getArabicField(quranFont), [quranFont]);

  const As_Surah_An_Nashitah: As_Surah | null = Bayanat_As_Surah?.["As-Surah"] || null;
  const Al_Ayat: Al_Ayah[] = Bayanat_As_Surah?.["Al-Ayat"] || [];
  const Al_Kalimat: Al_Kalimah[] = Bayanat_As_Surah?.["Al-Kalimat"] || [];

  const Tansiq_Al_Mushaf = (As_Surah_An_Nashitah as any)?.["Tansiq-Al-Mushaf"] ?? null;

  const Kalimaat_Al_Basmalah = useMemo(() => {
    if (!Izhaar_An_Nass_Al_Arabi || !Al_Ayat.length) return [];
    const Al_Ayah_Al_Ula = Al_Ayat[0];
    if (!Al_Ayah_Al_Ula) return [];

    const Al_Kalimaat = Jalb_Kalimaat_Al_Ayah(Al_Ayah_Al_Ula, Haql_Al_Arabi);
    if (!Array.isArray(Al_Kalimaat)) return [];

    return Al_Kalimaat.slice(0, 4).map((An_Nass_Al_Arabi: string) => ({
      glyph: An_Nass_Al_Arabi,
      translation: "",
      transliteration: "",
    }));
  }, [Izhaar_An_Nass_Al_Arabi, Al_Ayat, Haql_Al_Arabi]);

  const Kharitat_Alamaat_Al_Ayaat = useMemo(() => {
    if (!Hal_Khatt_IndoPak || !Al_Ayat.length) return [];
    const Al_Murattabah = [...Al_Ayat].sort(
      (A: Al_Ayah, B: Al_Ayah) => A["Al-Ayah"] - B["Al-Ayah"]
    );
    return Al_Murattabah.map((V: Al_Ayah) => V["Alamaat-IndoPak"] ?? "");
  }, [Hal_Khatt_IndoPak, Al_Ayat]);

  const Jalb_Ailat_Khatt_As_Safhah = (Raqm_As_Safhah: number): string => {
    switch (quranFont) {
      case "indopak":
        return "IndoPak";
      case "uthmani":
        return "Uthmani";
      case "uthmani_v1":
        return `Uthmani-V1-${Raqm_As_Safhah}`;
      case "uthmani_v2":
        return `Uthmani-V2-${Raqm_As_Safhah}`;
      case "uthmani_v4":
        return `Uthmani-V4-${Raqm_As_Safhah}`;
      default:
        return "Uthmani";
    }
  };

  const Kharitat_Tarjamat_Al_Kalimat = useMemo(
    () => Binae_Kharitat_Nusus_Al_Kalimat(
      Bayanat_As_Surah?.["At-Tarjamaat-Kalimah"],
      Marji_Isdar_At_Tarjamah_Kalimah,
      Nass_At_Tarjamah_Kalimah
    ),
    [Bayanat_As_Surah]
  );

  const Kharitat_Naqharat_Al_Kalimat = useMemo(
    () => Binae_Kharitat_Nusus_Al_Kalimat(
      Bayanat_As_Surah?.["An-Naqharat-Kalimah"],
      Marji_Isdar_An_Naqharah_Kalimah,
      Nass_An_Naqharah_Kalimah
    ),
    [Bayanat_As_Surah]
  );

  const Safahat = useMemo(() => {
    if (!As_Surah_An_Nashitah || !Al_Ayat.length) return [];

    const Bidayat_As_Safhah = As_Surah_An_Nashitah["Bidayat-As-Safhah"];
    const Nihayat_As_Safhah = As_Surah_An_Nashitah["Nihayat-As-Safhah"];

    const Al_Natijah: {
      pageNumber: number;
      verses: Al_Ayah[];
      bayanatSafhah: As_Safhah | null;
    }[] = [];

    const Kharitat_Al_Ayaat = new Map<number, Al_Ayah>();
    for (const Al_Ayah of Al_Ayat) Kharitat_Al_Ayaat.set(Al_Ayah["Al-Ayah"], Al_Ayah);

    if (!Aqsam_As_Safahat || !Bidayat_As_Safhah || !Nihayat_As_Safhah) {
      return [{
        pageNumber: 1,
        verses: Al_Ayat,
        bayanatSafhah: Kharitat_As_Safahat_Kham.get(1) || null,
      }];
    }

    for (let Raqm_As_Safhah = Bidayat_As_Safhah; Raqm_As_Safhah <= Nihayat_As_Safhah; Raqm_As_Safhah++) {
      const Qism_Li_Taqti_Al_Ayat = (Aqsam_As_Safahat as any)[Raqm_As_Safhah] || null;
      const Al_Ajza = Tahleel_Ajza_As_Safhah(Qism_Li_Taqti_Al_Ayat);

      const Safhah_Khaam_Li_Hadhihi_As_Safhah = Kharitat_As_Safahat_Kham.get(Raqm_As_Safhah) || null;

      if (!Al_Ajza) {
        Al_Natijah.push({
          pageNumber: Raqm_As_Safhah,
          verses: Al_Ayat,
          bayanatSafhah: Safhah_Khaam_Li_Hadhihi_As_Safhah,
        });
        continue;
      }

      const Juz_As_Surah = Al_Ajza.find((Seg) => Seg.surah === As_Surah_An_Nashitah["As-Surah"]);
      if (!Juz_As_Surah) continue;

      const Ayaat_As_Safhah: Al_Ayah[] = [];
      for (let Raqm_Al_Ayah = Juz_As_Surah.startVerse; Raqm_Al_Ayah <= Juz_As_Surah.endVerse; Raqm_Al_Ayah++) {
        const Al_Ayah = Kharitat_Al_Ayaat.get(Raqm_Al_Ayah);
        if (Al_Ayah) Ayaat_As_Safhah.push(Al_Ayah);
      }

      if (Ayaat_As_Safhah.length > 0) {
        Al_Natijah.push({
          pageNumber: Raqm_As_Safhah,
          verses: Ayaat_As_Safhah,
          bayanatSafhah: Safhah_Khaam_Li_Hadhihi_As_Safhah,
        });
      }
    }

    if (Al_Natijah.length === 0) {
      return [{
        pageNumber: Bidayat_As_Safhah || 1,
        verses: Al_Ayat,
        bayanatSafhah: Kharitat_As_Safahat_Kham.get(Bidayat_As_Safhah || 1) || null,
      }];
    }

    return Al_Natijah;
  }, [As_Surah_An_Nashitah, Al_Ayat, Aqsam_As_Safahat, Kharitat_As_Safahat_Kham]);

  const { Kharitat_Al_Kalimat, Kharitat_Al_Ayaat_Marja, Akhar_Kalimah_Fi_Kul_Ayah } = useMemo(() => {
    // Al-Kalimah on each word row is a GLOBAL per-surah word counter (e.g.
    // surah 1 ayah 2's words are numbered 6-10, continuing on from ayah 1's
    // 1-5) — NOT a per-verse index. Tansiq_Al_Mushaf's own "ayah:word"
    // markers, however, reset to 1 at the start of every ayah. So this map
    // is keyed by ayah + PER-VERSE position (derived below from each ayah's
    // lowest Al-Kalimah value) to match Tansiq's numbering, rather than by
    // the raw global Al-Kalimah value directly.
    const Awwal_Kalimah_Fi_Kul_Ayah = new Map<number, number>();
    for (const Kalimah of Al_Kalimat) {
      const Raqm_Al_Ayah = Kalimah["Al-Ayah"];
      const Raqm_Al_Kalimah = Kalimah["Al-Kalimah"];
      const Al_Adna_Al_Halii = Awwal_Kalimah_Fi_Kul_Ayah.get(Raqm_Al_Ayah);
      if (Al_Adna_Al_Halii === undefined || Raqm_Al_Kalimah < Al_Adna_Al_Halii) {
        Awwal_Kalimah_Fi_Kul_Ayah.set(Raqm_Al_Ayah, Raqm_Al_Kalimah);
      }
    }

    const Kharitat_Al_Kalimat = new Map<string, Al_Kalimah>();
    for (const Kalimah of Al_Kalimat) {
      const Raqm_Al_Ayah = Kalimah["Al-Ayah"];
      const Bidayat_Al_Ayah = Awwal_Kalimah_Fi_Kul_Ayah.get(Raqm_Al_Ayah);
      if (Bidayat_Al_Ayah === undefined) continue;
      const Fahras_Nisbi = Kalimah["Al-Kalimah"] - Bidayat_Al_Ayah + 1;
      Kharitat_Al_Kalimat.set(`${Raqm_Al_Ayah}:${Fahras_Nisbi}`, Kalimah);
    }

    const Akhar_Kalimah_Fi_Kul_Ayah = new Map<number, number>();
    for (const Kalimah of Al_Kalimat) {
      const Raqm_Al_Ayah = Kalimah["Al-Ayah"];
      const Raqm_Al_Kalimah = Kalimah["Al-Kalimah"];
      const Al_Aqsa_Al_Halii = Akhar_Kalimah_Fi_Kul_Ayah.get(Raqm_Al_Ayah);
      if (Al_Aqsa_Al_Halii === undefined || Raqm_Al_Kalimah > Al_Aqsa_Al_Halii) {
        Akhar_Kalimah_Fi_Kul_Ayah.set(Raqm_Al_Ayah, Raqm_Al_Kalimah);
      }
    }

    const Bina_Musallaf_An_Nass = (
  Raqm_Al_Ayah: number,
  Kharitat_An_Nass: Map<string, string>,
  Isdar: string | null
): string[] | undefined => {
  if (!Isdar) return undefined;

  const Awwal_Kalimah = Awwal_Kalimah_Fi_Kul_Ayah.get(Raqm_Al_Ayah);
  const Akhar_Kalimah = Akhar_Kalimah_Fi_Kul_Ayah.get(Raqm_Al_Ayah);
  if (Awwal_Kalimah === undefined || Akhar_Kalimah === undefined) return undefined;

  const Musallaf: string[] = [];
  for (
    let Raqm_Al_Kalimah_Al_Aalami = Awwal_Kalimah;
    Raqm_Al_Kalimah_Al_Aalami <= Akhar_Kalimah;
    Raqm_Al_Kalimah_Al_Aalami++
  ) {
    // Array position stays GLOBAL (Al-Kalimah - 1) to match Fahras_Al_Kalimah
    // as consumed downstream in Bitaqah.tsx / Binae_Kalimah_Min_Marja.
    // Only the map lookup key needs the PER-VERSE relative index, since
    // At-Tarjamaat-Kalimah / An-Naqharat-Kalimah are keyed that way
    // (Corpus-Loader.ts resets its word counter at each verse).
    const Fahras_Nisbi = Raqm_Al_Kalimah_Al_Aalami - Awwal_Kalimah + 1;
    Musallaf[Raqm_Al_Kalimah_Al_Aalami - 1] =
      Kharitat_An_Nass.get(`${Isdar}:${Raqm_Al_Ayah}:${Fahras_Nisbi}`) ?? "";
  }

  return Musallaf;
};

    const Kharitat_Al_Ayaat_Marja = new Map<number, Al_Ayah>();
    for (const Ayah of Al_Ayat) {
      const Raqm_Al_Ayah = Ayah["Al-Ayah"];
      const wbwTrans = Bina_Musallaf_An_Nass(Raqm_Al_Ayah, Kharitat_Tarjamat_Al_Kalimat, Isdar_Tarjamah);
      const wbwTransl = Bina_Musallaf_An_Nass(Raqm_Al_Ayah, Kharitat_Naqharat_Al_Kalimat, Isdar_Naqharah);

      Kharitat_Al_Ayaat_Marja.set(Raqm_Al_Ayah, {
        ...Ayah,
        wbwTranslation: wbwTrans,
        wbwTransliteration: wbwTransl,
      } as Al_Ayah);
    }

    return { Kharitat_Al_Kalimat, Kharitat_Al_Ayaat_Marja, Akhar_Kalimah_Fi_Kul_Ayah };
  }, [
    Al_Kalimat,
    Al_Ayat,
    Kharitat_Tarjamat_Al_Kalimat,
    Kharitat_Naqharat_Al_Kalimat,
    Isdar_Tarjamah,
    Isdar_Naqharah,
  ]);

  const Sutur_Marja_Min_Tansiq = useMemo(
    () => Tahleel_Tansiq_Al_Mushaf(Tansiq_Al_Mushaf),
    [Tansiq_Al_Mushaf]
  );

  const Sutur_Al_Muhlala = useMemo<Al_Kalimah_Al_Muhallalah[][]>(() => {
    if (!Al_Kalimat.length) return [];

    const Map_Sutur = new Map<number, Al_Kalimah[]>();
    for (const Kalimah of Al_Kalimat) {
      const Raqm_As_Satr = Kalimah["As-Satr"] || 1;
      if (!Map_Sutur.has(Raqm_As_Satr)) Map_Sutur.set(Raqm_As_Satr, []);
      Map_Sutur.get(Raqm_As_Satr)!.push(Kalimah);
    }

    const Sutur: Al_Kalimah_Al_Muhallalah[][] = [];

    Array.from(Map_Sutur.entries())
      .sort(([A], [B]) => A - B)
      .forEach(([_, Kalimaat_As_Satr]) => {
        const Satr: Al_Kalimah_Al_Muhallalah[] = Kalimaat_As_Satr.map((Kalimah) => {
          const Raqm_Al_Ayah = Kalimah["Al-Ayah"];
          const Ayah = Kharitat_Al_Ayaat_Marja.get(Raqm_Al_Ayah) ?? null;
          const Hal_Nihayat_Al_Ayah =
            Akhar_Kalimah_Fi_Kul_Ayah.get(Raqm_Al_Ayah) === Kalimah["Al-Kalimah"];

          return {
            Ar_Rasm: pickArabicText(Kalimah, Haql_Al_Arabi),
            Al_Ayah: Ayah,
            Fahras_Al_Kalimah: Kalimah["Al-Kalimah"] - 1,
            Nihayat_Al_Ayah: Hal_Nihayat_Al_Ayah,
            Raqm_Al_Ayah_Hal: false,
            Alamat_Al_Ayah_Hal: false,
            Raqm_Al_Ayah,
          };
        });

        Sutur.push(Satr);
      });

    return Sutur;
  }, [Al_Kalimat, Kharitat_Al_Ayaat_Marja, Akhar_Kalimah_Fi_Kul_Ayah, Haql_Al_Arabi]);

  const Sutur_Al_Muhlala_Hasab_As_Safhah = useMemo(() => {
    if (Safahat.length === 1 && Safahat[0].verses.length === Al_Ayat.length) {
      return [Sutur_Al_Muhlala];
    }

    return Safahat.map((As_Safhah) => {
      const Arqam_Al_Ayaat = new Set(As_Safhah.verses.map((V) => V["Al-Ayah"]));
      const Al_Musaffat = Sutur_Al_Muhlala.filter((Satr) =>
        Satr.some((Kalimah) =>
          Kalimah.Al_Ayah !== null
            ? Arqam_Al_Ayaat.has(Kalimah.Al_Ayah["Al-Ayah"])
            : Kalimah.Raqm_Al_Ayah
            ? Arqam_Al_Ayaat.has(Kalimah.Raqm_Al_Ayah)
            : false
        )
      );
      return Al_Musaffat.length > 0 ? Al_Musaffat : Sutur_Al_Muhlala;
    });
  }, [Safahat, Sutur_Al_Muhlala, Al_Ayat]);

  const Sutur_Kul_As_Safahat = useMemo(() => {
    return Safahat.map((As_Safhah, Tartib_As_Safhah) => {
      if (Sutur_Marja_Min_Tansiq) {
        const Sutur_Marja_Li_Hadhihi_As_Safhah = Taqti_As_Sutur_Hasab_As_Safhah(
          Sutur_Marja_Min_Tansiq,
          As_Safhah.bayanatSafhah
        );

        if (Sutur_Marja_Li_Hadhihi_As_Safhah) {
          const Sutur_Muhawwalah = Sutur_Marja_Li_Hadhihi_As_Safhah
            .map((Satr) =>
              Satr
                .map((Marja) =>
                  Binae_Kalimah_Min_Marja(
                    Marja,
                    Kharitat_Al_Kalimat,
                    Kharitat_Al_Ayaat_Marja,
                    Akhar_Kalimah_Fi_Kul_Ayah,
                    Haql_Al_Arabi
                  )
                )
                .filter((K): K is Al_Kalimah_Al_Muhallalah => K !== null)
            )
            .filter((Satr) => Satr.length > 0);

          if (Sutur_Muhawwalah.length > 0) return Sutur_Muhawwalah;
        }
      }

      return Sutur_Al_Muhlala_Hasab_As_Safhah[Tartib_As_Safhah] || Sutur_Al_Muhlala;
    });
  }, [
    Safahat,
    Sutur_Marja_Min_Tansiq,
    Kharitat_Al_Kalimat,
    Kharitat_Al_Ayaat_Marja,
    Akhar_Kalimah_Fi_Kul_Ayah,
    Haql_Al_Arabi,
    Sutur_Al_Muhlala_Hasab_As_Safhah,
    Sutur_Al_Muhlala,
  ]);

  const Hal_Yatamm_At_Tahmeel = Hal_Yatamm_Tahmeel_As_Surah || Hal_Yatamm_Tahmeel_Aqsam;

  if (Hal_Yatamm_At_Tahmeel || !As_Surah_An_Nashitah) {
    return (
      <div className="w-full space-y-4 p-8 text-center animate-pulse">
        <div className="h-12 bg-muted rounded-xl w-3/4 mx-auto" />
        <div className="h-40 bg-muted rounded-2xl w-full" />
      </div>
    );
  }

  const Raqm_Surah = As_Surah_An_Nashitah["As-Surah"];
  const Hal_Yajib_Izhaar_Al_Basmalah = Raqm_Surah !== 1 && Raqm_Surah !== 9 && Izhaar_An_Nass_Al_Arabi;

  return (
    <div id="quran-container" className="space-y-4">
      {Safahat.map((As_Safhah, Tartib_As_Safhah) => {
        const Ailat_Khatt_As_Safhah = Jalb_Ailat_Khatt_As_Safhah(As_Safhah.pageNumber);
        const Izhaar_Al_Basmalah_Fi_Hadhihi_As_Safhah = Tartib_As_Safhah === 0 && Hal_Yajib_Izhaar_Al_Basmalah;
        const Fiat_Al_Hawi =
          Tartib_As_Safhah === 0 ? "rounded-t-none rounded-b-[48px] mb-2" : "rounded-[48px] mb-2";

        const Sutur_Lil_Ardh = Sutur_Kul_As_Safahat[Tartib_As_Safhah] || Sutur_Al_Muhlala;

        const Safhah_Lil_Ardh = {
          pageNumber: As_Safhah.pageNumber,
          verses: As_Safhah.verses,
        };

        return (
          <Bitaqah
            key={As_Safhah.pageNumber}
            As_Safhah={Safhah_Lil_Ardh}
            Safhah_Khaam={As_Safhah.bayanatSafhah}
            Tartib_As_Safhah={Tartib_As_Safhah}
            Raqm_As_Surah={Raqm_Surah}
            Sutoor_Muhallalah={Sutur_Lil_Ardh}
            Fiat_Al_Hawi={Fiat_Al_Hawi}
            Izhaar_An_Nass_Al_Arabi={Izhaar_An_Nass_Al_Arabi}
            Izhaar_Al_Kitabah_As_Sawtiyyah={Izhaar_Al_Kitabah_As_Sawtiyyah}
            Izhaar_Al_Basmalah_Fi_Hadhihi_As_Safhah={Izhaar_Al_Basmalah_Fi_Hadhihi_As_Safhah}
            Kalimaat_Al_Basmalah={Kalimaat_Al_Basmalah}
            Ailat_Khatt_Al_Safhah={Ailat_Khatt_As_Safhah}
            Fiat_Al_Khatt={Fiat_Al_Khatt}
            Hajm_Khatt_Ar_Rasm={Hajm_Khatt_Al_Arabi}
            Tabaud_Al_Kalimaat={Tabaud_Al_Kalimaat}
            Maraji_Al_Ayaat={Maraji_Al_Ayaat}
            Al_Ayah_Al_Mumayyazah={Al_Ayah_Al_Mawroorah}
            Tain_Al_Ayah_Al_Mumayyazah={Dabt_Al_Ayah_Al_Mawroorah}
            Hajm_Khatt_Al_Kitabah_As_Sawtiyyah={Hajm_Khatt_Al_Kitabah_As_Sawtiyyah}
            Tarjamah_Ind_Al_Tamreer={Tarjamah_Ind_Al_Tamreer}
            At_Tarjamah_Al_Mudmajah={At_Tarjamah_Al_Mudmajah}
            Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={Al_Kitabah_As_Sawtiyyah_Al_Mudmajah}
            Ikhfaa_Al_Ayaat={Ikhfa_Al_Ayaat}
            Ikhfaa_Alamaat_Al_Ayaat={Ikhfa_Alamaat_Al_Ayaat}
            Hal_Huwa_Khatt_Indo_Pak={Hal_Khatt_IndoPak}
            Kharta_Alamaat_Al_Ayaat={Kharitat_Alamaat_Al_Ayaat}
            Hal_Huwa_Khatt_Uthmani_V4={Hal_Khatt_Uthmani_V4}
            Thayl_As_Safhah={Thayl_As_Safhah}
            Tansiq_Al_Mushaf={Tansiq_Al_Mushaf}
          />
        );
      })}
    </div>
  );
}