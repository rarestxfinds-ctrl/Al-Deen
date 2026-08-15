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
}

export interface At_Tarjamah {
  "As-Surah": number;
  "Al-Ayah": number;
  "At-Tarjamah": string;
  [Key: string]: any;
}

export interface Bayanat_As_Surah {
  "As-Surah": As_Surah;
  "Al-Ayat": Al_Ayah[];
  "Al-Kalimat": Al_Kalimah[];
  "At-Tarjamaat": At_Tarjamah[];
}

export interface Qit_At_As_Safhah {
  "As-Surah": number;
  "Bidayat-Al-Ayah": number;
  "Nihayat-Al-Ayah": number;
}

export type Aqsam_As_Safahat = Record<number, Qit_At_As_Safhah[]>;