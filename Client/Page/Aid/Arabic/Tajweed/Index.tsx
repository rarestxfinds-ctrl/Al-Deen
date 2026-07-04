import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "Client/Component/Layout/Index";
import { ChevronRight } from "lucide-react";
import { Container } from "Client/Component/UI/Container";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://automatic-space-doodle-7vgjvxj75g5x2x74v-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function TajweedIndex() {
  // Use React Query to handle async server retrieval and persistent client caching
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, idx) => (
            <Container key={idx} className="!p-5 flex items-center justify-between animate-pulse">
              <div className="h-5 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-4 shrink-0"></div>
            </Container>
          ))}
        </div>
      </Layout>
    );
  }

  // Safely grab the precompiled Tajweed rules slice out of your corpus layout tree
  const categories = corpus?.tajweedCategories || [];

  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map((cat: any) => (
          <Link key={cat.id} to={`/Aid/Arabic/Tajweed/${cat.id}`}>
            <Container className="!p-5 transition-all flex items-center justify-between group">
              <h2 className="font-semibold text-base group-hover:text-primary transition-colors">
                {cat.name}
              </h2>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Container>
          </Link>
        ))}
      </div>
    </Layout>
  );
}