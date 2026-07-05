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

export default function ArabicIndex() {
  // Use React Query to asynchronously manage and sync the frontend corpus cache state
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  const extra = [
    { to: "/Aid/Arabic/Alphabet", name: "Alphabet" },
    { to: "/Aid/Arabic/Tajweed", name: "Tajweed" },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
          {extra.map((e) => (
            <Card key={e.to} className="p-4 text-center animate-pulse" hoverable={false}>
              <div className="h-5 bg-muted rounded w-20 mx-auto"></div>
            </Card>
          ))}
          {[...Array(4)].map((_, idx) => (
            <Card key={idx} className="p-4 text-center animate-pulse" hoverable={false}>
              <div className="h-5 bg-muted rounded w-24 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-12 mx-auto"></div>
            </Card>
          ))}
        </div>
      </Layout>
    );
  }

  // Safely grab the precompiled vocabulary slice inside the compiled payload layout tree
  // accounting for either direct array indexing or embedded 'Arabic' structural segments
  let vocabularyList: any[] = [];
  if (Array.isArray(corpus?.arabicVocabulary)) {
    const mainVocab = corpus.arabicVocabulary.find((v: any) => v.id === "Arabic");
    vocabularyList = mainVocab?.subcategories || corpus.arabicVocabulary;
  }

  return (
    <Layout>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
        {extra.map((e) => (
          <Link key={e.to} to={e.to}>
            <Card className="p-4 text-center group">
              <div className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {e.name}
              </div>
            </Card>
          </Link>
        ))}
        {vocabularyList.map((v: any) => (
          <Link key={v.id} to={`/Aid/Arabic/${v.id}`}>
            <Card className="p-4 text-center group">
              <div className="font-semibold text-base [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                {v.name}
              </div>
              {v.arabicName && (
                <div className="font-arabic text-lg mt-1 text-muted-foreground" dir="rtl">
                  {v.arabicName}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}