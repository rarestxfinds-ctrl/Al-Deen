import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";

// Client contract mapping out the underlying alphabet collection structures
interface Letter {
  id?: string;
  name: string;
  arabicName: string;
  forms: {
    isolated: string;
    initial: string;
    medial: string;
    final: string;
  };
}

// Fetch function targeting your GitHub Codespaces forwarded address
async function fetchAidCorpusFromBackend() {
  const response = await fetch("https://humble-lamp-v6xj65jprx7xc6pqv-8081.app.github.dev/api/aid-corpus");
  if (!response.ok) throw new Error("Failed to load backend aid corpus data");
  return response.json();
}

const AlphabetDetail = () => {
  const { letterId } = useParams<{ letterId: string }>();

  // Leverage React Query to pull or serve layout structure smoothly out of client cache
  const { data: corpus, isLoading } = useQuery({
    queryKey: ["aidCorpusBackend"],
    queryFn: fetchAidCorpusFromBackend,
    staleTime: 1000 * 60 * 15, // Cache client-side for 15 minutes
  });

  if (isLoading) {
    return (
      <Layout>
        <Container className="w-full !rounded-[48px] p-6 text-center space-y-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-muted rounded w-24 mx-auto mb-4"></div>
            <div className="h-6 bg-muted rounded w-32 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
          </div>
          <div className="border-t border-border pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, idx) => (
              <Container key={idx} className="p-3 animate-pulse">
                <div className="h-3 bg-muted rounded w-12 mx-auto mb-2"></div>
                <div className="h-8 bg-muted rounded w-8 mx-auto"></div>
              </Container>
            ))}
          </div>
        </Container>
      </Layout>
    );
  }

  // Safely extract the precompiled alphabet array slice from the global corpus data payload
  const letters: Letter[] = corpus?.alphabet || corpus?.letters || [];

  // Convert numeric ID (1‑based) or handle alphanumeric identifier filters safely
  const index = letterId ? parseInt(letterId, 10) - 1 : -1;
  
  let letter: Letter | undefined = undefined;
  if (index >= 0 && index < letters.length) {
    letter = letters[index];
  } else if (letterId) {
    // Fallback matching lookup strategy in case ids are mapped as direct key strings instead of implicit order indices
    letter = letters.find((l) => l.id?.toLowerCase() === letterId.toLowerCase() || l.name?.toLowerCase() === letterId.toLowerCase());
  }

  if (!letter) {
    return (
      <Layout>
        <Container className="w-full !rounded-[48px] max-w-md mx-auto p-8 text-center space-y-4">
          <p className="text-muted-foreground">Letter not found</p>
          <Link to="/Aid/Arabic/Alphabet">
            <Button variant="outline" className="font-bold">Back to Alphabet</Button>
          </Link>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="w-full !rounded-[48px] p-6 space-y-6">
        {/* Main letter display */}
        <div className="text-center space-y-3">
          <div className="font-arabic text-7xl md:text-8xl" dir="rtl">
            {letter.forms?.isolated}
          </div>
          <h1 className="text-2xl font-bold">{letter.name}</h1>
          <p className="text-muted-foreground">{letter.arabicName}</p>
        </div>

        {/* Letter forms – without title */}
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <Container className="p-3 text-center">
              <div className="text-sm text-muted-foreground mb-1">Isolated</div>
              <div className="font-arabic text-3xl" dir="rtl">
                {letter.forms?.isolated}
              </div>
            </Container>
            <Container className="p-3 text-center">
              <div className="text-sm text-muted-foreground mb-1">Initial</div>
              <div className="font-arabic text-3xl" dir="rtl">
                {letter.forms?.initial}
              </div>
            </Container>
            <Container className="p-3 text-center">
              <div className="text-sm text-muted-foreground mb-1">Medial</div>
              <div className="font-arabic text-3xl" dir="rtl">
                {letter.forms?.medial}
              </div>
            </Container>
            <Container className="p-3 text-center">
              <div className="text-sm text-muted-foreground mb-1">Final</div>
              <div className="font-arabic text-3xl" dir="rtl">
                {letter.forms?.final}
              </div>
            </Container>
          </div>
        </div>
      </Container>
    </Layout>
  );
};

export default AlphabetDetail;