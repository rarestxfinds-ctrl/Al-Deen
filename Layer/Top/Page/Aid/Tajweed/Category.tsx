import { useParams, Link } from "react-router-dom";
import { Layout } from "@/Top/Component/Layout/Index";
import { getTajweedCategoryDetail } from "@/Bottom/API/Aid";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/Top/Component/UI/Button";

export default function TajweedCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = getTajweedCategoryDetail(categoryId || "");

  if (!category) {
    return (
      <Layout>
        <div className="container text-center">
          <p className="text-muted-foreground">Category not found</p>
          <Link to="/Aid/Tajweed">
            <Button className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Tajweed
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {category.hasSubfolders ? (
          <div className="space-y-3">
            {category.subfolders.map((folder) => (
              <Link key={folder.id} to={`/Aid/Tajweed/${category.id}/${folder.id}`} className="block">
                <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{folder.name}</h3>
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {category.subcategories.map((sub) => (
              <Link key={sub.id} to={`/Aid/Tajweed/${category.id}/${sub.id}`} className="block">
                <Button className="!p-5 w-full !justify-start !text-left" fullWidth>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1 flex-wrap">
                      <span className="font-semibold whitespace-nowrap">{sub.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">–</span>
                      <span className="text-sm text-muted-foreground whitespace-normal break-words">
                        {sub.description}
                      </span>
                    </div>
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}