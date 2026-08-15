import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Container } from "@Web/Component/UI/Container";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function Names() {
  // Leverage React Query to manage frontend caching and state transitions
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(9)].map((_, idx) => (
            <Container key={idx} className="!p-4 text-center animate-pulse">
              <div className="h-3 bg-muted rounded w-6 mx-auto mb-2"></div>
              <div className="h-7 bg-muted rounded w-20 mx-auto mb-2"></div>
              <div className="h-5 bg-muted rounded w-24 mx-auto mb-1"></div>
              <div className="h-3 bg-muted rounded w-32 mx-auto"></div>
            </Container>
          ))}
        </div>
      </Layout>
    );
  }

  // Extract the divine names slice from the centralized backend dataset
  // Supports 'divineNames' or 'names' depending on your specific JSON layout key
  const divineNames = corpus?.divineNames || corpus?.names || [];

  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {divineNames.map((n: any, i: number) => {
          const indexDisplay = n.index || (i + 1);
          return (
            <Container key={`${n.english}-${indexDisplay}`} className="!p-4 text-center">
              <p className="text-xs text-muted-foreground">{indexDisplay}</p>
              <p className="text-2xl font-arabic mt-1" dir="rtl">{n.arabic}</p>
              <p className="font-semibold mt-2">{n.english}</p>
              <p className="text-xs text-muted-foreground">{n.meaning}</p>
            </Container>
          );
        })}
      </div>
    </Layout>
  );
}