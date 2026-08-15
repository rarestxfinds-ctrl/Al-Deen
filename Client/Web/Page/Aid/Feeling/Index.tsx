import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Button } from "@Web/Component/UI/Button";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

export default function FeelingIndex() {
  const navigate = useNavigate();

  // Pull backend data asynchronously using the React Query client cache layer
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {[...Array(10)].map((_, idx) => (
              <Button key={idx} fullWidth disabled className="animate-pulse opacity-50">
                Loading...
              </Button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Extract the expressions list array slice from the global corpus payload
  const feelingsList = corpus?.feelings || [];

  return (
    <Layout>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {feelingsList.map((f: any) => {
            const feelingIdentifier = f.id || f.name;
            return (
              <Button 
                key={feelingIdentifier} 
                fullWidth
                onClick={() => navigate(`/Aid/Feeling/${feelingIdentifier}`)} 
              >
                {f.name || feelingIdentifier}
              </Button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}