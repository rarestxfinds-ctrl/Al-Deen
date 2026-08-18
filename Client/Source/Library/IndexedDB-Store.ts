// Source/Library/IndexedDB-Store.ts
import type { Surah, Surah_Metadata } from "./Quran-Types";

const DB_NAME = "Quran";
const DB_VERSION = 5;

const SURAH_STORE = "Surah";
const AYAH_STORE = "Ayah";
const KALIMAH_STORE = "Kalimah";

let DB_Instance_Promise: Promise<IDBDatabase> | null = null;

const Open_Database = (): Promise<IDBDatabase> => {
  if (DB_Instance_Promise) return DB_Instance_Promise;

  DB_Instance_Promise = new Promise((Resolve, Reject) => {
    const Request = indexedDB.open(DB_NAME, DB_VERSION);

    Request.onupgradeneeded = (Event: IDBVersionChangeEvent) => {
      const DB = (Event.target as IDBOpenDBRequest).result;

      if (!DB.objectStoreNames.contains(SURAH_STORE)) {
        DB.createObjectStore(SURAH_STORE);
      }
      if (!DB.objectStoreNames.contains(AYAH_STORE)) {
        DB.createObjectStore(AYAH_STORE);
      }
      if (!DB.objectStoreNames.contains(KALIMAH_STORE)) {
        DB.createObjectStore(KALIMAH_STORE);
      }
    };

    Request.onsuccess = (Event: Event) =>
      Resolve((Event.target as IDBOpenDBRequest).result);

    Request.onerror = (Event: Event) => {
      DB_Instance_Promise = null;
      Reject((Event.target as IDBOpenDBRequest).error);
    };
  });

  return DB_Instance_Promise;
};

// --- Generic Helper Operations ---

const Get_Record = async <T>(Store_Name: string, Key: string): Promise<T | null> => {
  try {
    const DB = await Open_Database();
    return new Promise((Resolve) => {
      const Tx = DB.transaction(Store_Name, "readonly");
      const Request = Tx.objectStore(Store_Name).get(Key);
      Request.onsuccess = () => Resolve(Request.result || null);
      Request.onerror = () => Resolve(null);
    });
  } catch {
    return null;
  }
};

const Save_Record = async <T>(Store_Name: string, Key: string, Data: T): Promise<void> => {
  try {
    const DB = await Open_Database();
    return new Promise((Resolve, Reject) => {
      const Tx = DB.transaction(Store_Name, "readwrite");
      const Request = Tx.objectStore(Store_Name).put(Data, Key);
      
      Tx.oncomplete = () => Resolve();
      Tx.onerror = () => Reject(Tx.error);
      Request.onerror = () => Reject(Request.error);
    });
  } catch (Err) {
    console.error(`[INDEXEDDB ERROR] Failed to save in ${Store_Name}:`, Err);
  }
};

const Delete_Record = async (Store_Name: string, Key: string): Promise<void> => {
  try {
    const DB = await Open_Database();
    return new Promise((Resolve, Reject) => {
      const Tx = DB.transaction(Store_Name, "readwrite");
      const Request = Tx.objectStore(Store_Name).delete(Key);
      
      Tx.oncomplete = () => Resolve();
      Tx.onerror = () => Reject(Tx.error);
      Request.onerror = () => Reject(Request.error);
    });
  } catch (Err) {
    console.error(`[INDEXEDDB ERROR] Failed to delete from ${Store_Name}:`, Err);
  }
};

// --- Key Builders ---

export const Build_Surah_Key = (
  Surah_Number: number,
  Resource_ID?: string
): string => {
  if (!Resource_ID) {
    return `${Surah_Number}`;
  }
  return `${Surah_Number}:${Resource_ID.trim()}`;
};

// --- Surah Store Operations ---

// Single full Surah payload
export const Get_Saved_Surah = <T = Surah>(Key: string | number): Promise<T | null> =>
  Get_Record<T>(SURAH_STORE, String(Key));

export const Save_Surah_Locally = <T = Surah>(Key: string | number, Data: T): Promise<void> =>
  Save_Record<T>(SURAH_STORE, String(Key), Data);

export const Delete_Saved_Surah = (Key: string | number): Promise<void> =>
  Delete_Record(SURAH_STORE, String(Key));

// Full list of Surah metadata entries
export const Get_Saved_Suwar_Metadata = <T = Surah_Metadata[]>(Key: string | number = 0): Promise<T | null> =>
  Get_Record<T>(SURAH_STORE, String(Key));

export const Save_Suwar_Metadata_Locally = <T = Surah_Metadata[]>(Key: string | number = 0, Data: T): Promise<void> =>
  Save_Record<T>(SURAH_STORE, String(Key), Data);

// --- Ayah Store Operations ---

export const Get_Saved_Ayah = <T = unknown>(Key: string): Promise<T | null> =>
  Get_Record<T>(AYAH_STORE, Key);

export const Get_Saved_Ayaat = <T = unknown>(Key: string): Promise<T | null> =>
  Get_Record<T>(AYAH_STORE, Key);

export const Save_Ayaat_Locally = <T = unknown>(Key: string, Data_List: T): Promise<void> =>
  Save_Record<T>(AYAH_STORE, Key, Data_List);

export const Delete_Saved_Ayaat = (Key: string): Promise<void> =>
  Delete_Record(AYAH_STORE, Key);

// --- Kalimah Store Operations ---

export const Get_Saved_Kalimah = <T = unknown>(Key: string): Promise<T | null> =>
  Get_Record<T>(KALIMAH_STORE, Key);

export const Get_Saved_Kalimaat = <T = unknown>(Key: string): Promise<T | null> =>
  Get_Record<T>(KALIMAH_STORE, Key);

export const Save_Kalimaat_Locally = <T = unknown>(Key: string, Data_List: T): Promise<void> =>
  Save_Record<T>(KALIMAH_STORE, Key, Data_List);

export const Delete_Saved_Kalimaat = (Key: string): Promise<void> =>
  Delete_Record(KALIMAH_STORE, Key);

// --- Utility Operations ---

export const Clear_All_Offline_Data = async (): Promise<void> => {
  try {
    const DB = await Open_Database();
    const Stores = [SURAH_STORE, AYAH_STORE, KALIMAH_STORE];
    return new Promise((Resolve, Reject) => {
      const Tx = DB.transaction(Stores, "readwrite");
      Stores.forEach((Store) => Tx.objectStore(Store).clear());
      Tx.oncomplete = () => Resolve();
      Tx.onerror = () => Reject(Tx.error);
    });
  } catch (Err) {
    console.error("[INDEXEDDB ERROR] Failed to clear offline stores:", Err);
  }
};