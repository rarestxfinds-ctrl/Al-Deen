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

export default function ArabicSubSubcategory() {
  const { vocabId, categoryId, subId } = useParams<{
    vocabId: string;
    categoryId: string;
    subId: string;
  }>();

  // Handle client-side caching and background state syncing asynchronously
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
          {[...Array(8)].map((_, idx) => (
            <Card key={idx} className="p-4 text-center animate-pulse" hoverable={false}>
              <div className="h-5 bg-muted rounded w-20 mx-auto mb-2"></div>
              <div className="h-3 bg-muted rounded w-16 mx-auto"></div>
            </Card>
          ))}
        </div>
      </Layout>
    );
  }

  // Traverses the precompiled corpus layout safely on the frontend client-side
  let sub: any = null;
  if (Array.isArray(corpus?.arabicVocabulary)) {
    const mainVocab = corpus.arabicVocabulary.find((v: any) => v.id === "Arabic");
    const subCategories = mainVocab?.subcategories || corpus.arabicVocabulary;

    const targetCategory = subCategories.find((c: any) => c.id === categoryId);
    if (targetCategory?.subcategories) {
      sub = targetCategory.subcategories.find((s: any) => s.id === subId);
    }
  }

  if (!sub || !Array.isArray(sub.words)) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-8">
          <p className="text-muted-foreground">Subcategory not found</p>
          <Link to={`/Aid/Arabic/${vocabId}/${categoryId}`}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
        {sub.words.map((w: any) => (
          <Link key={w.id} to={`/Aid/Arabic/${vocabId}/${categoryId}/${subId}/${w.id}`}>
            <Card className="p-4 text-center group">
              <div className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {w.english}
              </div>
              {w.transliteration && (
                <div className="text-xs mt-0.5 text-muted-foreground italic">
                  {w.transliteration}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}