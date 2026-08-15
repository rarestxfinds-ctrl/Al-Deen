// Client/Source/Library/IndexedDB-Store.ts
import type { As_Surah } from "./Quran-Types";

const ISAM_QAIDAT_AL_BAYANAT = "Al-Quran";

const MAKHZAN_AS_SUWAR = "As-Suwar";
const MAKHZAN_AL_AYAT = "Al-Ayat";
const MAKHZAN_AL_KALIMAAT = "Al-Kalimaat";
const MAKHZAN_MILAFFAT_AL_QAWAID = "Milaffat-Al-Qawaid";

let Damaan_Qaidat_Al_Bayanat: Promise<IDBDatabase> | null = null;

const Fath_Qaidat_Al_Bayanat = (): Promise<IDBDatabase> => {
  if (Damaan_Qaidat_Al_Bayanat) return Damaan_Qaidat_Al_Bayanat;

  Damaan_Qaidat_Al_Bayanat = new Promise((Resolve, Reject) => {
    const Talab = indexedDB.open(ISAM_QAIDAT_AL_BAYANAT, 5);

    Talab.onupgradeneeded = (Hadath: IDBVersionChangeEvent) => {
      const Qaidat = (Hadath.target as IDBOpenDBRequest).result;

      if (Qaidat.objectStoreNames.contains("Qaimat-As-Surah")) {
        Qaidat.deleteObjectStore("Qaimat-As-Surah");
      }
      if (Qaidat.objectStoreNames.contains("As-Surah")) {
        Qaidat.deleteObjectStore("As-Surah");
      }

      if (!Qaidat.objectStoreNames.contains(MAKHZAN_AS_SUWAR)) {
        Qaidat.createObjectStore(MAKHZAN_AS_SUWAR);
      }
      if (!Qaidat.objectStoreNames.contains(MAKHZAN_AL_AYAT)) {
        Qaidat.createObjectStore(MAKHZAN_AL_AYAT);
      }
      if (!Qaidat.objectStoreNames.contains(MAKHZAN_AL_KALIMAAT)) {
        Qaidat.createObjectStore(MAKHZAN_AL_KALIMAAT);
      }
      if (!Qaidat.objectStoreNames.contains(MAKHZAN_MILAFFAT_AL_QAWAID)) {
        Qaidat.createObjectStore(MAKHZAN_MILAFFAT_AL_QAWAID);
      }
    };

    Talab.onsuccess = (Hadath: Event) => Resolve((Hadath.target as IDBOpenDBRequest).result);
    Talab.onerror = (Hadath: Event) => {
      Damaan_Qaidat_Al_Bayanat = null;
      Reject((Hadath.target as IDBOpenDBRequest).error);
    };
  });

  return Damaan_Qaidat_Al_Bayanat;
};

export const Build_Miftah_As_Surah = (
  Raqm_As_Surah: number,
  Resource_Id?: string
): string => {
  if (!Resource_Id) {
    return `${Raqm_As_Surah}`;
  }
  return `${Raqm_As_Surah}:${Resource_Id.trim()}`;
};

export const Build_Miftah_At_Tarjamah = Build_Miftah_As_Surah;

// As-Suwar Store
export const Jalb_As_Surah_Al_Mahfudhah = async (
  Raqm_As_Surah: number
): Promise<As_Surah | null> => {
  try {
    const Qaidat = await Fath_Qaidat_Al_Bayanat();
    return new Promise((Resolve) => {
      const Muamalah = Qaidat.transaction(MAKHZAN_AS_SUWAR, "readonly");
      const Talab = Muamalah.objectStore(MAKHZAN_AS_SUWAR).get(String(Raqm_As_Surah));
      Talab.onsuccess = () => Resolve(Talab.result || null);
      Talab.onerror = () => Resolve(null);
    });
  } catch {
    return null;
  }
};

export const Hifdh_As_Surah_Al_Mahfudhah = async (
  Raqm_As_Surah: number,
  Bayanat_As_Surah: As_Surah
): Promise<void> => {
  try {
    const Qaidat = await Fath_Qaidat_Al_Bayanat();
    const Muamalah = Qaidat.transaction(MAKHZAN_AS_SUWAR, "readwrite");
    Muamalah.objectStore(MAKHZAN_AS_SUWAR).put(Bayanat_As_Surah, String(Raqm_As_Surah));
  } catch {}
};

// Al-Ayat Store
export const Jalb_Al_Ayat_Al_Mahfudhah = async <T = [string[], string[], string[]]>(
  Miftah: string
): Promise<T | null> => {
  try {
    const Qaidat = await Fath_Qaidat_Al_Bayanat();
    return new Promise((Resolve) => {
      const Muamalah = Qaidat.transaction(MAKHZAN_AL_AYAT, "readonly");
      const Talab = Muamalah.objectStore(MAKHZAN_AL_AYAT).get(String(Miftah));
      Talab.onsuccess = () => Resolve(Talab.result || null);
      Talab.onerror = () => Resolve(null);
    });
  } catch {
    return null;
  }
};

export const Hifdh_Al_Ayat_Al_Mahfudhah = async (
  Miftah: string,
  Ayat_Arrays: [string[], string[], string[]] | string[]
): Promise<void> => {
  try {
    const Qaidat = await Fath_Qaidat_Al_Bayanat();
    const Muamalah = Qaidat.transaction(MAKHZAN_AL_AYAT, "readwrite");
    Muamalah.objectStore(MAKHZAN_AL_AYAT).put(Ayat_Arrays, String(Miftah));
  } catch {}
};

// Al-Kalimaat Store
export const Jalb_Al_Kalimaat_Al_Mahfudhah = async <T = [string[][], string[][], string[][]]>(
  Miftah: string
): Promise<T | null> => {
  try {
    const Qaidat = await Fath_Qaidat_Al_Bayanat();
    return new Promise((Resolve) => {
      const Muamalah = Qaidat.transaction(MAKHZAN_AL_KALIMAAT, "readonly");
      const Talab = Muamalah.objectStore(MAKHZAN_AL_KALIMAAT).get(String(Miftah));
      Talab.onsuccess = () => Resolve(Talab.result || null);
      Talab.onerror = () => Resolve(null);
    });
  } catch {
    return null;
  }
};

export const Hifdh_Al_Kalimaat_Al_Mahfudhah = async (
  Miftah: string,
  Kalimaat_Arrays: [string[][], string[][], string[][]] | string[][]
): Promise<void> => {
  try {
    const Qaidat = await Fath_Qaidat_Al_Bayanat();
    const Muamalah = Qaidat.transaction(MAKHZAN_AL_KALIMAAT, "readwrite");
    Muamalah.objectStore(MAKHZAN_AL_KALIMAAT).put(Kalimaat_Arrays, String(Miftah));
  } catch {}
};

// Binary DB File Storage
export const Jalb_Milaff_Qaidat_Al_Bayanat = async (
  Masar_Al_Milaff: string
): Promise<ArrayBuffer | null> => {
  try {
    const Qaidat = await Fath_Qaidat_Al_Bayanat();
    return new Promise((Resolve) => {
      const Muamalah = Qaidat.transaction(MAKHZAN_MILAFFAT_AL_QAWAID, "readonly");
      const Talab = Muamalah.objectStore(MAKHZAN_MILAFFAT_AL_QAWAID).get(Masar_Al_Milaff);
      Talab.onsuccess = () => Resolve(Talab.result || null);
      Talab.onerror = () => Resolve(null);
    });
  } catch {
    return null;
  }
};

export const Hifdh_Milaff_Qaidat_Al_Bayanat = async (
  Masar_Al_Milaff: string,
  Bayanat_Al_Milaff: ArrayBuffer
): Promise<void> => {
  const Qaidat = await Fath_Qaidat_Al_Bayanat();
  return new Promise((Resolve, Reject) => {
    const Muamalah = Qaidat.transaction(MAKHZAN_MILAFFAT_AL_QAWAID, "readwrite");
    Muamalah.objectStore(MAKHZAN_MILAFFAT_AL_QAWAID).put(Bayanat_Al_Milaff, Masar_Al_Milaff);
    Muamalah.oncomplete = () => Resolve();
    Muamalah.onerror = () => Reject(Muamalah.error);
  });
};