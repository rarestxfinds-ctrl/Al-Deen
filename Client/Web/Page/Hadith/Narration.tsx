import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query"; // 🌟 Swapped to standard react-query
import { Layout } from "@Web/Component/Layout/Index";
import { Button } from "@Web/Component/UI/Button";
import NotFound from "../404";

// Fetch utility routing requests to your backend Express server
async function fetchCorpusFromBackend() {
  const response = await fetch("http://localhost:8081/api/hadith-corpus");
  if (!response.ok) throw new Error("Failed to load backend corpus data");
  return response.json();
}

const Narration = () => {
  const { Collection, Chapter } = useParams<{ Collection: string; Chapter: string }>();

  // 🌟 Connect query tool targeting backend api surface
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["hadithCorpusBackend"],
    queryFn: fetchCorpusFromBackend,
    staleTime: 1000 * 60 * 15,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          Loading Hadith numbers...
        </div>
      </Layout>
    );
  }

  const collection = corpus?.collections?.find(
    (c: any) => c.slug.toLowerCase() === Collection?.toLowerCase()
  );
  const chapter = collection?.chapters?.find((ch: any) => ch.id === Chapter);

  if (!collection || !chapter || !chapter.hadiths) {
    return <NotFound />;
  }

  const hadithIds = chapter.hadiths.map((h: any) => h.id);

  return (
    <Layout>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {hadithIds.map((id: string) => (
          <Link key={id} to={`/Hadith/${collection.slug}/${Chapter}/${id}`}>
            <Button
              variant="outline"
              className="w-full h-16 text-lg font-semibold"
            >
              {id}
            </Button>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default Narration;