import { Layout } from "Client/Component/Layout/Index";
import { Card } from "Client/Component/UI/Card";
import { Link } from "react-router-dom";

export default function GuessWhatIndex() {
  const modes = [
    { to: "/Aid/Games/Guess-What/Surah", label: "Guess the Surah", desc: "Match the English meaning to the Surah name." },
    { to: "/Aid/Games/Guess-What/Prophet", label: "Guess the Prophet", desc: "Identify the prophet from a clue." },
  ];
  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <h1 className="text-2xl font-bold px-2">Guess What / Who</h1>
        <p className="text-sm text-muted-foreground px-2">Play against a basic bot. Best of 5 rounds.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modes.map(m => (
            <Link key={m.to} to={m.to}>
              <Card className="p-5">
                <div className="font-semibold">{m.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{m.desc}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}