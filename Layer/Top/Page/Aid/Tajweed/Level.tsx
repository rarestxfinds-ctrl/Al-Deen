import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { getTajweedCategoryDetail, getTajweedSubcategory, getTajweedSubfolderSubcategory } from "@/Bottom/API/Aid";
import { Button } from "@/Top/Component/UI/Button";
import { Container } from "@/Top/Component/UI/Container";

export default function TajweedLevel() {
  const { categoryId, level1, level2 } = useParams<{
    categoryId: string;
    level1?: string;
    level2?: string;
  }>();

  const category = getTajweedCategoryDetail(categoryId || "");

  if (!category) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground mb-4">Category not found</p>
        </div>
      </Layout>
    );
  }

  if (!level1) {
    return <div>Invalid URL</div>;
  }

  // Case 1: level2 exists → subcategory inside a subfolder (rules view)
  if (level2) {
    const subfolder = category.subfolders.find(f => f.id === level1);
    const subcategory = subfolder?.subcategories.find(s => s.id === level2);
    if (!subfolder || !subcategory) {
      return (
        <Layout>
          <div className="container py-12 text-center">
            <p className="text-muted-foreground mb-4">Rule not found</p>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4">
          {/* Title/description container removed */}

          <div className="space-y-3">
            {subcategory.rules.map((rule, idx) => (
              <Container key={idx} className="!p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{rule.transliteration}</span>
                    <Container className="!py-1 !px-3 !w-auto">
                      <span className="font-arabic text-2xl" dir="rtl">{rule.letter}</span>
                    </Container>
                  </div>
                  <p className="text-sm text-foreground">{rule.description}</p>
                  {rule.example && (
                    <Container className="!p-3">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Example</p>
                        <p className="font-arabic text-2xl text-foreground" dir="rtl">{rule.example}</p>
                        {rule.exampleTranslation && (
                          <p className="text-sm text-muted-foreground italic">{rule.exampleTranslation}</p>
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

  // Case 2: only level1 → subfolder OR direct subcategory
  const subfolder = category.subfolders.find(f => f.id === level1);
  if (subfolder) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4">
          {/* Subfolder title removed */}

          <div className="space-y-3">
            {subfolder.subcategories.map((sub) => (
              <Link key={sub.id} to={`/Aid/Tajweed/${category.id}/${subfolder.id}/${sub.id}`} className="block">
                <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-semibold">{sub.name}</span>
                      <span className="text-muted-foreground">–</span>
                      <span className="text-sm text-muted-foreground whitespace-normal break-words">
                        {sub.description}
                      </span>
                    </div>
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Direct subcategory (flat category) – rules view
  const subcategory = getTajweedSubcategory(category.id, level1);
  if (!subcategory) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground mb-4">Rule not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4">
        {/* Title/description container removed */}

        <div className="space-y-3">
          {subcategory.rules.map((rule, idx) => (
            <Container key={idx} className="!p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{rule.transliteration}</span>
                  <Container className="!py-1 !px-3 !w-auto">
                    <span className="font-arabic text-2xl" dir="rtl">{rule.letter}</span>
                  </Container>
                </div>
                <p className="text-sm text-foreground">{rule.description}</p>
                {rule.example && (
                  <Container className="!p-3">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Example</p>
                      <p className="font-arabic text-2xl text-foreground" dir="rtl">{rule.example}</p>
                      {rule.exampleTranslation && (
                        <p className="text-sm text-muted-foreground italic">{rule.exampleTranslation}</p>
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