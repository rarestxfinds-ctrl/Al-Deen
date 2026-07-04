import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "Client/Component/Layout/Index";
import { Card } from "Client/Component/UI/Card";

// Fallback Hadith source citation context
const ARTICLES_HADITH_SOURCE = "Faith is that you believe in Allah, His Angels, His Books, His Messengers, the Last Day, and that you believe in Fate (Qadar), both its good and its bad. (Sahih Muslim)";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://automatic-space-doodle-7vgjvxj75g5x2x74v-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function ArticlesIndex() {
  // Leverage React Query cache syncing across pages seamlessly
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Card className="p-5" hoverable={false}>
            <p className="font-semibold">Hadith Source</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed animate-pulse">
              Loading source citation...
            </p>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, idx) => (
              <Card key={idx} className="p-4 animate-pulse" hoverable={false}>
                <div className="h-5 bg-muted rounded w-3/4"></div>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const articlesList = corpus?.articles || [];

  return (
    <Layout>
      <div className="space-y-4">
        <Card className="p-5" hoverable={false}>
          <p className="font-semibold">Hadith Source</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {ARTICLES_HADITH_SOURCE}
          </p>
        </Card>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {articlesList.map((a: any, i: number) => (
            <Link key={a.id} to={`/Aid/Articles/${a.id}`}>
              <Card className="p-4 group">
                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                  <p className="text-xs text-muted-foreground [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                    {i + 1}
                  </p>
                  <p className="font-semibold [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                    {a.name}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}