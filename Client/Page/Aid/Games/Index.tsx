import { Layout } from "Client/Component/Layout/Index";
import { Card } from "Client/Component/UI/Card";
import { Link } from "react-router-dom";

export default function GamesIndex() {
  const items = [
    { to: "/Aid/Games/Guess-What", label: "Guess What / Who", desc: "Guess the Surah or Prophet" },
  ];
  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <h1 className="text-2xl font-bold px-2">Games</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(i => (
            <Link key={i.to} to={i.to}>
              <Card className="p-5">
                <div className="font-semibold">{i.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{i.desc}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}