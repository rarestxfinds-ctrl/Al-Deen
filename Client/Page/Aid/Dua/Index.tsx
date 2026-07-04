import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "Client/Component/Layout/Index";
import { Button } from "Client/Component/UI/Button";

function getIdFromName(name: string): string {
  return name.replace(/\s+/g, "-");
}

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://automatic-space-doodle-7vgjvxj75g5x2x74v-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

const Dua = () => {
  // Gracefully pull and manage your corpus payload using React Query
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="w-full p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:px-0">
            {[...Array(14)].map((_, idx) => (
              <Button key={idx} disabled className="w-full h-full p-4 animate-pulse opacity-50">
                Loading...
              </Button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Safely extract the compiled duas collection slice from the global corpus data
  const categoriesList = corpus?.duas || corpus?.duaCategories || [];

  return (
    <Layout>
      <div className="w-full p-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:px-0">
          {categoriesList.map((category: any, index: number) => {
            const currentName = category.name || "";
            return (
              <Link key={index} to={`/Aid/Dua/${getIdFromName(currentName)}`} className="block">
                <Button className="w-full h-full p-4 text-center group">
                  <span className="font-semibold text-sm [.high-contrast_&]:group-hover:text-white [.high-contrast_&]:dark:group-hover:text-black">
                    {currentName}
                  </span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Dua;