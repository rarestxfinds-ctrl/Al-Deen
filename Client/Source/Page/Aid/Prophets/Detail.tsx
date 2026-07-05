import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function ProphetDetail() {
  const { name = "" } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);

  // Use React Query to pull from your global compiled client cache cleanly
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <Container className="!p-8 text-center">
          <p className="text-muted-foreground animate-pulse">Loading prophet details...</p>
        </Container>
      </Layout>
    );
  }

  // Find the matching profile inside the precompiled prophets list array slice
  const prophet = corpus?.prophets?.find(
    (p: any) => p.title.toLowerCase() === decodedName.toLowerCase() || p.id?.toLowerCase() === decodedName.toLowerCase()
  );

  if (!prophet) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <Container className="max-w-md mx-auto !p-8">
            <h1 className="text-2xl font-semibold mb-4">Prophet Not Found</h1>
            <Link to="/Aid/Prophets">
              <Button>Back to 25 Prophets</Button>
            </Link>
          </Container>
        </div>
      </Layout>
    );
  }

  const sections = prophet.sections || [];

  return (
    <Layout>
      <div className="space-y-4">
        {sections.length > 0 ? (
          <>
            <Container className="!p-5">
              <h1 className="text-2xl font-bold">{prophet.title}</h1>
            </Container>
            
            {sections.map((s: { heading: string; body: string }) => (
              <Container key={s.heading} className="!p-5">
                <p className="font-semibold">{s.heading}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.body}</p>
              </Container>
            ))}
          </>
        ) : (
          <Container className="!p-6 text-center">
            <h1 className="text-xl font-bold">{prophet.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">Detailed content coming soon.</p>
          </Container>
        )}
      </div>
    </Layout>
  );
}