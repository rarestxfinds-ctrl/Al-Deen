import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "Client/Component/Layout/Index";
import { Button } from "Client/Component/UI/Button";
import { Container } from "Client/Component/UI/Container";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://automatic-space-doodle-7vgjvxj75g5x2x74v-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function TajweedDetail() {
  const { categoryId, subcategoryId, subSubId } = useParams<{
    categoryId: string;
    subcategoryId: string;
    subSubId?: string;
  }>();

  // Retrieve or sync data seamlessly using the client-side React Query cache layer
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  const backPath = subSubId
    ? `/Aid/Arabic/Tajweed/${categoryId}/${subcategoryId}`
    : `/Aid/Arabic/Tajweed/${categoryId}`;

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          {[...Array(3)].map((_, idx) => (
            <Container key={idx} className="!p-5 animate-pulse">
              <div className="flex justify-between items-center mb-3">
                <div className="h-4 bg-muted rounded w-32"></div>
                <div className="h-8 bg-muted rounded w-12"></div>
              </div>
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-16 bg-muted rounded w-full"></div>
            </Container>
          ))}
        </div>
      </Layout>
    );
  }

  // Traverse the precompiled Tajweed hierarchy tree safely on the client
  let subcategory: any = null;

  if (Array.isArray(corpus?.tajweedCategories)) {
    const category = corpus.tajweedCategories.find(
      (cat: any) => cat.id?.toLowerCase() === categoryId?.toLowerCase()
    );

    if (category) {
      if (subSubId) {
        // Deep nested search inside category subfolders structure
        const folder = category.subfolders?.find(
          (f: any) => f.id?.toLowerCase() === subcategoryId?.toLowerCase()
        );
        subcategory = folder?.subcategories?.find(
          (sub: any) => sub.id?.toLowerCase() === subSubId.toLowerCase()
        );
      } else {
        // Standard structural lookup directly under the primary category subcategories array
        subcategory = category.subcategories?.find(
          (sub: any) => sub.id?.toLowerCase() === subcategoryId?.toLowerCase()
        );
      }
    }
  }

  if (!subcategory || !Array.isArray(subcategory.rules)) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Rule detail configuration not found</p>
          <Link to={backPath}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 space-y-3">
        {subcategory.rules.map((rule: any, idx: number) => (
          <Container key={idx} className="!p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{rule.transliteration}</span>
                {rule.letter && (
                  <Container className="!py-1 !px-3 !w-auto">
                    <span className="font-arabic text-2xl" dir="rtl">{rule.letter}</span>
                  </Container>
                )}
              </div>
              <p className="text-sm text-foreground">{rule.description}</p>
              {rule.example && (
                <Container className="!p-3">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Example</p>
                    <p className="font-arabic text-2xl text-foreground" dir="rtl">{rule.example}</p>
                    {rule.exampleTranslation && (
                      <p className="text-sm text-muted-foreground italic">{rule.exampleTranslation}</p>
                    )}
                  </div>
                </Container>
              )}
            </div>
          </Container>
        ))}
      </div>
    </Layout>
  );
}