import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Button } from "@Web/Component/UI/Button";
import TajweedDetail from "./Detail"; // adjust import path as needed

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function TajweedSubcategory() {
  const { categoryId, subcategoryId } = useParams<{ categoryId: string; subcategoryId: string }>();

  // Leverage React Query to fetch data asynchronously or fetch directly from the client cache layer
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-3">
          {[...Array(4)].map((_, idx) => (
            <Button key={idx} fullWidth disabled className="!p-5 animate-pulse opacity-50">
              Loading subcategories...
            </Button>
          ))}
        </div>
      </Layout>
    );
  }

  // Safely grab the precompiled category from your corpus structure layout tree
  const category = corpus?.tajweedCategories?.find(
    (cat: any) => cat.id?.toLowerCase() === categoryId?.toLowerCase()
  );

  // If the base category exists, check if this is an explicitly nested subfolder slice
  const subfolder = category?.subfolders?.find(
    (f: any) => f.id?.toLowerCase() === subcategoryId?.toLowerCase()
  );

  // Not a subfolder (flat leaf rule matching category/subcategory path pattern) — hand off to Detail layout
  if (!subfolder) {
    return <TajweedDetail />;
  }

  if (!category) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Category context not found</p>
        </div>
      </Layout>
    );
  }

  const subcategoriesList = subfolder.subcategories || [];

  return (
    <Layout>
      <div className="space-y-3">
        {subcategoriesList.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">No subcategories available in this folder</p>
        )}
        {subcategoriesList.map((sub: any) => (
          <Link key={sub.id} to={`/Aid/Arabic/Tajweed/${category.id}/${subfolder.id}/${sub.id}`} className="block">
            <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{sub.name}</h3>
              </div>
            </Button>
          </Link>
        ))}
      </div>
    </Layout>
  );
}