// Client/Web/Component/Quran/Takheet/Ayah/Qaimah.tsx
import { useMemo } from "react";
import { Bitaqah } from "./Bitaqah";
import type { Sifat_Qaimat_Al_Ayaat } from "../Anwaa";

export function Qaimat_Al_Ayaat({
  Surah,
  Ayaat,
  Kalimaat,
  Tarajim,
  Haashiyah,
  At_Tarjamaat_Kalimah = [],
  An_Naqharat_Kalimah = [],
  Izhaar_An_Nass_Al_Arabi,
  Tarjamat_Al_Ayah,
  Hajm_Khatt_At_Tarjamah,
  Hajm_Khatt_Al_Kitabah_As_Sawtiyyah,
  Mukhtar_Al_Kitabah_As_Sawtiyyah,
  Mukhtar_At_Tarjamah,
  Tarjamah_Ind_Al_Tamreer,
  At_Tarjamah_Al_Mudmajah,
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah,
  Al_Ayah_Al_Mustahdafah,
  Maraji_Al_Ayaat,
  An_Naqr_Ala_Al_Mulahazaat,
  An_Naqr_Ala_Al_Musharakah,
  An_Naqr_Ala_At_Tafseer,
  An_Naqr_Ala_At_Tadmeen,
  An_Naqr_Ala_Al_Muayanah,
  Qimmah_Musattahah_Lil_Unsur_Al_Awwal = true,
}: Sifat_Qaimat_Al_Ayaat & {
  At_Tarjamaat_Kalimah?: any[];
  An_Naqharat_Kalimah?: any[];
  Mukhtar_At_Tarjamah?: any;
  Tarjamah_Ind_Al_Tamreer?: any;
  At_Tarjamah_Al_Mudmajah?: any;
  Al_Kitabah_As_Sawtiyyah_Al_Mudmajah?: any;
}) {
  // Build WBW Translation lookup map by "verse:word" key
  const wbwTranslationMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(At_Tarjamaat_Kalimah) ? At_Tarjamaat_Kalimah : [];
    
    for (const item of list) {
      if (!item) continue;
      const ayah = item["Al-Ayah"] ?? item.verse ?? item.verse_number;
      const word = item["Al-Kalimah"] ?? item.word ?? item.word_number;
      const text = item["An-Nass"] ?? item["At-Tarjamah"] ?? item.translation ?? item.text;
      
      if (ayah !== undefined && word !== undefined && text !== undefined) {
        map.set(`${ayah}:${word}`, text);
      }
    }
    return map;
  }, [At_Tarjamaat_Kalimah]);

  // Build WBW Transliteration lookup map by "verse:word" key
  const wbwTransliterationMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(An_Naqharat_Kalimah) ? An_Naqharat_Kalimah : [];

    for (const item of list) {
      if (!item) continue;
      const ayah = item["Al-Ayah"] ?? item.verse ?? item.verse_number;
      const word = item["Al-Kalimah"] ?? item.word ?? item.word_number;
      const text = item["An-Nass"] ?? item["An-Naqharah"] ?? item.transliteration ?? item.text;

      if (ayah !== undefined && word !== undefined && text !== undefined) {
        map.set(`${ayah}:${word}`, text);
      }
    }
    return map;
  }, [An_Naqharat_Kalimah]);

  // Map word-by-word base words by verse number
  const Kalimaat_Hasab_Al_Ayah = useMemo(() => {
    const Kharitah = new Map<number, any[]>();
    const qaimat_al_kalimaat = Array.isArray(Kalimaat) ? Kalimaat : [];

    for (const Kalimah of qaimat_al_kalimaat) {
      if (!Kalimah) continue;
      const ayahNum = Number(Kalimah["Al-Ayah"] ?? Kalimah.Ayah ?? Kalimah.verse ?? Kalimah.verse_number);
      if (isNaN(ayahNum)) continue;

      const Waa = Kharitah.get(ayahNum);
      if (Waa) Waa.push(Kalimah);
      else Kharitah.set(ayahNum, [Kalimah]);
    }
    return Kharitah;
  }, [Kalimaat]);

  // Map translations list by verse number
  const Tarjamah_Hasab_Al_Ayah = useMemo(() => {
    const Kharitah = new Map<number, any[]>();

    let qaimat_at_tarajim: any[] = [];
    if (Array.isArray(Tarajim)) {
      qaimat_at_tarajim = Tarajim;
    } else if (Tarajim && typeof Tarajim === "object" && Array.isArray((Tarajim as any).data)) {
      qaimat_at_tarajim = (Tarajim as any).data;
    }

    for (const Tarjamah of qaimat_at_tarajim) {
      if (!Tarjamah) continue;
      const ayahNum = Number(Tarjamah["Al-Ayah"] ?? Tarjamah.Ayah ?? Tarjamah.verse ?? Tarjamah.verse_number);
      if (!isNaN(ayahNum)) {
        const text = Tarjamah["An-Nass"] ?? Tarjamah["At-Tarjamah"] ?? Tarjamah.Text ?? Tarjamah.text ?? Tarjamah.translation ?? "";
        const list = Kharitah.get(ayahNum) || [];
        list.push({
          id: Tarjamah["Al-Mutarjim"] ?? Tarjamah.id ?? Tarjamah.translation_id,
          name: Tarjamah["Ism_At_Tarjamah"] ?? Tarjamah.author_name ?? Tarjamah.name,
          text,
          haashiyah: Tarjamah["Haashiyah"] ?? Tarjamah.footnotes,
        });
        Kharitah.set(ayahNum, list);
      }
    }
    return Kharitah;
  }, [Tarajim]);

  if (!Ayaat || !Array.isArray(Ayaat)) {
    return null;
  }

  const Izhaar_Al_Kitabah_As_Sawtiyyah = Mukhtar_Al_Kitabah_As_Sawtiyyah !== "None" && Mukhtar_Al_Kitabah_As_Sawtiyyah !== false;
  const Raqm_As_Surah = Number(Surah?.["As-Surah"] ?? Surah?.id ?? Surah?.Surah ?? 1);

  return (
    <div
      className={
        Qimmah_Musattahah_Lil_Unsur_Al_Awwal
          ? "space-y-4 [&>*:first-child]:!rounded-tl-none [&>*:first-child]:!rounded-tr-none"
          : "space-y-4"
      }
    >
      {Ayaat.map((Al_Ayah, Tartib) => {
        const ayahNum = Number(Al_Ayah["Al-Ayah"] ?? Al_Ayah.Ayah ?? Al_Ayah.verseNumber ?? Tartib + 1);
        const Miftah_Farid = `ayah-${Raqm_As_Surah}-${ayahNum}`;
        
        const Raw_Kalimaat = Kalimaat_Hasab_Al_Ayah.get(ayahNum) || [];
        
        // Map and resolve WBW translation/transliteration per word node
        const Kalimaat_Al_Ayah = Raw_Kalimaat.map((k, idx) => {
          const wordNum = k["Al-Kalimah"] ?? k.word ?? k.word_number ?? (idx + 1);
          const wbwKey = `${ayahNum}:${wordNum}`;

          return {
            ...k,
            translation:
              k.translation ??
              k.wbwTranslation ??
              k.At_Tarjamah ??
              k["An-Nass"] ??
              wbwTranslationMap.get(wbwKey),
            transliteration:
              k.transliteration ??
              k.wbwTransliteration ??
              k.Al_Kitabah_As_Sawtiyyah ??
              k["An-Naqharah"] ??
              wbwTransliterationMap.get(wbwKey),
          };
        });

        const Tarajim_Al_Ayah = Tarjamah_Hasab_Al_Ayah.get(ayahNum) || [];
        const Nass_Tarjamat_Al_Ayah = Tarajim_Al_Ayah.length > 0
          ? Tarajim_Al_Ayah[0].text
          : (Al_Ayah["At-Tarjamah"] ?? Al_Ayah.text ?? null);

        const Nass_Al_Arabi = (Al_Ayah["Al-Arabiyyah"] ?? Al_Ayah.Arabic ?? Al_Ayah.text) || "";

        return (
          <Bitaqah
            key={Miftah_Farid}
            Al_Ayah={Al_Ayah}
            Kalimaat={Kalimaat_Al_Ayah}
            At_Tarjamah={Nass_Tarjamat_Al_Ayah}
            At_Tarajim={Tarajim_Al_Ayah}
            Haashiyah={Haashiyah}
            Surah={Surah}
            Izhaar_An_Nass_Al_Arabi={Izhaar_An_Nass_Al_Arabi}
            Tarjamat_Al_Ayah={Tarjamat_Al_Ayah}
            Hajm_Khatt_At_Tarjamah={Hajm_Khatt_At_Tarjamah}
            Hajm_Khatt_Al_Kitabah_As_Sawtiyyah={Hajm_Khatt_Al_Kitabah_As_Sawtiyyah}
            Izhaar_Al_Kitabah_As_Sawtiyyah={Izhaar_Al_Kitabah_As_Sawtiyyah}
            Tarjamah_Ind_Al_Tamreer={Tarjamah_Ind_Al_Tamreer}
            At_Tarjamah_Al_Mudmajah={At_Tarjamah_Al_Mudmajah}
            Al_Kitabah_As_Sawtiyyah_Al_Mudmajah={Al_Kitabah_As_Sawtiyyah_Al_Mudmajah}
            Hal_Huwa_Muayyaz={!!Al_Ayah_Al_Mustahdafah && parseInt(String(Al_Ayah_Al_Mustahdafah), 10) === ayahNum}
            Marji_Al_Ayah={(Unsur) => {
              if (Unsur && Maraji_Al_Ayaat?.current) {
                Maraji_Al_Ayaat.current.set(ayahNum, Unsur);
              }
            }}
            An_Naqr_Ala_Al_Mulahazaat={() => An_Naqr_Ala_Al_Mulahazaat?.(ayahNum, Nass_Al_Arabi)}
            An_Naqr_Ala_Al_Musharakah={() => An_Naqr_Ala_Al_Musharakah?.(ayahNum, Nass_Al_Arabi, Nass_Tarjamat_Al_Ayah ?? undefined)}
            An_Naqr_Ala_At_Tafseer={() => An_Naqr_Ala_At_Tafseer?.(ayahNum)}
            An_Naqr_Ala_At_Tadmeen={An_Naqr_Ala_At_Tadmeen ? () => An_Naqr_Ala_At_Tadmeen(ayahNum) : undefined}
            An_Naqr_Ala_Al_Muayanah={An_Naqr_Ala_Al_Muayanah ? () => An_Naqr_Ala_Al_Muayanah(ayahNum) : undefined}
          />
        );
      })}
    </div>
  );
}