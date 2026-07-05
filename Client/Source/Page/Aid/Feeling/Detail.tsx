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

export default function FeelingDetail() {
  // Grabs the exact state value matching ":feeling" from your route setup
  const { feeling } = useParams<{ feeling: string }>(); 

  // Use React Query to manage layout synchronization asynchronously from the cache
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <Container key={idx} className="!p-5 animate-pulse">
              <div className="h-3 bg-muted rounded w-24 mb-3"></div>
              <div className="h-5 bg-muted rounded w-5/6 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </Container>
          ))}
        </div>
      </Layout>
    );
  }

  // Find the requested emotional configuration match by key/id inside the precompiled feelings slice
  const data = corpus?.feelings?.find(
    (f: any) => f.id?.toLowerCase() === feeling?.toLowerCase() || f.name?.toLowerCase() === feeling?.toLowerCase()
  );

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">Feeling details not found.</p>
          <Link to="/Aid/Feeling">
            <Button variant="outline">Back to Expressions</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {data.verse && (
          <Container className="!p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              From the Qur'an
            </p>
            <p className="text-base font-medium">“{data.verse}”</p>
            {data.verseRef && (
              <p className="text-xs text-muted-foreground mt-2">— {data.verseRef}</p>
            )}
          </Container>
        )}
        
        {data.hadith && (
          <Container className="!p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              From the Hadith
            </p>
            <p className="text-base font-medium">“{data.hadith}”</p>
            {data.hadithRef && (
              <p className="text-xs text-muted-foreground mt-2">— {data.hadithRef}</p>
            )}
          </Container>
        )}
        
        {data.note && (
          <Container className="!p-5">
            <p className="text-sm leading-relaxed">{data.note}</p>
          </Container>
        )}
      </div>
    </Layout>
  );
}