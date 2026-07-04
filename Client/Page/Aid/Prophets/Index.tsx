import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "Client/Component/Layout/Index";
import { Container } from "Client/Component/UI/Container";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://automatic-space-doodle-7vgjvxj75g5x2x74v-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function ProphetsIndex() {
  // Leverage React Query to load and cache the corpus data seamlessly on the frontend
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(12)].map((_, idx) => (
            <Container key={idx} className="!p-4 text-center animate-pulse">
              <div className="h-3 bg-muted rounded w-6 mx-auto mb-2"></div>
              <div className="h-5 bg-muted rounded w-20 mx-auto"></div>
            </Container>
          ))}
        </div>
      </Layout>
    );
  }

  // Extract the prophets slice from your unified backend database structure
  const prophetsList = corpus?.prophets || [];

  return (
    <Layout>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {prophetsList.map((p: any, i: number) => {
          // Fallback to title if id property isn't directly matching the layout structure
          const prophetIdentifier = p.id || p.title;
          
          return (
            <Link key={prophetIdentifier} to={`/Aid/Prophets/${encodeURIComponent(prophetIdentifier)}`}>
              <Container className="!p-4 text-center hover:bg-accent transition-colors">
                <p className="text-xs text-muted-foreground">{i + 1}</p>
                <p className="font-semibold mt-1">{p.title || prophetIdentifier}</p>
              </Container>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}