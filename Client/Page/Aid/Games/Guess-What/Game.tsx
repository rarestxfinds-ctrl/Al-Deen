import { useState } from "react";
import { Layout } from "Client/Component/Layout/Index";
import { Container } from "Client/Component/UI/Container";
import { Button } from "Client/Component/UI/Button";
import { CheckCircle2, XCircle, Bot, User as UserIcon } from "lucide-react";

export interface Round {
  clue: string;
  options: string[];
  answerIndex: number;
}

interface Props {
  title: string;
  buildRound: () => Round;
  botAccuracy?: number;
}

const TOTAL_ROUNDS = 5;

export function GuessGame({ title, buildRound, botAccuracy = 0.5 }: Props) {
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState<Round>(() => buildRound());
  const [picked, setPicked] = useState<number | null>(null);
  const [botPick, setBotPick] = useState<number | null>(null);
  const [scoreYou, setScoreYou] = useState(0);
  const [scoreBot, setScoreBot] = useState(0);
  const [done, setDone] = useState(false);

  const next = () => {
    if (round + 1 >= TOTAL_ROUNDS) { setDone(true); return; }
    setRound(r => r + 1);
    setCurrent(buildRound());
    setPicked(null); setBotPick(null);
  };

  const submit = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = current.answerIndex;
    const others = current.options.map((_, idx) => idx).filter(idx => idx !== correct);
    const bot = Math.random() < botAccuracy ? correct : others[Math.floor(Math.random() * others.length)];
    setBotPick(bot);
    if (i === correct) setScoreYou(s => s + 1);
    if (bot === correct) setScoreBot(s => s + 1);
  };

  const restart = () => {
    setRound(0); setScoreYou(0); setScoreBot(0); setDone(false);
    setCurrent(buildRound()); setPicked(null); setBotPick(null);
  };

  if (done) {
    const result = scoreYou > scoreBot ? "You win!" : scoreYou < scoreBot ? "Bot wins." : "It's a draw.";
    return (
      <Layout>
        <div className="max-w-xl mx-auto w-full space-y-4">
          <h1 className="text-2xl font-bold px-2">{title}</h1>
          <Container className="!p-6 text-center space-y-3">
            <h2 className="text-xl font-semibold">{result}</h2>
            <p>You: <strong>{scoreYou}</strong> · Bot: <strong>{scoreBot}</strong></p>
            <Button onClick={restart} variant="primary">Play again</Button>
          </Container>
        </div>
      </Layout>
    );
  }

  const correct = current.answerIndex;

  return (
    <Layout>
      <div className="max-w-xl mx-auto w-full space-y-4">
        <div className="flex items-baseline justify-between px-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <span className="text-sm text-muted-foreground">Round {round + 1}/{TOTAL_ROUNDS}</span>
        </div>
        <div className="flex justify-around text-sm px-2">
          <span className="flex items-center gap-1"><UserIcon className="h-4 w-4" /> You: <strong>{scoreYou}</strong></span>
          <span className="flex items-center gap-1"><Bot className="h-4 w-4" /> Bot: <strong>{scoreBot}</strong></span>
        </div>

        <Container className="!p-6">
          <p className="text-sm text-muted-foreground mb-1">Clue</p>
          <p className="text-xl font-semibold mb-5">{current.clue}</p>
          <div className="grid gap-2">
            {current.options.map((opt, i) => {
              const isCorrect = picked !== null && i === correct;
              const isWrongPick = picked === i && i !== correct;
              return (
                <button
                  key={i}
                  onClick={() => submit(i)}
                  disabled={picked !== null}
                  className={`text-left rounded-[40px] border px-4 py-3 transition-colors
                    ${picked === null ? "border-border/40 hover:bg-accent" : "cursor-default"}
                    ${isCorrect ? "border-green-500/60 bg-green-500/10" : ""}
                    ${isWrongPick ? "border-red-500/60 bg-red-500/10" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{opt}</span>
                    <span className="flex items-center gap-2">
                      {botPick === i && <Bot className="h-4 w-4 text-muted-foreground" />}
                      {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {isWrongPick && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="mt-5 flex justify-end">
              <Button onClick={next} variant="primary">
                {round + 1 >= TOTAL_ROUNDS ? "See result" : "Next round"}
              </Button>
            </div>
          )}
        </Container>
      </div>
    </Layout>
  );
}