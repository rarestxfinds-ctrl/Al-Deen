import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/Component/Layout/Index";
import { Card } from "@/Component/UI/Card";
import { Button } from "@/Component/UI/Button";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function ArabicSubcategory() {
  const { vocabId, categoryId } = useParams<{ vocabId: string; categoryId: string }>();

  // Leverage React Query to pull from your global compiled client cache cleanly
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
          {[...Array(6)].map((_, idx) => (
            <Card key={idx} className="p-4 text-center animate-pulse" hoverable={false}>
              <div className="h-5 bg-muted rounded w-24 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-16 mx-auto"></div>
            </Card>
          ))}
        </div>
      </Layout>
    );
  }

  // Traverses the precompiled corpus layout safely on the frontend client-side
  let category: any = null;
  if (Array.isArray(corpus?.arabicVocabulary)) {
    const mainVocab = corpus.arabicVocabulary.find((v: any) => v.id === "Arabic");
    const subCategories = mainVocab?.subcategories || corpus.arabicVocabulary;
    
    category = subCategories.find((c: any) => c.id === categoryId);
  }

  if (!category || !Array.isArray(category.subcategories)) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-8">
          <p className="text-muted-foreground">Category not found</p>
          <Link to={`/Aid/Arabic/${vocabId}`}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
        {category.subcategories.map((s: any) => (
          <Link key={s.id} to={`/Aid/Arabic/${vocabId}/${category.id}/${s.id}`}>
            <Card className="p-4 text-center group">
              <div className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {s.name}
              </div>
              {s.arabicName && (
                <div className="font-arabic text-lg mt-1 text-muted-foreground" dir="rtl">
                  {s.arabicName}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}