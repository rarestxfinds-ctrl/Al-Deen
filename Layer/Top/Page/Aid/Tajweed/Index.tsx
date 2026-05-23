import { Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { getTajweedCategories } from "@/Bottom/API/Aid";
import { ChevronRight } from "lucide-react";
import { Container } from "@/Top/Component/UI/Container";

export default function TajweedIndex() {
  const categories = getTajweedCategories();

  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <Link key={cat.id} to={`/Aid/Tajweed/${cat.id}`}>
            <Container className="!p-5 transition-all flex items-center justify-between group">
              <h2 className="font-semibold text-base group-hover:text-primary transition-colors">
                {cat.name}
              </h2>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Container>
          </Link>
        ))}
      </div>
    </Layout>
  );
}