import { Layout } from "Client/Component/Layout/Index";
import { Container } from "Client/Component/UI/Container";
import { getFeelingDetail } from "Server/API/Aid";
import { useParams } from "react-router-dom"; // 1. Import useParams

export default function FeelingDetail() {
  // 2. Grabs the exact state value matching ":feeling" from your route setup
  const { feeling } = useParams<{ feeling: string }>(); 

  // 3. Fetch data dynamically based on the current URL path
  const data = feeling ? getFeelingDetail(feeling) : null;

  if (!data) {
    return (
      <Layout>
        <div className="text-center text-muted-foreground py-8">
          Feeling details not found.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <Container className="!p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            From the Qur'an
          </p>
          <p className="text-base font-medium">“{data.verse}”</p>
          <p className="text-xs text-muted-foreground mt-2">— {data.verseRef}</p>
        </Container>
        
        <Container className="!p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            From the Hadith
          </p>
          <p className="text-base font-medium">“{data.hadith}”</p>
          <p className="text-xs text-muted-foreground mt-2">— {data.hadithRef}</p>
        </Container>
        
        <Container className="!p-5">
          <p className="text-sm">{data.note}</p>
        </Container>
      </div>
    </Layout>
  );
}