import { GuessGame, Round } from "./Game";

const modules = import.meta.glob("/Server/Data/Aid/Prophets/*.json", { eager: true }) as Record<string, { default: unknown }>;

interface Prophet { name: string; firstFact: string; }

const prophets: Prophet[] = Object.entries(modules).map(([path, mod]) => {
  const data = (mod as { default: unknown }).default ?? mod;
  const rawName: string = Array.isArray(data) && typeof data[0] === "string"
    ? (data[0] as string)
    : (path.split("/").pop() ?? "").replace(".json", "");
  const name = rawName.replace(/\s*\([^)]*\)\s*/g, "").trim();
  let fact = "";
  if (Array.isArray(data) && Array.isArray(data[1])) {
    for (const sec of data[1] as unknown[]) {
      if (Array.isArray(sec) && sec.length > 1 && typeof sec[1] === "string" && (sec[1] as string).length > 30) {
        fact = sec[1] as string;
        break;
      }
    }
  }
  return { name, firstFact: fact || "A prophet of Islam." };
});

function shuffle<T>(a: T[]): T[] {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

function buildRound(): Round {
  const ai = Math.floor(Math.random() * prophets.length);
  const answer = prophets[ai];
  const distractors = shuffle(prophets.filter((_, i) => i !== ai)).slice(0, 3);
  const opts = shuffle([answer, ...distractors]);
  let clue = answer.firstFact.slice(0, 240);
  const re = new RegExp(answer.name, "gi");
  clue = clue.replace(re, "this prophet");
  return {
    clue,
    options: opts.map(p => p.name),
    answerIndex: opts.findIndex(p => p.name === answer.name),
  };
}

export default function GuessProphet() {
  return <GuessGame title="Guess the Prophet" buildRound={buildRound} botAccuracy={0.45} />;
}