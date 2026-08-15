import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@Web/Component/Layout/Index";
import { Button } from "@Web/Component/UI/Button";

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

const AlphabetIndex = () => {
  // Gracefully pull and manage your alphabet payload from your React Query cache layer
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 justify-items-center">
          {[...Array(28)].map((_, idx) => (
            <div key={idx} className="w-full aspect-square max-w-[80px]">
              <Button variant="ghost" className="w-full h-full rounded-full p-0 animate-pulse bg-muted opacity-50" disabled />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  // Safely extract the compiled alphabet array slice from the global corpus data
  const letters = corpus?.alphabet || corpus?.letters || [];

  return (
    <Layout>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 justify-items-center">
        {letters.map((letter: any, index: number) => {
          // Keep key tracking secure by falling back to index if letter.id is missing
          const letterKey = letter.id || `letter-${index}`;
          
          return (
            <Link
              key={letterKey}
              to={`/Aid/Arabic/Alphabet/${index + 1}`}
              className="w-full aspect-square max-w-[80px]"
            >
              <Button
                variant="ghost"
                className="w-full h-full rounded-full p-0"
              >
                <span className="font-arabic text-2xl" dir="rtl">
                  {letter.forms?.isolated}
                </span>
              </Button>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
};

export default AlphabetIndex;