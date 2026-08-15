// @Web/Page/Aid/Schools/Index.tsx
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";

type School = {
  id: string;
  name: string;
  founder: string;
  regions: string;
  description: string;
};

type Branch = {
  id: string;
  name: string;
  summary: string;
  schools: School[];
};

const BACKEND_BASE_URL = "https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev";

async function fetchAidCorpusFromBackend() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/aid-corpus`);
  if (!response.ok) throw new Error("Failed to fetch Aid corpus database");
  return response.json();
}

const Schools = () => {
  const navigate = useNavigate();

  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // 30-minute stale time
  });

  const branches: Branch[] = corpus?.branches ?? [];

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-4 p-8 text-center animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-muted rounded-2xl w-full" />
            <div className="h-32 bg-muted rounded-2xl w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((branch) => (
            <Card
              key={branch.id}
              className="p-5 cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground group"
              onClick={() => navigate(`/Aid/Schools/${branch.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-xl font-semibold">{branch.name}</h2>
                <span className="text-xs text-muted-foreground group-hover:text-accent-foreground shrink-0 mt-1">
                  {branch.schools.length} schools →
                </span>
              </div>
              <p className="text-sm text-muted-foreground group-hover:text-accent-foreground leading-relaxed">
                {branch.summary}
              </p>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          This is an introductory overview, not a fatwa. Refer to qualified scholars for detailed rulings.
        </p>
      </div>
    </Layout>
  );
};

export default Schools;