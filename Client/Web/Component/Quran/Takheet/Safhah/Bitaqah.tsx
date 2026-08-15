// Client/Web/Component/Quran/Takheet/Safhah/Bitaqah.tsx
import React, { memo, useMemo, useState, useRef, useLayoutEffect } from "react";
import { Container } from "@Web/Component/UI/Container";
import { useApp } from "@Web/Context/App";
import { useAudio } from "@Web/Context/Audio";
import { WordTooltip, useAudioPlayback, extractVerseNumberFromMarker } from "../Adawat";
import { Bismillah } from "@Web/Component/Quran/Bismillah";
import type { Sifat_Sutoor_Al_Safhah, Al_Kalimah_Al_Muhallalah, Sifat_Bitaqat_Al_Ayah } from "../Anwaa";

const NAMAT_KHATT_LATINI: React.CSSProperties = {
  fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  fontFeatureSettings: "normal",
  fontVariant: "normal",
  fontWeight: 400,
};

const ARABIC_FONT_FALLBACK = "'Uthmani', 'Amiri', 'Traditional Arabic', serif";

export const Sutoor_As_Safhah = memo(function Sutoor_As_Safhah({
  Sutoor_Muhallalah,
  Fiat_Al_Khatt,
  Hajm_Khatt_Ar_Rasm,
  Tabaud_Al_Kalimaat = "1.8px",
  Raqm_As_Surah,
  Maraji_Al_Ayaat,
  Al_Ayah_Al_Mumayyazah,
  Tain_Al_Ayah_Al_Mumayyazah,
  Izhaar_Al_Kitabah_As_Sawtiyyah,
  Tarjamah_Ind_Al_Tamreer,
  At_Tarjamah_Al_Mudmajah,
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah,
  Ikhfaa_Al_Ayaat = false,
  Ikhfaa_Alamaat_Al_Ayaat = false,
  Kalimaat_Al_Basmalah = [],
  Ailat_Khatt_Al_Basmalah,
  Fiat_Khatt_Al_Basmalah = Fiat_Al_Khatt,
  Hajm_Khatt_Al_Basmalah = Hajm_Khatt_Ar_Rasm,
  Ailat_Khatt_Al_Safhah,
  Hal_Huwa_Khatt_Indo_Pak = false,
  Kharta_Alamaat_Al_Ayaat = [],
  Hal_Huwa_Khatt_Uthmani_V4 = false,
  Mawasat_As_Sutoor = true,
}: Sifat_Sutoor_Al_Safhah) {
  const { hifz: Al_Hifz, settings: Al_Iadadat } = useApp();
  const { activeVerse: Al_Ayah_An_Nashitah, activeWord: Al_Kalimah_An_Nashitah, playAyah: Tashghil_Al_Ayah } = useAudio();
  const { playWordAudio: Tashghil_Sawt_Al_Kalimah, isPlaying: Hal_Yashthaghil } = useAudioPlayback(Raqm_As_Surah);

  const Hajm_At_Tarjamah_Al_Mudmajah = 12;
  const Hajm_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah = 12;

  // Resolve active settings from context or props
  const Active_Hover_Translation = Al_Iadadat?.hoverTranslation ?? Tarjamah_Ind_Al_Tamreer;
  const Active_Hover_Transliteration = Al_Iadadat?.hoverTransliteration ?? Izhaar_Al_Kitabah_As_Sawtiyyah;

  const Active_Inline_Translation = Al_Iadadat?.inlineTranslation ?? At_Tarjamah_Al_Mudmajah;
  const Active_Inline_Transliteration = Al_Iadadat?.inlineTransliteration ?? Al_Kitabah_As_Sawtiyyah_Al_Mudmajah;

  // Determine active modes (global feature toggles)
  const Hal_Tarjamah_Al_Tamreer_Mufallat = useMemo(
    () => Active_Hover_Translation !== "None" && Active_Hover_Translation !== false && Active_Hover_Translation !== undefined,
    [Active_Hover_Translation]
  );

  const Hal_Naqharah_Al_Tamreer_Mufallat = useMemo(
    () => Active_Hover_Transliteration !== "None" && Active_Hover_Transliteration !== false && Active_Hover_Transliteration !== undefined,
    [Active_Hover_Transliteration]
  );

  const Izhaar_At_Tarjamah_Al_Mudmajah = Active_Inline_Translation !== "None" && !!Active_Inline_Translation;
  const Izhaar_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah = Active_Inline_Transliteration !== "None" && !!Active_Inline_Transliteration;
  const Hal_Ayy_Idmaj_Nashit = Izhaar_At_Tarjamah_Al_Mudmajah || Izhaar_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah;

  const Ailat_Khatt_Al_Safhah_Maa_Al_Ihtiyat = useMemo(() => {
    const Al_Asasi = Ailat_Khatt_Al_Safhah || Fiat_Al_Khatt;
    return Al_Asasi ? `${Al_Asasi}, ${ARABIC_FONT_FALLBACK}` : ARABIC_FONT_FALLBACK;
  }, [Ailat_Khatt_Al_Safhah, Fiat_Al_Khatt]);

  const Hal_Al_Kalimah_Kamilah = (Al_Ayah: any, Fahras_Al_Kalimah: number): boolean => {
    if (!Al_Ayah) return false;
    const Raqm_Al_Ayah = Number(Al_Ayah["Al-Ayah"] ?? Al_Ayah.verseNumber ?? Al_Ayah.Ayah);
    return Al_Hifz.isWordCompleted(Raqm_As_Surah, Raqm_Al_Ayah, Fahras_Al_Kalimah);
  };

  const Binae_Fiat_Al_Kalimah = (
    Hal_Al_Ayah_Muzallalah: boolean,
    Hal_Alamah_Ayah: boolean,
    Hal_Nihayat_Ayah: boolean,
    Hal_Nashit: boolean,
    Hal_Yashthaghil_Sawt: boolean
  ): string => {
    let Fiat = "select-text transition-colors duration-200 inline print:text-black ";
    if (Hal_Al_Ayah_Muzallalah && !Hal_Alamah_Ayah) {
      Fiat += "text-[hsl(var(--quran-hover))]";
    } else if (Hal_Nashit) {
      Fiat += "text-foreground animate-pulse print:animate-none";
    } else if (Hal_Yashthaghil_Sawt) {
      Fiat += "text-[hsl(var(--quran-hover))] animate-pulse print:animate-none";
    } else if (Hal_Nihayat_Ayah || Hal_Alamah_Ayah) {
      Fiat += "text-muted-foreground hover:text-[hsl(var(--quran-hover))] cursor-pointer print:text-black";
    } else {
      if (!Hal_Huwa_Khatt_Uthmani_V4) {
        Fiat += "text-foreground hover:text-[hsl(var(--quran-hover))]";
      }
    }
    return Fiat;
  };

  const Binae_Mualijat_Al_Ahdath = (Al_Kalimah: Al_Kalimah_Al_Muhallalah) => {
    const { Ar_Rasm, Al_Ayah, Fahras_Al_Kalimah, Nihayat_Al_Ayah, Raqm_Al_Ayah_Hal, Raqm_Al_Ayah } = Al_Kalimah;

    const Raqm_Al_Ayah_Actual = Al_Ayah
      ? Number(Al_Ayah["Al-Ayah"] ?? Al_Ayah.verseNumber ?? Al_Ayah.Ayah)
      : Raqm_Al_Ayah;

    let An_Naqr: (() => void) | undefined;
    if (Al_Ayah && Raqm_Al_Ayah_Actual !== null && Raqm_Al_Ayah_Actual !== undefined) {
      An_Naqr = Nihayat_Al_Ayah
        ? () => Tashghil_Al_Ayah(Raqm_As_Surah, Raqm_Al_Ayah_Actual)
        : () => Tashghil_Sawt_Al_Kalimah(Raqm_Al_Ayah_Actual, Fahras_Al_Kalimah);
    } else if (Raqm_Al_Ayah_Hal) {
      const Raqm = extractVerseNumberFromMarker(Ar_Rasm);
      if (Raqm !== null) An_Naqr = () => Tashghil_Al_Ayah(Raqm_As_Surah, Raqm);
    }

    const Dukhul_Al_Mawroor = () => {
      if (Raqm_Al_Ayah_Hal) {
        const Raqm = extractVerseNumberFromMarker(Ar_Rasm);
        if (Raqm !== null) Tain_Al_Ayah_Al_Mumayyazah(Raqm);
      } else if (Nihayat_Al_Ayah && Raqm_Al_Ayah_Actual !== null && Raqm_Al_Ayah_Actual !== undefined) {
        Tain_Al_Ayah_Al_Mumayyazah(Raqm_Al_Ayah_Actual);
      }
    };

    const Khuruj_Al_Mawroor = () => {
      if (Raqm_Al_Ayah_Hal || Nihayat_Al_Ayah) {
        Tain_Al_Ayah_Al_Mumayyazah(null);
      }
    };

    return { An_Naqr, Dukhul_Al_Mawroor, Khuruj_Al_Mawroor };
  };

  const Ardh_Amud_Al_Kalimah = (Al_Kalimah: Al_Kalimah_Al_Muhallalah, Tartib: number, Hal_Awwal_As_Satr = false) => {
    const {
      Ar_Rasm,
      Al_Ayah,
      Fahras_Al_Kalimah,
      Nihayat_Al_Ayah,
      Raqm_Al_Ayah_Hal,
      Raqm_Al_Ayah,
    } = Al_Kalimah;

    const Raqm_Al_Ayah_Actual = Al_Ayah 
      ? Number(Al_Ayah["Al-Ayah"] ?? Al_Ayah.verseNumber ?? Al_Ayah.Ayah) 
      : Raqm_Al_Ayah;

    const Hal_Alamah_Ayah = Nihayat_Al_Ayah;
    const Hal_Yajib_Al_Ikhfa = (Ikhfaa_Al_Ayaat && !Hal_Alamah_Ayah) || (Ikhfaa_Alamaat_Al_Ayaat && Hal_Alamah_Ayah);
    const Hal_Iktimal_Al_Kalimah = Al_Ayah ? Hal_Al_Kalimah_Kamilah(Al_Ayah, Fahras_Al_Kalimah) : false;
    const Hal_Yajib_An_Yakun_Zahiran = !Hal_Yajib_Al_Ikhfa || Hal_Iktimal_Al_Kalimah;
    const Fiat_Ash_Shafafiyyah = Hal_Yajib_An_Yakun_Zahiran ? "opacity-100" : "opacity-0 print:opacity-100";
    const Fiat_Al_Intiqal = "transition-opacity duration-300";

    const Hal_Al_Ayah_Muzallalah = Al_Ayah_Al_Mumayyazah !== null && Raqm_Al_Ayah_Actual === Al_Ayah_Al_Mumayyazah;

    const Raw_Translation = !Nihayat_Al_Ayah && Al_Ayah
      ? (Al_Ayah as any).wbwTranslation?.[Fahras_Al_Kalimah]
      : undefined;

    const Raw_Transliteration = !Nihayat_Al_Ayah && Al_Ayah
      ? (Al_Ayah as any).wbwTransliteration?.[Fahras_Al_Kalimah]
      : undefined;

    const Nass_Tarjamah_Al_Idmaj = Izhaar_At_Tarjamah_Al_Mudmajah ? Raw_Translation : undefined;
    const Nass_Sawtiyyah_Al_Idmaj = Izhaar_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah ? Raw_Transliteration : undefined;

    const Miftah_Al_Kalimah = Raqm_Al_Ayah_Actual !== undefined ? `word-${Raqm_Al_Ayah_Actual}-${Fahras_Al_Kalimah}` : null;
    const Miftah_Al_Ayah = Raqm_Al_Ayah_Actual !== undefined ? `ayah-${Raqm_Al_Ayah_Actual}` : null;
    const Hal_Yashthaghil_Sawt =
      (Miftah_Al_Kalimah !== null && Hal_Yashthaghil(Miftah_Al_Kalimah)) ||
      (Miftah_Al_Ayah !== null && Hal_Yashthaghil(Miftah_Al_Ayah));

    const Hal_Nashit =
      !Nihayat_Al_Ayah &&
      !Hal_Alamah_Ayah &&
      Raqm_Al_Ayah_Actual === Al_Ayah_An_Nashitah &&
      Fahras_Al_Kalimah === Al_Kalimah_An_Nashitah;

    const { An_Naqr, Dukhul_Al_Mawroor, Khuruj_Al_Mawroor } = Binae_Mualijat_Al_Ahdath(Al_Kalimah);

    const Mualij_Naqr_Al_Kalimah = (Hadas: React.MouseEvent) => {
      Hadas.stopPropagation();
      if (Ikhfaa_Al_Ayaat && Al_Ayah && Raqm_Al_Ayah_Actual !== null && Raqm_Al_Ayah_Actual !== undefined && !Hal_Alamah_Ayah) {
        if (Hal_Iktimal_Al_Kalimah) {
          Al_Hifz.unmarkWordCompleted(Raqm_As_Surah, Raqm_Al_Ayah_Actual, Fahras_Al_Kalimah);
        } else {
          Al_Hifz.markWordCompleted(Raqm_As_Surah, Raqm_Al_Ayah_Actual, Fahras_Al_Kalimah);
        }
      }
      if (An_Naqr) An_Naqr();
    };

    let Fiat_Al_Unsur = Binae_Fiat_Al_Kalimah(
      Hal_Al_Ayah_Muzallalah,
      Hal_Alamah_Ayah,
      Nihayat_Al_Ayah,
      Hal_Nashit,
      Hal_Yashthaghil_Sawt
    );

    if (Hal_Huwa_Khatt_Uthmani_V4) {
      if (Hal_Nashit || Hal_Yashthaghil_Sawt) {
        Fiat_Al_Unsur += " uthmani-glyph-highlighted";
      }
    }

    const Marji_Al_Unsur = (El: HTMLSpanElement | null) => {
      if (El && Hal_Awwal_As_Satr && Raqm_Al_Ayah_Actual && Tartib === 0) {
        Maraji_Al_Ayaat.current.set(Raqm_Al_Ayah_Actual, El as unknown as HTMLDivElement);
      }
    };

    const Izhaar_Amud_At_Tarjamah = Izhaar_At_Tarjamah_Al_Mudmajah && !!Nass_Tarjamah_Al_Idmaj;
    const Izhaar_Amud_As_Sawtiyyah = Izhaar_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah && !!Nass_Sawtiyyah_Al_Idmaj;
    const Hal_Yujad_Idmaj = Izhaar_Amud_At_Tarjamah || Izhaar_Amud_As_Sawtiyyah;

    const Sifat_Bayanat: Record<string, string | number | undefined> = {
      "data-verse": Raqm_Al_Ayah_Actual,
      "data-word": Fahras_Al_Kalimah,
    };
    if (Hal_Alamah_Ayah) Sifat_Bayanat["data-is-verse-marker"] = "true";

    let Nass_Al_Ardh = Ar_Rasm;
    if (Hal_Huwa_Khatt_Indo_Pak && Hal_Alamah_Ayah && Raqm_Al_Ayah_Actual) {
      const Al_Badeel = Kharta_Alamaat_Al_Ayaat[Raqm_Al_Ayah_Actual - 1];
      if (Al_Badeel && Al_Badeel !== "") {
        Nass_Al_Ardh = Al_Badeel;
      }
    }

    return (
      <div
        key={Tartib}
        className={`relative flex flex-col items-center ${Fiat_Ash_Shafafiyyah} ${Fiat_Al_Intiqal} print:break-inside-avoid`}
        style={Hal_Ayy_Idmaj_Nashit ? { minWidth: "2rem" } : undefined}
        data-word={Fahras_Al_Kalimah}
        onMouseEnter={Dukhul_Al_Mawroor}
        onMouseLeave={Khuruj_Al_Mawroor}
      >
        <WordTooltip
          At_Tarjamah={Raw_Translation}
          Al_Kitabah_As_Sawtiyyah={Raw_Transliteration}
          Hal_Mufallat={Hal_Tarjamah_Al_Tamreer_Mufallat || Hal_Naqharah_Al_Tamreer_Mufallat}
        >
          <span
            ref={Marji_Al_Unsur}
            className={Fiat_Al_Unsur}
            style={{ cursor: "pointer" }}
            onClick={Mualij_Naqr_Al_Kalimah}
            {...Sifat_Bayanat}
          >
            {Nass_Al_Ardh}{" "}
          </span>
        </WordTooltip>

        {Hal_Yujad_Idmaj && (
          <div
            className="flex flex-col items-center gap-y-0.5 mt-1 w-full print:text-black"
            dir="ltr"
            style={NAMAT_KHATT_LATINI}
          >
            {Izhaar_Amud_At_Tarjamah && (
              <span
                className="text-black dark:text-white print:text-black text-center leading-tight block w-full"
                style={{ ...NAMAT_KHATT_LATINI, fontSize: `${Hajm_At_Tarjamah_Al_Mudmajah}px` }}
              >
                {Nass_Tarjamah_Al_Idmaj}
              </span>
            )}
            {Izhaar_Amud_As_Sawtiyyah && (
              <span
                className="text-gray-500 dark:text-gray-400 print:text-gray-700 text-center leading-tight block w-full"
                style={{ ...NAMAT_KHATT_LATINI, fontSize: `${Hajm_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah}px` }}
              >
                {Nass_Sawtiyyah_Al_Idmaj}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const Fiat_Mahadhat_Al_Muruna = Mawasat_As_Sutoor ? "justify-between" : "justify-center";
  const Marji_Al_Hawi = useRef<HTMLDivElement>(null);
  const [Wadh_Al_Kutlah, Dabt_Wadh_Al_Kutlah] = useState(false);
  const [Had_Al_Inqas, Dabt_Had_Al_Inqas] = useState<number | null>(null);

  useLayoutEffect(() => {
    const El = Marji_Al_Hawi.current;
    if (!El) return;
    const Fahs = () => {
      const Ardh = El.clientWidth;
      if (Wadh_Al_Kutlah) {
        if (Had_Al_Inqas !== null && Ardh >= Had_Al_Inqas) {
          Dabt_Wadh_Al_Kutlah(false);
          Dabt_Had_Al_Inqas(null);
        }
        return;
      }
      const Sutoor = El.querySelectorAll<HTMLElement>("[data-line-container]");
      let Hal_Faid = false;
      Sutoor.forEach((Satr) => {
        const Al_Unsur_Al_Awwal = Satr.firstElementChild as HTMLElement | null;
        if (!Al_Unsur_Al_Awwal) return;
        if (Satr.offsetHeight > Al_Unsur_Al_Awwal.offsetHeight * 1.4) Hal_Faid = true;
      });
      if (Hal_Faid) {
        Dabt_Had_Al_Inqas(Ardh + 60);
        Dabt_Wadh_Al_Kutlah(true);
      }
    };
    Fahs();
    const Muraqib_Al_Hajm = new ResizeObserver(Fahs);
    Muraqib_Al_Hajm.observe(El);
    return () => Muraqib_Al_Hajm.disconnect();
  }, [Wadh_Al_Kutlah, Had_Al_Inqas, Sutoor_Muhallalah]);

  const Al_Kalimaat_Al_Musattahah = useMemo(() => Sutoor_Muhallalah.flat(), [Sutoor_Muhallalah]);

  return (
    <div className="space-y-2 p-4 print:p-0 print:space-y-0">
      {Kalimaat_Al_Basmalah.length > 0 && (
        <Bismillah
          words={Kalimaat_Al_Basmalah}
          fontClass={Fiat_Khatt_Al_Basmalah}
          fontSize={Hajm_Khatt_Al_Basmalah}
          fontFamily={Ailat_Khatt_Al_Basmalah}
          wordSpacing={Tabaud_Al_Kalimaat}
          showInlineTranslation={Izhaar_At_Tarjamah_Al_Mudmajah}
          showInlineTransliteration={Izhaar_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah}
          hoverTranslationEnabled={Hal_Tarjamah_Al_Tamreer_Mufallat}
          inlineTranslationSize={Hajm_At_Tarjamah_Al_Mudmajah}
          inlineTransliterationSize={Hajm_Al_Kitabah_As_Sawtiyyah_Al_Mudmajah}
        />
      )}

      <div
        ref={Marji_Al_Hawi}
        className={`${Fiat_Al_Khatt} print:text-black`}
        style={{
          fontSize: Hajm_Khatt_Ar_Rasm,
          lineHeight: 1.8,
          fontFamily: Ailat_Khatt_Al_Safhah_Maa_Al_Ihtiyat,
        }}
        dir="rtl"
      >
        {Wadh_Al_Kutlah ? (
          <div
            className={`flex flex-wrap items-start ${Hal_Ayy_Idmaj_Nashit ? "gap-x-3" : ""}`}
            style={{ width: "100%" }}
            dir="rtl"
          >
            {Al_Kalimaat_Al_Musattahah.map((Kalimah, Tartib) => Ardh_Amud_Al_Kalimah(Kalimah, Tartib, false))}
          </div>
        ) : (
          Sutoor_Muhallalah.map((Satr, Tartib_As_Satr) => (
            <div
              key={Tartib_As_Satr}
              className={`flex ${Fiat_Mahadhat_Al_Muruna} items-start flex-wrap ${Hal_Ayy_Idmaj_Nashit ? "gap-x-3 mb-6" : "mb-0"} print:break-inside-avoid`}
              style={{ width: "100%" }}
              dir="rtl"
              data-line-container
            >
              {Satr.map((Kalimah, Tartib_Al_Kalimah) => Ardh_Amud_Al_Kalimah(Kalimah, Tartib_Al_Kalimah, true))}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export const Bitaqah = memo(function Bitaqah({
  As_Safhah,
  Safhah_Khaam,
  Tartib_As_Safhah,
  Raqm_As_Surah,
  Sutoor_Muhallalah = [],
  Fiat_Al_Hawi,
  Izhaar_An_Nass_Al_Arabi = true,
  Izhaar_Al_Kitabah_As_Sawtiyyah,
  Izhaar_Al_Basmalah_Fi_Hadhihi_As_Safhah,
  Kalimaat_Al_Basmalah,
  Ailat_Khatt_Al_Safhah,
  Fiat_Al_Khatt,
  Hajm_Khatt_Ar_Rasm,
  Tabaud_Al_Kalimaat,
  Maraji_Al_Ayaat,
  Al_Ayah_Al_Mumayyazah,
  Tain_Al_Ayah_Al_Mumayyazah,
  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah,
  Tarjamah_Ind_Al_Tamreer,
  At_Tarjamah_Al_Mudmajah,
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah,
  Ikhfaa_Al_Ayaat,
  Ikhfaa_Alamaat_Al_Ayaat,
  Hal_Huwa_Khatt_Indo_Pak,
  Kharta_Alamaat_Al_Ayaat,
  Hal_Huwa_Khatt_Uthmani_V4,
  Thayl_As_Safhah,
  Tansiq_Al_Mushaf,
}: Sifat_Bitaqat_Al_Ayah) {
  const surahId = Number(Raqm_As_Surah || 1);

  return (
    <Container className={`w-full ${Fiat_Al_Hawi} print:bg-white print:text-black print:shadow-none print:border-none print:m-0 print:p-0 print:break-after-page`}>
      <div className="relative print:static">
        {Izhaar_An_Nass_Al_Arabi && Sutoor_Muhallalah.length > 0 && Maraji_Al_Ayaat && (
          <Sutoor_As_Safhah
            Sutoor_Muhallalah={Sutoor_Muhallalah}
            Fiat_Al_Khatt={Fiat_Al_Khatt || ""}
            Hajm_Khatt_Ar_Rasm={Hajm_Khatt_Ar_Rasm || "1.5rem"}
            Tabaud_Al_Kalimaat={Tabaud_Al_Kalimaat || "1.8px"}
            Raqm_As_Surah={surahId}
            Maraji_Al_Ayaat={Maraji_Al_Ayaat}
            Al_Ayah_Al_Mumayyazah={Al_Ayah_Al_Mumayyazah ?? null}
            Tain_Al_Ayah_Al_Mumayyazah={Tain_Al_Ayah_Al_Mumayyazah || (() => {})}
            Izhaar_Al_Kitabah_As_Sawtiyyah={Izhaar_Al_Kitabah_As_Sawtiyyah}
            Tarjamah_Ind_Al_Tamreer={Tarjamah_Ind_Al_Tamreer || false}
            At_Tarjamah_Al_Mudmajah={At_Tarjamah_Al_Mudmajah || "None"}
            Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={Al_Kitabah_As_Sawtiyyah_Al_Mudmajah || "None"}
            Ikhfaa_Al_Ayaat={Ikhfaa_Al_Ayaat}
            Ikhfaa_Alamaat_Al_Ayaat={Ikhfaa_Alamaat_Al_Ayaat}
            Kalimaat_Al_Basmalah={Izhaar_Al_Basmalah_Fi_Hadhihi_As_Safhah ? Kalimaat_Al_Basmalah : []}
            Ailat_Khatt_Al_Basmalah={Izhaar_Al_Basmalah_Fi_Hadhihi_As_Safhah ? Ailat_Khatt_Al_Safhah : undefined}
            Fiat_Khatt_Al_Basmalah={Fiat_Al_Khatt}
            Hajm_Khatt_Al_Basmalah={Hajm_Khatt_Ar_Rasm}
            Ailat_Khatt_Al_Safhah={Ailat_Khatt_Al_Safhah}
            Hal_Huwa_Khatt_Indo_Pak={Hal_Huwa_Khatt_Indo_Pak}
            Kharta_Alamaat_Al_Ayaat={Kharta_Alamaat_Al_Ayaat}
            Hal_Huwa_Khatt_Uthmani_V4={Hal_Huwa_Khatt_Uthmani_V4}
            Mawasat_As_Sutoor={false}
          />
        )}

        {!Izhaar_An_Nass_Al_Arabi && Izhaar_Al_Kitabah_As_Sawtiyyah && As_Safhah && (
          <div className="space-y-1 p-4 print:p-0">
            {As_Safhah.verses.map((Al_Ayah: any) => {
              const Raqm_Al_Ayah = Number(Al_Ayah["Al-Ayah"] ?? Al_Ayah.verseNumber ?? Al_Ayah.Ayah);
              const An_Nass_As_Sawti = Al_Ayah["Al-Arabiyyah"] || Al_Ayah.arabic;
              if (!An_Nass_As_Sawti) return null;
              return (
                <p
                  key={`translit-${Raqm_Al_Ayah}`}
                  className={`text-muted-foreground print:text-black leading-relaxed text-center transition-colors duration-200 ${
                    Al_Ayah_Al_Mumayyazah === Raqm_Al_Ayah ? "bg-primary/10 print:bg-transparent rounded px-1" : ""
                  }`}
                  style={{ fontSize: Hajm_Khatt_Al_Kitabah_As_Sawtiyyah }}
                  onMouseEnter={() => Tain_Al_Ayah_Al_Mumayyazah && Tain_Al_Ayah_Al_Mumayyazah(Raqm_Al_Ayah)}
                  onMouseLeave={() => Tain_Al_Ayah_Al_Mumayyazah && Tain_Al_Ayah_Al_Mumayyazah(null)}
                >
                  {An_Nass_As_Sawti}
                </p>
              );
            })}
          </div>
        )}
      </div>

      {Thayl_As_Safhah && (
        <div className="flex items-center justify-center pb-2 pt-1 print:pb-0 print:pt-2">
          {typeof Thayl_As_Safhah === "function" ? Thayl_As_Safhah(As_Safhah?.pageNumber) : Thayl_As_Safhah}
        </div>
      )}
    </Container>
  );
});