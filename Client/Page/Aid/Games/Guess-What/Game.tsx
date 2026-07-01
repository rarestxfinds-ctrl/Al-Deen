import { useState, useEffect } from "react";
import { Layout } from "Client/Component/Layout/Index";
import { Container } from "Client/Component/UI/Container";
import { Button } from "Client/Component/UI/Button";
import { Card } from "Client/Component/UI/Card";
import { User, Bot, Users, Send, RefreshCw, Swords } from "lucide-react";

export interface BoardItem {
  id: string;
  name: string;
  rawFacts: string[];
}

interface GameProps {
  deckItems: BoardItem[];
  gameType: "Prophet" | "Surah";
}

type GameMode = "FRIEND" | "BOT" | "PLAYER";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Stage = "CHOOSE_MODE" | "CHOOSE_DIFFICULTY" | "P1_CHOOSE" | "PASS_TO_P2" | "P2_CHOOSE" | "PLAYING" | "GAME_OVER";

export function GuessGame({ deckItems, gameType }: GameProps) {
  const [stage, setStage] = useState<Stage>("CHOOSE_MODE");
  const [mode, setMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  
  // Identities
  const [p1Secret, setP1Secret] = useState<BoardItem | null>(null);
  const [p2Secret, setP2Secret] = useState<BoardItem | null>(null);
  
  // Friends Pass & Play state tracking
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [p1Flipped, setP1Flipped] = useState<Record<string, boolean>>({});
  const [p2Flipped, setP2Flipped] = useState<Record<string, boolean>>({});
  const [isAccuseMode, setIsAccuseMode] = useState(false);

  // Bot states
  const [questionInput, setQuestionInput] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [botRemainingCount, setBotRemainingCount] = useState(deckItems.length);
  const [winnerMessage, setWinnerMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const handleModeSelect = (m: GameMode) => {
    setMode(m);
    if (m === "BOT") {
      setStage("CHOOSE_DIFFICULTY");
    } else {
      setStage("P1_CHOOSE");
    }
  };

  const handleDifficultySelect = (d: Difficulty) => {
    setDifficulty(d);
    setStage("P1_CHOOSE");
  };

  const handleIdentitySelect = (item: BoardItem) => {
    if (mode === "BOT") {
      setP1Secret(item);
      const randomOpponent = deckItems[Math.floor(Math.random() * deckItems.length)];
      setP2Secret(randomOpponent);
      setP1Flipped({});
      setBotRemainingCount(deckItems.length);
      setLogs([`Game started against Bot (${difficulty}). Ask a question below.`]);
      setStage("PLAYING");
    } else {
      if (stage === "P1_CHOOSE") {
        setP1Secret(item);
        setStage("PASS_TO_P2");
      } else if (stage === "P2_CHOOSE") {
        setP2Secret(item);
        setP1Flipped({});
        setP2Flipped({});
        setActivePlayer(1);
        setStage("PLAYING");
      }
    }
  };

  const processBotQuestion = async (text: string) => {
    if (!text.trim() || !p2Secret) return;
    setQuestionInput("");
    setIsThinking(true);
    
    setLogs(prev => [...prev, `You: "${text}"`]);

    let answer: "YES" | "NO" | "MAYBE" = "NO";
    const cleanQuery = text.toLowerCase();

    try {
      if (typeof window !== "undefined" && (window as any).ai?.assistant) {
        const session = await (window as any).ai.assistant.create();
        const contextPrompt = `You are playing Guess Who. The secret target is "${p2Secret.name}". Context facts: ${p2Secret.rawFacts.join(" | ")}. Answer using ONLY one word: YES, NO, or MAYBE. Question: "${text}"`;
        const aiResponse = await session.prompt(contextPrompt);
        const parsed = aiResponse.toUpperCase().trim();
        if (parsed.includes("YES")) answer = "YES";
        else if (parsed.includes("MAYBE")) answer = "MAYBE";
      } else {
        const contextBlob = `${p2Secret.name} ${p2Secret.rawFacts.join(" ")}`.toLowerCase();
        const tokens = cleanQuery.replace(/[?.!]/g, "").split(" ").filter(t => t.length > 3);
        const matchCount = tokens.filter(token => contextBlob.includes(token)).length;
        if (matchCount >= Math.min(2, tokens.length) && tokens.length > 0) {
          answer = "YES";
        }
      }
    } catch (e) {
      console.error("AI engine error:", e);
    }

    setIsThinking(false);
    setLogs(prev => [...prev, `Bot: ${answer}`]);

    setTimeout(() => {
      setBotRemainingCount(curr => {
        const rates = { EASY: 4.5, MEDIUM: 3.2, HARD: 2.2 };
        const reduced = Math.max(1, curr - Math.floor(Math.random() * (curr / rates[difficulty]) + 1));
        setLogs(prev => [...prev, `🤖 Bot filtered its board down to ${reduced} cards.`]);
        
        const winChance = difficulty === "HARD" ? 0.55 : difficulty === "MEDIUM" ? 0.35 : 0.15;
        if (reduced === 1 && Math.random() < winChance) {
          handleEndGame(false, `The Bot guessed your identity card: ${p1Secret?.name}!`);
        }
        return reduced;
      });
    }, 1000);
  };

  const handleCardClick = (item: BoardItem) => {
    if (isAccuseMode) {
      if (mode === "BOT") {
        if (item.id === p2Secret?.id) {
          handleEndGame(true, `Correct! The target was ${p2Secret.name}!`);
        } else {
          setLogs(prev => [...prev, `❌ Wrong Accusation: ${item.name}`]);
          setP1Flipped(prev => ({ ...prev, [item.id]: true }));
          setIsAccuseMode(false);
        }
      } else {
        // Friend mode accusations
        const targetSecret = activePlayer === 1 ? p2Secret : p1Secret;
        if (item.id === targetSecret?.id) {
          handleEndGame(true, `Player ${activePlayer} wins! The identity was ${targetSecret.name}!`);
        } else {
          alert(`Wrong accusation! Player ${activePlayer === 1 ? 1 : 2} turns the card down as penalty.`);
          if (activePlayer === 1) {
            setP1Flipped(prev => ({ ...prev, [item.id]: true }));
          } else {
            setP2Flipped(prev => ({ ...prev, [item.id]: true }));
          }
          setIsAccuseMode(false);
        }
      }
    } else {
      // Regular Flipping behavior
      if (mode === "BOT") {
        setP1Flipped(prev => ({ ...prev, [item.id]: !prev[item.id] }));
      } else {
        if (activePlayer === 1) {
          setP1Flipped(prev => ({ ...prev, [item.id]: !prev[item.id] }));
        } else {
          setP2Flipped(prev => ({ ...prev, [item.id]: !prev[item.id] }));
        }
      }
    }
  };

  const handleEndGame = (userWon: boolean, msg: string) => {
    setWinnerMessage(userWon ? msg : `🤖 Defeat. ${msg}`);
    setStage("GAME_OVER");
  };

  const resetPipeline = () => {
    setMode(null);
    setP1Secret(null);
    setP2Secret(null);
    setP1Flipped({});
    setP2Flipped({});
    setStage("CHOOSE_MODE");
  };

  // --- STAGE ROUTER RENDERERS ---

  if (stage === "CHOOSE_MODE") {
    return (
      <Layout>
        <div className="max-w-md mx-auto w-full pt-12 space-y-6">
          <div className="grid gap-3">
            <Button onClick={() => handleModeSelect("BOT")} className="h-16 text-lg justify-start gap-4 px-6" variant="primary">
              <Bot className="h-6 w-6" /> Play against Bot
            </Button>
            <Button onClick={() => handleModeSelect("FRIEND")} className="h-16 text-lg justify-start gap-4 px-6" variant="secondary">
              <User className="h-6 w-6" /> Pass & Play (Friend)
            </Button>
            <Button className="h-16 text-lg justify-start gap-4 px-6" variant="secondary" disabled>
              <Users className="h-6 w-6" /> Online Multiplayer (Soon)
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (stage === "CHOOSE_DIFFICULTY") {
    return (
      <Layout>
        <div className="max-w-md mx-auto w-full pt-12 space-y-6">
          <h2 className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <Swords className="h-6 w-6 text-primary" /> Select Bot Difficulty
          </h2>
          <div className="grid gap-3">
            <Button onClick={() => handleDifficultySelect("EASY")} className="h-14 text-base border border-green-500/30 hover:bg-green-500/10">
              Easy
            </Button>
            <Button onClick={() => handleDifficultySelect("MEDIUM")} className="h-14 text-base border border-amber-500/30 hover:bg-amber-500/10" variant="primary">
              Medium
            </Button>
            <Button onClick={() => handleDifficultySelect("HARD")} className="h-14 text-base border border-red-500/30 hover:bg-red-500/10">
              Hard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (stage === "P1_CHOOSE") {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto w-full px-4 space-y-6">
          <h2 className="text-xl font-bold text-center">
            {mode === "FRIEND" ? "Player 1: Choose your secret card" : `Select your secret ${gameType} identity`}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {deckItems.map(p => (
              <Card key={p.id} onClick={() => handleIdentitySelect(p)} className="h-24 flex items-center justify-center p-3 cursor-pointer hover:border-primary transition-all text-center font-bold">
                {p.name}
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (stage === "PASS_TO_P2") {
    return (
      <Layout>
        <div className="max-w-md mx-auto w-full pt-32 text-center space-y-4">
          <h2 className="text-xl font-bold">Pass phone to Player 2</h2>
          <Button onClick={() => setStage("P2_CHOOSE")} variant="primary" className="w-full h-14 text-lg">
            I am Player 2
          </Button>
        </div>
      </Layout>
    );
  }

  if (stage === "P2_CHOOSE") {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto w-full px-4 space-y-6">
          <h2 className="text-xl font-bold text-center">Player 2: Choose your secret card</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {deckItems.map(p => (
              <Card key={p.id} onClick={() => handleIdentitySelect(p)} className="h-24 flex items-center justify-center p-3 cursor-pointer hover:border-primary transition-all text-center font-bold">
                {p.name}
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (stage === "GAME_OVER") {
    return (
      <Layout>
        <div className="max-w-xl mx-auto w-full pt-12 text-center">
          <Container className="p-8 space-y-6 shadow-xl border">
            <h1 className="text-2xl font-black">{winnerMessage}</h1>
            <div className="grid grid-cols-2 gap-4 bg-accent/20 p-4 rounded-xl text-sm font-medium">
              <div>P1 Choice: <p className="text-lg font-bold text-primary">{p1Secret?.name}</p></div>
              <div>P2/Bot Choice: <p className="text-lg font-bold text-destructive">{p2Secret?.name}</p></div>
            </div>
            <Button onClick={resetPipeline} className="w-full" variant="primary">
              <RefreshCw className="mr-2 h-4 w-4" /> Rematch
            </Button>
          </Container>
        </div>
      </Layout>
    );
  }

  const currentFlippedMap = mode === "BOT" ? p1Flipped : (activePlayer === 1 ? p1Flipped : p2Flipped);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full px-2 space-y-6">
        
        {/* Friend Layout Context Actions */}
        {mode === "FRIEND" && (
          <div className="flex justify-between items-center bg-accent/40 rounded-xl p-4 border">
            <div className="text-sm font-bold">
              Current Turn: <span className="text-primary text-base">Player {activePlayer}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsAccuseMode(!isAccuseMode)} 
                variant={isAccuseMode ? "primary" : "secondary"}
                className="text-xs h-9"
              >
                {isAccuseMode ? "Flipping Cards Mode" : "Accuse Match!"}
              </Button>
              <Button 
                onClick={() => {
                  setIsAccuseMode(false);
                  setActivePlayer(activePlayer === 1 ? 2 : 1);
                }} 
                className="text-xs h-9"
              >
                Pass Turn
              </Button>
            </div>
          </div>
        )}

        {/* Bot Layout Inputs Area */}
        {mode === "BOT" && (
          <div className="space-y-4">
            <Container className="p-4 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && processBotQuestion(questionInput)}
                  placeholder="Ask a Yes/No question to the bot..."
                  className="flex-1 bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/80 transition-all"
                  disabled={isThinking}
                />
                <Button onClick={() => processBotQuestion(questionInput)} disabled={isThinking || !questionInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Container>

            <Container className="p-4 flex flex-col h-[120px]">
              <div className="flex-1 overflow-y-auto space-y-1.5 text-xs font-mono">
                {logs.map((log, index) => (
                  <div key={index} className="p-1.5 rounded bg-accent/30 border-l-2 border-primary">
                    {log}
                  </div>
                ))}
                {isThinking && <div className="text-muted-foreground italic animate-pulse">Evaluating layout context...</div>}
              </div>
            </Container>

            <div className="flex justify-end">
              <Button 
                onClick={() => setIsAccuseMode(!isAccuseMode)} 
                variant={isAccuseMode ? "primary" : "secondary"}
                className="text-xs h-9"
              >
                {isAccuseMode ? "Cancel Accusation" : "Accuse Card"}
              </Button>
            </div>
          </div>
        )}

        {/* Elimination Deck Grid */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {deckItems.map(item => {
              const isFlipped = currentFlippedMap[item.id];
              return (
                <div key={item.id} className="relative">
                  <Card 
                    onClick={() => handleCardClick(item)}
                    className={`h-24 flex flex-col justify-between p-3 select-none cursor-pointer transition-all duration-200 
                      ${isFlipped ? "opacity-10 bg-muted scale-95 border-dashed" : "hover:border-primary"}
                      ${isAccuseMode && !isFlipped ? "border-red-500 hover:bg-red-500/5 bg-red-500/5 animate-pulse" : ""}
                    `}
                  >
                    <div className="text-center my-auto font-bold text-sm tracking-tight">
                      {isFlipped ? "" : item.name}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </Layout>
  );
}