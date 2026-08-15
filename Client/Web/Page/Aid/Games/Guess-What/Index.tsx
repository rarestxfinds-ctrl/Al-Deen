import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";
import { Link } from "react-router-dom";

export default function GuessWhatIndex() {
  const modes = [
    { to: "/Aid/Games/Guess-What/Surah", label: "Guess the Surah" },
    { to: "/Aid/Games/Guess-What/Prophet", label: "Guess the Prophet" },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modes.map(m => (
            <Link key={m.to} to={m.to}>
              <Card className="p-5">
                <div className="font-semibold">{m.label}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}