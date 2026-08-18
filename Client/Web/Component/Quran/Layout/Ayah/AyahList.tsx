// Client/Web/Component/Quran/Layout/Ayah/AyahList.tsx
import { useMemo } from "react";
import { VerseCard } from "./VerseCard";
import type { AyahListProps } from "../Types";

export function AyahList({
  Surah,
  Ayah,
  Kalimah,
  Translation,
  Transliteration,
  WBW_Translation,
  WBW_Transliteration,
  Footnote,
  Show_Arabic_Text,
  Show_Translation,
  Show_Transliteration,
  Translation_Font_Size,
  Transliteration_Font_Size,
  Hover_Translation,
  Inline_Translation,
  Inline_Transliteration,
  Target_Ayah,
  Ayah_Refs,
  On_Notes_Click,
  On_Share_Click,
  On_Tafsir_Click,
  On_Embed_Click,
  On_Render_Click,
  FlushFirstItemTop = true,
}: AyahListProps) {
  // Normalize Ayah array defensively
  const normalizedAyahs = useMemo(() => {
    if (!Ayah) return [];
    if (Array.isArray(Ayah)) return Ayah.flat();
    if (typeof Ayah === "object" && Array.isArray((Ayah as any).data)) {
      return (Ayah as any).data.flat();
    }
    return [];
  }, [Ayah]);

  // Build WBW Translation lookup map by "verse:word" key, where "word" is
  // the word's own position number (its "Kalimah" field), not its index in
  // whatever order the API happened to return it.
  const wbwTranslationMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(WBW_Translation) ? WBW_Translation.flat() : [];

    for (const item of list) {
      if (!item) continue;
      const ayah = item["Ayah"] ?? item.verse ?? item.verse_number;
      const word = item["Kalimah"] ?? item.word ?? item.word_number;
      const text = item["Text"] ?? item.translation ?? item.text;

      if (ayah !== undefined && word !== undefined && text !== undefined) {
        map.set(`${ayah}:${word}`, text);
      }
    }
    return map;
  }, [WBW_Translation]);

  // Build WBW Transliteration lookup map by "verse:word" key
  const wbwTransliterationMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(WBW_Transliteration) ? WBW_Transliteration.flat() : [];

    for (const item of list) {
      if (!item) continue;
      const ayah = item["Ayah"] ?? item.verse ?? item.verse_number;
      const word = item["Kalimah"] ?? item.word ?? item.word_number;
      const text = item["Text"] ?? item.transliteration ?? item.text;

      if (ayah !== undefined && word !== undefined && text !== undefined) {
        map.set(`${ayah}:${word}`, text);
      }
    }
    return map;
  }, [WBW_Transliteration]);

  // Map word-by-word base words by verse number
  const wordsByAyah = useMemo(() => {
    const map = new Map<number, any[]>();
    const wordsArray = Array.isArray(Kalimah) ? Kalimah.flat() : [];

    for (const word of wordsArray) {
      if (!word) continue;
      const ayahNum = Number(word["Ayah"] ?? word.verse ?? word.verse_number);
      if (isNaN(ayahNum)) continue;

      const existing = map.get(ayahNum);
      if (existing) existing.push(word);
      else map.set(ayahNum, [word]);
    }
    return map;
  }, [Kalimah]);

  // Map translation(s) list by verse number.
  const translationsByAyah = useMemo(() => {
    const map = new Map<number, any[]>();

    let translationArray: any[] = [];
    if (Array.isArray(Translation)) {
      translationArray = Translation.flat();
    } else if (Translation && typeof Translation === "object" && Array.isArray((Translation as any).data)) {
      translationArray = (Translation as any).data.flat();
    }

    for (const translation of translationArray) {
      if (!translation) continue;
      const ayahNum = Number(
        translation["Ayah"] ?? translation.Ayah ?? translation.verse ?? translation.verse_number
      );
      if (!isNaN(ayahNum)) {
        const text =
          translation["Translation"] ??
          translation.Text ??
          translation.text ??
          translation.translation ??
          "";
        const list = map.get(ayahNum) || [];
        list.push({
          id: translation["Translator"] ?? translation.id ?? translation.translation_id,
          name: translation["Translator"] ?? translation.author_name ?? translation.name,
          text,
          footnotes: translation["Footnote"] ?? translation.footnote,
        });
        map.set(ayahNum, list);
      }
    }
    return map;
  }, [Translation]);

  // Map verse-level transliteration list by verse number
  const transliterationsByAyah = useMemo(() => {
    const map = new Map<number, string>();
    const transliterationsArray = Array.isArray(Transliteration) ? Transliteration.flat() : [];

    for (const transliteration of transliterationsArray) {
      if (!transliteration) continue;
      const ayahNum = Number(
        transliteration["Ayah"] ??
          transliteration.Ayah ??
          transliteration.verse ??
          transliteration.verse_number
      );
      if (!isNaN(ayahNum) && !map.has(ayahNum)) {
        const text =
          transliteration["Transliteration"] ??
          transliteration.Text ??
          transliteration.text ??
          transliteration.transliteration ??
          "";
        map.set(ayahNum, text);
      }
    }
    return map;
  }, [Transliteration]);

  if (!normalizedAyahs || normalizedAyahs.length === 0) {
    return null;
  }

  const surahNumber = Number(Surah?.["Surah"] ?? (Surah as any)?.id ?? 1);

  return (
    <div
      className={
        FlushFirstItemTop
          ? "space-y-4 [&>*:first-child]:!rounded-tl-none [&>*:first-child]:!rounded-tr-none"
          : "space-y-4"
      }
    >
      {normalizedAyahs.map((Ayah, index) => {
        if (!Ayah) return null;

        const ayahNum = Number(
          Ayah["Ayah"] ??
            Ayah.Ayah ??
            Ayah.verse ??
            Ayah.verseNumber ??
            Ayah.verse_number ??
            index + 1
        );

        const uniqueKey = `ayah-${surahNumber}-${ayahNum}-${index}`;

        const rawWords = wordsByAyah.get(ayahNum) || [];

        // Sort by each word's own position number so rendering order can't
        // drift from the WBW lookup order if the API ever returns words
        // out of sequence.
        const sortedWords = [...rawWords].sort((a, b) => {
          const aNum = Number(a["Kalimah"] ?? a.word ?? a.word_number ?? 0);
          const bNum = Number(b["Kalimah"] ?? b.word ?? b.word_number ?? 0);
          return aNum - bNum;
        });

        // Map and resolve WBW translation/transliteration per word node,
        // keyed by the word's own position number (falling back to array
        // position only if the row has no explicit number at all).
        const wordsForAyah = sortedWords.map((word, idx) => {
          const wordNumber = word["Kalimah"] ?? word.word ?? word.word_number ?? idx + 1;
          const wbwKey = `${ayahNum}:${wordNumber}`;

          return {
            ...word,
            translation:
              word.translation ??
              word.wbwTranslation ??
              word.Translation ??
              wbwTranslationMap.get(wbwKey),
            transliteration:
              word.transliteration ??
              word.wbwTransliteration ??
              word.Transliteration ??
              wbwTransliterationMap.get(wbwKey),
          };
        });

        const translationsForAyah = translationsByAyah.get(ayahNum) || [];
        const ayahTranslationText = translationsForAyah.length > 0 ? translationsForAyah[0].text : null;
        const ayahTransliterationText = transliterationsByAyah.get(ayahNum) || null;

        const arabicText = Ayah["Arabic"] ?? Ayah.Arabic ?? Ayah.text ?? "";

        return (
          <VerseCard
            key={uniqueKey}
            Ayah={Ayah}
            Kalimah={wordsForAyah}
            Translation={ayahTranslationText}
            Translations={translationsForAyah}
            Transliteration={ayahTransliterationText}
            Footnote={Footnote}
            Surah={Surah}
            Show_Arabic_Text={Show_Arabic_Text}
            Show_Translation={Show_Translation}
            Translation_Font_Size={Translation_Font_Size}
            Transliteration_Font_Size={Transliteration_Font_Size}
            Show_Transliteration={!!Show_Transliteration}
            Hover_Translation={Hover_Translation}
            Inline_Translation={Inline_Translation}
            Inline_Transliteration={Inline_Transliteration}
            Is_Highlighted={!!Target_Ayah && parseInt(String(Target_Ayah), 10) === ayahNum}
            Ayah_Ref={(element) => {
              if (element && Ayah_Refs?.current) {
                Ayah_Refs.current.set(ayahNum, element);
              }
            }}
            On_Notes_Click={() => On_Notes_Click?.(ayahNum, arabicText)}
            On_Share_Click={() => On_Share_Click?.(ayahNum, arabicText, ayahTranslationText ?? undefined)}
            On_Tafsir_Click={() => On_Tafsir_Click?.(ayahNum)}
            On_Embed_Click={On_Embed_Click ? () => On_Embed_Click(ayahNum) : undefined}
            On_Render_Click={On_Render_Click ? () => On_Render_Click(ayahNum) : undefined}
          />
        );
      })}
    </div>
  );
}