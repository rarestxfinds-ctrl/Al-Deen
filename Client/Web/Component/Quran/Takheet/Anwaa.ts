import type React from "react";

// Flexible Surah Metadata Interface supporting new and legacy schemas
export interface SurahMeta {
  "As-Surah"?: number;
  id?: number;
  Surah?: number;
  "Al-Arabiyyah"?: string;
  Arabic?: string;
  "At-Tarjamah"?: string;
  Tarjamah?: string;
  "At-Tansiq"?: string;
  Nataqah?: string;
  "Makan-Al-Wahy"?: string | null;
  "Tartib-Al-Wahy"?: number | null;
  "Adad-Al-Ayat"?: number;
  "Bidayat-As-Safhah"?: number;
  "Nihayat-As-Safhah"?: number;
  "Alamah-Indo-Pak"?: string | string[] | null;
  "Tansiq-Al-Mushaf"?: string | null;
  pages?: [number, number];
  [key: string]: any;
}

// Flexible Ayah Verse Interface supporting new and legacy schemas
export interface AssembledVerse {
  "As-Surah"?: number;
  Surah?: number;
  "Al-Ayah"?: number;
  Ayah?: number;
  verseNumber?: number;
  "Al-Arabiyyah"?: string;
  "Al-Arabiyyah-A"?: string | null;
  "Al-Arabiyyah-B"?: string | null;
  arabic?: string;
  arabicV1?: string | null;
  arabicV2?: string | null;
  "Alamah-Indo-Pak"?: string | null;
  indoPakMarker?: string | null;
  [key: string]: any;
}

export interface AssembledSurah extends SurahMeta {
  Al_Ayat?: AssembledVerse[];
  verses?: AssembledVerse[];
  Al_Kalimat?: any[];
  words?: any[];
  lines?: string[][];
}

export interface Sifat_Mulahazat_Al_Kalimah {
  translation?: string;
  transliteration?: string;
  At_Tarjamah?: string;
  Al_Kitabah_As_Sawtiyyah?: string;
  enabled?: boolean;
  Hal_Mufallat?: boolean;
  onClick?: () => void;
  Ind_An_Naqr?: () => void;
  onMouseEnter?: () => void;
  Ind_Dukhul_Al_Mawroor?: () => void;
  onMouseLeave?: () => void;
  Ind_Khuruj_Al_Mawroor?: () => void;
  children: React.ReactNode;
}

export interface Al_Kalimah_Al_Muhallalah {
  Ar_Rasm: string;
  Al_Ayah: AssembledVerse | null;
  Fahras_Al_Kalimah: number;
  Nihayat_Al_Ayah: boolean;
  Raqm_Al_Ayah_Hal: boolean;
  Alamat_Al_Ayah_Hal: boolean;
  Raqm_Al_Ayah?: number;
  Al_Kitabah_As_Sawtiyyah?: string;
}

export interface Kalimat_Al_Basmalah {
  Ar_Rasm: string;
  At_Tarjamah?: string;
  Al_Kitabah_As_Sawtiyyah?: string;
}

export interface Sifat_Sutoor_Al_Safhah {
  Sutoor_Muhallalah: Al_Kalimah_Al_Muhallalah[][];
  Fiat_Al_Khatt: string;
  Hajm_Khatt_Ar_Rasm: string;
  Tabaud_Al_Kalimaat: string;
  Raqm_As_Surah: number;
  Maraji_Al_Ayaat: React.MutableRefObject<Map<number, HTMLDivElement>>;
  Al_Ayah_Al_Mumayyazah: number | null;
  Tain_Al_Ayah_Al_Mumayyazah: (Ayah: number | null) => void;
  Izhaar_Al_Kitabah_As_Sawtiyyah?: boolean;
  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah?: string;
  Tarjamah_Ind_Al_Tamreer: string | boolean;
  At_Tarjamah_Al_Mudmajah: string;
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah: string;
  Ikhfaa_Al_Ayaat?: boolean;
  Ikhfaa_Alamaat_Al_Ayaat?: boolean;
  // Basmalah Props
  Kalimaat_Al_Basmalah?: Kalimat_Al_Basmalah[];
  Ailat_Khatt_Al_Basmalah?: string;
  Fiat_Khatt_Al_Basmalah?: string;
  Hajm_Khatt_Al_Basmalah?: string;
  Ailat_Khatt_Al_Safhah?: string;
  Hal_Huwa_Khatt_Indo_Pak?: boolean;
  Kharta_Alamaat_Al_Ayaat?: string[];
  Hal_Huwa_Khatt_Uthmani_V4?: boolean;
  Mawasat_As_Sutoor?: boolean;
}

export interface Sifat_Bitaqat_Al_Ayah {
  Al_Ayah: AssembledVerse;
  Kalimaat?: any[];
  At_Tarjamah?: string | null;
  Haashiyah?: string[];
  Surah?: SurahMeta;
  As_Safhah?: { pageNumber: number; verses: AssembledVerse[] };
  Tartib_As_Safhah?: number;
  Raqm_As_Surah?: number;
  Sutoor_Muhallalah?: Al_Kalimah_Al_Muhallalah[][];
  Fiat_Al_Hawi?: string;
  Izhaar_An_Nass_Al_Arabi?: boolean;
  Tarjamat_Al_Ayah?: boolean;
  Izhaar_Al_Basmalah_Fi_Hadhihi_As_Safhah?: boolean;
  Kalimaat_Al_Basmalah?: Kalimat_Al_Basmalah[];
  Ailat_Khatt_Al_Safhah?: string;
  Fiat_Al_Khatt?: string;
  Hajm_Khatt_Ar_Rasm?: string;
  Hajm_Khatt_At_Tarjamah?: string;
  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah?: string;
  Izhaar_Al_Kitabah_As_Sawtiyyah?: boolean;
  Hal_Huwa_Muayyaz?: boolean;
  Marji_Al_Ayah?: (element: HTMLDivElement | null) => void;
  Maraji_Al_Ayaat?: React.MutableRefObject<Map<number, HTMLDivElement>>;
  Al_Ayah_Al_Mumayyazah?: number | null;
  Tain_Al_Ayah_Al_Mumayyazah?: (Ayah: number | null) => void;
  Tarjamah_Ind_Al_Tamreer?: string | boolean;
  At_Tarjamah_Al_Mudmajah?: string;
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah?: string;
  Ikhfaa_Al_Ayaat?: boolean;
  Ikhfaa_Alamaat_Al_Ayaat?: boolean;
  Hal_Huwa_Khatt_Indo_Pak?: boolean;
  Kharta_Alamaat_Al_Ayaat?: string[];
  Hal_Huwa_Khatt_Uthmani_V4?: boolean;
  Thayl_As_Safhah?: React.ReactNode;
  Tabaud_Al_Kalimaat?: string;
  An_Naqr_Ala_Al_Mulahazaat?: () => void;
  An_Naqr_Ala_Al_Musharakah?: () => void;
  An_Naqr_Ala_At_Tafseer?: () => void;
  An_Naqr_Ala_At_Tadmeen?: () => void;
  An_Naqr_Ala_Al_Muayanah?: () => void;
}

// Props interface for Takheet/Ayah/Qaimah
export interface Sifat_Qaimah {
  Surah?: SurahMeta;
  Ayaat?: AssembledVerse[];
  Kalimaat?: any[];
  Tarajim?: any;
  Haashiyah?: string[];
  Izhaar_An_Nass_Al_Arabi?: boolean;
  Tarjamat_Al_Ayah?: boolean;
  Hajm_Khatt_At_Tarjamah?: string;
  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah?: string;
  Mukhtar_Al_Kitabah_As_Sawtiyyah?: string;
  Al_Ayah_Al_Mustahdafah?: string;
  Maraji_Al_Ayaat?: React.MutableRefObject<Map<number, HTMLDivElement>>;
  An_Naqr_Ala_Al_Mulahazaat?: (ayahId: number, text?: string) => void;
  An_Naqr_Ala_Al_Musharakah?: (ayahId: number, text?: string, translation?: string) => void;
  An_Naqr_Ala_At_Tafseer?: (ayahId: number) => void;
  An_Naqr_Ala_At_Tadmeen?: (ayahId: number) => void;
  An_Naqr_Ala_Al_Muayanah?: (ayahId: number) => void;
  Qimmah_Musattahah_Lil_Unsur_Al_Awwal?: boolean;
}

// Backward-compatible export alias
export type Sifat_Qaimat_Al_Ayaat = Sifat_Qaimah;

export interface PageViewProps {
  Surah: SurahMeta;
  assembledSurah?: AssembledSurah;
  Izhaar_An_Nass_Al_Arabi: boolean;
  Tarjamah_Ind_Al_Tamreer: string | boolean;
  At_Tarjamah_Al_Mudmajah: string;
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah: string;
  Fiat_Al_Khatt: string;
  Hajm_Khatt_Ar_Rasm: string;
  Hajm_Khatt_At_Tarjamah: string;
  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah?: string;
  Izhaar_Al_Kitabah_As_Sawtiyyah?: boolean;
  Maraji_Al_Ayaat: React.MutableRefObject<Map<number, HTMLDivElement>>;
  Tabaud_Al_Kalimaat?: string;
  Ikhfaa_Al_Ayaat?: boolean;
  Ikhfaa_Alamaat_Al_Ayaat?: boolean;
  Thayl_As_Safhah?: React.ReactNode;
}