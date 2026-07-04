import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "Client/Component/Layout/Index";
import { Card } from "Client/Component/UI/Card";

// 🌟 Local frontend placeholder array for immediate rendering while loading
const fallbackCollections = [
  {
    id: "Sahih-Muslim",
    slug: "Sahih-Muslim",
    name: "Sahih Muslim",
    author: "Muslim",
    topFolder: "Sahih",
    authorFolder: "Muslim",
    hadithCount: 0, 
    description: "Sahih collection compiled by Muslim."
  }
];

// Fetch function pulling data directly from your updated Node backend
async function fetchCorpusFromBackend() {
  const response = await fetch("http://localhost:8081/api/hadith-corpus");
  if (!response.ok) throw new Error("Failed to load backend corpus data");
  return response.json();
}

const Collection = () => {
  // 🌟 Connects to the server endpoint instead of the client-side hook
  const { data: corpus } = useQuery({
    queryKey: ["hadithCorpusBackend"],
    queryFn: fetchCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client side for 15 minutes
  });

  // Safe fallback to placeholder array if data is still downloading
  const displayCollections = corpus?.collections || fallbackCollections;

  return (
    <Layout>
      {/* Streamlined grid matching Chapter layout styling exactly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayCollections.map((col: any, index: number) => (
          <Link key={col.slug} to={`/Hadith/${col.slug}`}>
            <Card className="p-4 transition-all group cursor-pointer">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                {/* Number index identifier */}
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {index + 1}
                </span>
                
                {/* Name of the collection */}
                <p className="font-semibold text-sm truncate group-hover:text-foreground">
                  {col.name}
                </p>
                
                {/* Amount of hadiths */}
                <div className="text-right flex flex-col justify-center">
                  {col.hadithCount > 0 && (
                    <span className="text-sm font-medium text-foreground group-hover:text-foreground">
                      {col.hadithCount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default Collection;