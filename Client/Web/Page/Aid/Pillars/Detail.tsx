import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function PillarDetail() {
  const { id = "" } = useParams<{ id: string }>();

  // Use React Query to manage the asset lifecycle smoothly
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <Card className="p-8 text-center" hoverable={false}>
          <p className="text-muted-foreground animate-pulse">Loading pillar details...</p>
        </Card>
      </Layout>
    );
  }

  // Find the requested pillar data inside the compiled pillars slice
  const pillar = corpus?.pillars?.find(
    (p: any) => p.id.toLowerCase() === id.toLowerCase()
  );

  if (!pillar) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <Card className="max-w-md mx-auto p-8" hoverable={false}>
            <h1 className="text-2xl font-semibold mb-4">Pillar Not Found</h1>
            <Link to="/Aid/Pillars">
              <Button>Back to Pillars</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <Card className="p-5" hoverable={false}>
          <h1 className="text-2xl font-bold">{pillar.name}</h1>
          {pillar.english && (
            <p className="text-sm text-muted-foreground mt-1">{pillar.english}</p>
          )}
        </Card>
        
        {pillar.sections?.map((s: { heading: string; body: string }) => (
          <Card key={s.heading} className="p-5" hoverable={false}>
            <p className="font-semibold">{s.heading}</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {s.body}
            </p>
          </Card>
        ))}

        {pillar.source && (
          <Card className="p-5" hoverable={false}>
            <p className="font-semibold">Source Context</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {pillar.source}
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}