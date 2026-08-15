import { GuessGame, BoardItem } from "./Game";

const modules = import.meta.glob("/Server/Data/Aid/Prophets/*.json", { eager: true }) as Record<string, { default: unknown }>;

const prophets: BoardItem[] = Object.entries(modules).map(([path, mod]) => {
  const data = (mod as { default: unknown }).default ?? mod;
  const rawName: string = Array.isArray(data) && typeof data[0] === "string"
    ? (data[0] as string)
    : (path.split("/").pop() ?? "").replace(".json", "");
  const name = rawName.replace(/\s*\([^)]*\)\s*/g, "").trim();
  
  const rawFacts: string[] = [];
  if (Array.isArray(data) && Array.isArray(data[1])) {
    for (const sec of data[1] as unknown[]) {
      if (Array.isArray(sec) && sec.length > 1 && typeof sec[1] === "string") {
        rawFacts.push(sec[1].trim());
      }
    }
  }

  return {
    id: `prophet-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    rawFacts
  };
});

export default function GuessProphetIndex() {
  return <GuessGame deckItems={prophets} gameType="Prophet" />;
}