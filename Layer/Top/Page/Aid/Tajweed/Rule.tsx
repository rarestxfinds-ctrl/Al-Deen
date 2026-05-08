import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { getTajweedCategoryDetail, getTajweedSubfolderSubcategory, getTajweedSubcategory } from "@/Bottom/API/Aid";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";

export default function TajweedRule() {
  const { categoryId, subfolderId, subcategoryId } = useParams<{
    categoryId: string;
    subfolderId?: string;
    subcategoryId: string;
  }>();

  let category = getTajweedCategoryDetail(categoryId || "");
  let subcategory: any = undefined;

  if (subfolderId) {
    subcategory = getTajweedSubfolderSubcategory(categoryId || "", subfolderId, subcategoryId || "");
  } else {
    subcategory = getTajweedSubcategory(categoryId || "", subcategoryId || "");
  }

  if (!category || !subcategory) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground mb-4">Rule not found</p>
          <Link to="/Aid/Tajweed">
            <Button className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Tajweed
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const backPath = subfolderId
    ? `/Aid/Tajweed/${category.id}/${subfolderId}`
    : `/Aid/Tajweed/${category.id}`;

  return (
    <Layout>
      {/* Removed outer container and py-8 to eliminate extra margin */}
      <div className="max-w-4xl mx-auto px-4">
        {/* Title and description container removed entirely */}

        <div>
          {subcategory.rules.map((rule: any, index: number) => (
            <Container key={index} className="!p-5 mb-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {rule.transliteration}
                  </span>
                  <Container className="!py-1 !px-3 !w-auto">
                    <span className="font-arabic text-2xl" dir="rtl">
                      {rule.letter}
                    </span>
                  </Container>
                </div>
                <p className="text-sm text-foreground">{rule.description}</p>
                {rule.example && (
                  <Container className="!p-3">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Example
                      </p>
                      <p className="font-arabic text-2xl text-foreground" dir="rtl">
                        {rule.example}
                      </p>
                      {rule.exampleTranslation && (
                        <p className="text-sm text-muted-foreground italic">
                          {rule.exampleTranslation}
                        </p>
                      )}
                    </div>
                  </Container>
                )}
              </div>
            </Container>
          ))}
        </div>
      </div>
    </Layout>
  );
}