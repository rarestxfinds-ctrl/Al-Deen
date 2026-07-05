import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/Component/Layout/Index";
import { Card } from "@/Component/UI/Card";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function PillarsIndex() {
  // Use React Query to gracefully handle client-side caching and state sync
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(5)].map((_, idx) => (
            <Card key={idx} className="p-4 animate-pulse" hoverable={false}>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <div className="h-4 bg-muted rounded w-4"></div>
                <div className="h-5 bg-muted rounded w-24"></div>
                <div className="h-4 bg-muted rounded w-16 justify-self-end"></div>
              </div>
            </Card>
          ))}
        </div>
      </Layout>
    );
  }

  // Extract the structured pillars slice from your precompiled global corpus
  const pillarsList = corpus?.pillars || [];

  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {pillarsList.map((p: any, i: number) => (
          <Link key={p.id} to={`/Aid/Pillars/${p.id}`}>
            <Card className="p-4 group">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <p className="text-xs text-muted-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                  {i + 1}
                </p>
                <p className="font-semibold [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                  {p.name}
                </p>
                <p className="text-sm text-muted-foreground text-right [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                  {p.english}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}