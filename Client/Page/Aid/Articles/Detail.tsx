import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "Client/Component/Layout/Index";
import { Card } from "Client/Component/UI/Card";
import { Button } from "Client/Component/UI/Button";

// Worker function targeting your forwarder address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://automatic-space-doodle-7vgjvxj75g5x2x74v-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function ArticleDetail() {
  const { id = "" } = useParams<{ id: string }>();

  // Use React Query to manage your cache cleanly across pages
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <Card className="p-8 text-center" hoverable={false}>
          <p className="text-muted-foreground animate-pulse">Loading article...</p>
        </Card>
      </Layout>
    );
  }

  // Find the exact article by searching the articles slice inside the precompiled corpus payload
  const article = corpus?.articles?.find(
    (a: any) => a.id.toLowerCase() === id.toLowerCase()
  );

  if (!article) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <Card className="max-w-md mx-auto p-8" hoverable={false}>
            <h1 className="text-2xl font-semibold mb-4">Article Not Found</h1>
            <Link to="/Aid/Articles">
              <Button>Back to Articles</Button>
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
          <h1 className="text-2xl font-bold">{article.name}</h1>
          {article.source && (
            <p className="text-xs text-muted-foreground mt-1">
              Source: {article.source}
            </p>
          )}
        </Card>

        {/* Dynamically maps out data subsections if present in your corpus compiled format */}
        {article.sections?.map((s: { heading: string; body: string }) => (
          <Card key={s.heading} className="p-5" hoverable={false}>
            <p className="font-semibold">{s.heading}</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {s.body}
            </p>
          </Card>
        ))}
      </div>
    </Layout>
  );
}