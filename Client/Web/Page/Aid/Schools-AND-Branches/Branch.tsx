// @Web/Page/Aid/Schools/Branch.tsx
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Card } from "@Web/Component/UI/Card";
import { Button } from "@Web/Component/UI/Button";

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

const Branch = () => {
  const { branch: branchId } = useParams<{ branch: string }>();
  const navigate = useNavigate();

  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 30, // 30-minute stale time
  });

  const branches: Branch[] = corpus?.branches ?? [];
  const branch = branches.find((b) => b.id === branchId);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-4 p-8 text-center animate-pulse">
          <div className="h-8 bg-muted rounded-xl w-1/2 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-muted rounded-2xl w-full" />
            <div className="h-32 bg-muted rounded-2xl w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!branch) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-muted-foreground">Branch not found.</p>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate("/Aid/Schools")}>
            ← Back to Schools
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branch.schools.map((school) => (
            <Card
              key={school.id}
              className="p-4 cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground group"
              onClick={() => navigate(`/Aid/Schools/${branch.id}/${school.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-base">{school.name}</h3>
                <span className="text-xs text-muted-foreground group-hover:text-accent-foreground shrink-0 mt-0.5">
                  View →
                </span>
              </div>
              <dl className="text-sm space-y-1.5 mb-3">
                <div>
                  <dt className="inline font-medium text-muted-foreground group-hover:text-accent-foreground">Founder: </dt>
                  <dd className="inline">{school.founder}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-muted-foreground group-hover:text-accent-foreground">Regions: </dt>
                  <dd className="inline">{school.regions}</dd>
                </div>
              </dl>
              <p className="text-sm leading-relaxed line-clamp-3">{school.description}</p>
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

export default Branch;