import { GuessGame, BoardItem } from "./Game";
import surahNamesEnglish from "Server/Data/Quran/Meta/Names.json";
import surahTransliteration from "Server/Data/Quran/Meta/Surah/Transliteration.json";

const meanings = surahNamesEnglish as string[];
const names = surahTransliteration as string[];

const surahs: BoardItem[] = names.map((name, idx) => {
  const meaning = meanings[idx] || "";
  return {
    id: `surah-${idx}`,
    name,
    rawFacts: [
      meaning,
      `translated meaning is ${meaning}`,
      `index position is ${idx + 1}`
    ]
  };
});

export default function GuessSurahIndex() {
  return <GuessGame deckItems={surahs} gameType="Surah" />;
}