import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Button } from "@Web/Component/UI/Button";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function TajweedCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();

  // Use React Query to securely fetch and manage client cache states
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
              Loading rules...
            </Button>
          ))}
        </div>
      </Layout>
    );
  }

  // Safely find the exact category within the precompiled Tajweed categories array slice
  const category = corpus?.tajweedCategories?.find(
    (cat: any) => cat.id?.toLowerCase() === categoryId?.toLowerCase()
  );

  if (!category) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Category not found</p>
          <Link to="/Aid/Arabic/Tajweed">
            <Button variant="outline" className="font-bold">
              Back to Tajweed
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Standardize property naming checks based on common variations in compiled structures
  const subfoldersList = category.subfolders || [];
  const subcategoriesList = category.subcategories || [];
  const hasSubfolders = category.hasSubfolders ?? subfoldersList.length > 0;

  return (
    <Layout>
      {hasSubfolders === true ? (
        <div className="space-y-3">
          {subfoldersList.length === 0 && (
            <p className="text-muted-foreground text-sm">⚠ hasSubfolders is true but subfolders array is empty</p>
          )}
          {subfoldersList.map((folder: any) => (
            <Link key={folder.id} to={`/Aid/Arabic/Tajweed/${category.id}/${folder.id}`} className="block">
              <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
                <h3 className="font-semibold">{folder.name}</h3>
              </Button>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {subcategoriesList.length === 0 && (
            <p className="text-muted-foreground text-sm">⚠ hasSubfolders is false but subcategories array is empty</p>
          )}
          {subcategoriesList.map((sub: any) => (
            <Link key={sub.id} to={`/Aid/Arabic/Tajweed/${category.id}/${sub.id}`} className="block">
              <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1 flex-wrap">
                    <span className="font-semibold whitespace-nowrap">{sub.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap">–</span>
                    <span className="text-sm text-muted-foreground whitespace-normal break-words">
                      {sub.description}
                    </span>
                  </div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}