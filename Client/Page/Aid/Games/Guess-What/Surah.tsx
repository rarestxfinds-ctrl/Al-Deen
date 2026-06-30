import surahNamesEnglish from "Server/Data/Quran/Meta/Names.json";
import surahTransliteration from "Server/Data/Quran/Meta/Surah/Transliteration.json";
import { GuessGame, Round } from "./Game";

const meanings = surahNamesEnglish as string[];
const names = surahTransliteration as string[];

function sample(total: number, n: number, exclude: number): number[] {
  const idxs: number[] = [];
  for (let i = 0; i < total; i++) if (i !== exclude) idxs.push(i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  return idxs.slice(0, n);
}

function buildRound(): Round {
  const total = Math.min(meanings.length, names.length);
  const answer = Math.floor(Math.random() * total);
  const wrongs = sample(total, 3, answer);
  const order = [...wrongs, answer]
    .map(i => ({ i, r: Math.random() }))
    .sort((a, b) => a.r - b.r);
  const answerIndex = order.findIndex(o => o.i === answer);
  return {
    clue: `"${meanings[answer]}"`,
    options: order.map(o => names[o.i]),
    answerIndex,
  };
}

export default function GuessSurah() {
  return <GuessGame title="Guess the Surah" buildRound={buildRound} botAccuracy={0.5} />;
}