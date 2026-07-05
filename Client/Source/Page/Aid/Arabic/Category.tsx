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

export default function ArabicCategory() {
  const { vocabId } = useParams<{ vocabId: string }>();

  // Fetch or retrieve data seamlessly from your client-side React Query cache
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
          {[...Array(4)].map((_, idx) => (
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
  let vocab: any = null;
  if (Array.isArray(corpus?.arabicVocabulary)) {
    // Check if vocabulary matches the direct root array or is nested under an 'Arabic' ID wrapper
    vocab = corpus.arabicVocabulary.find((v: any) => v.id === (vocabId || ""));
    if (!vocab && vocabId === "Arabic") {
      vocab = { id: "Arabic", subcategories: corpus.arabicVocabulary };
    }
  }

  if (!vocab || !Array.isArray(vocab.subcategories)) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-8">
          <p className="text-muted-foreground">Vocabulary configuration not found</p>
          <Link to="/Aid/Arabic">
            <Button variant="outline">Back to Arabic</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
        {vocab.subcategories.map((c: any) => (
          <Link key={c.id} to={`/Aid/Arabic/${vocab.id}/${c.id}`}>
            <Card className="p-4 text-center group">
              <div className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {c.name}
              </div>
              {c.arabicName && (
                <div className="font-arabic text-lg mt-1 text-muted-foreground" dir="rtl">
                  {c.arabicName}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}